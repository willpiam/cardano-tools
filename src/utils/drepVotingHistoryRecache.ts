import { fetchVoteTxAnchorMap } from '../functions/voteTxAnchors';
import {
  fetchSingleProposalEnrichment,
  isGovernanceActionFinalized,
  resolveGovernanceTimeStatus,
  type GovernanceEpochContext,
} from './governanceExpiration';
import {
  proposalCacheKey,
  putDrepVoteCacheBatch,
  putProposalCacheBatch,
  type CachedDrepVoteEnrichment,
  type CachedProposalEnrichment,
  type CachedVoteAnchorInfo,
} from './drepVotingHistoryCache';
import { mapWithConcurrency } from '../functions/governanceActionsFetch';
import {
  BATCH_COOLDOWN_MS,
  cooldownSec,
  formatBatchCooldownDescription,
  formatProposalBatchDescription,
  formatVoteCborBatchDescription,
  IN_BATCH_CONCURRENCY,
  PROPOSAL_BATCH_SIZE,
  RECACHE_MODAL_TITLE,
  splitIntoBatches,
  VOTE_TX_BATCH_SIZE,
} from './drepVotingHistoryRecacheHelpers';

export {
  BATCH_COOLDOWN_MS,
  PROPOSAL_BATCH_SIZE,
  RECACHE_MODAL_TITLE,
  splitIntoBatches,
  formatBatchCooldownDescription,
  formatProposalBatchDescription,
  formatVoteCborBatchDescription,
} from './drepVotingHistoryRecacheHelpers';

export interface RecacheProgress {
  title: string;
  description: string;
}

export interface RecacheProposalInput {
  tx_hash: string;
  cert_index: number;
  id?: string;
}

export interface RecacheVoteInput {
  proposalTxHash: string;
  proposalCertIndex: number;
  vote: string;
  voteTxHash: string;
}

export interface RunPhasedRecacheParams {
  apiKey: string;
  drepId: string;
  ctx: GovernanceEpochContext;
  proposals: RecacheProposalInput[];
  votes: RecacheVoteInput[];
  onProgress: (progress: RecacheProgress) => void;
  signal?: AbortSignal;
}

export interface RecacheResult {
  proposalFailures: number;
  voteTxFailures: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function resolveVoteAnchorFromMap(
  vote: string,
  voteTxHash: string,
  proposalTxHash: string,
  proposalCertIndex: number,
  anchorByProposalKey: Map<string, { hasAnchor: boolean; url?: string; hashHex?: string }>,
  failedTxHashes: Set<string>
): CachedVoteAnchorInfo {
  if (!vote) return { status: 'none' };
  if (!voteTxHash) return { status: 'unknown' };
  const normalizedTx = voteTxHash.trim().toLowerCase();
  if (failedTxHashes.has(normalizedTx)) return { status: 'unknown' };

  const key = proposalCacheKey(proposalTxHash, proposalCertIndex);
  const entry = anchorByProposalKey.get(key);
  if (!entry) return { status: 'unknown' };
  if (entry.hasAnchor) {
    return { status: 'present', url: entry.url, hashHex: entry.hashHex };
  }
  return { status: 'absent' };
}

/**
 * Phased reload of all finalized governance actions: proposal detail/metadata, then vote CBOR.
 */
export async function runPhasedRecache(params: RunPhasedRecacheParams): Promise<RecacheResult> {
  const { apiKey, drepId, ctx, proposals, votes, onProgress, signal } = params;
  const nowSec = Math.floor(Date.now() / 1000);
  let proposalFailures = 0;
  let voteTxFailures = 0;

  const proposalBatches = splitIntoBatches(proposals, PROPOSAL_BATCH_SIZE);
  const proposalBatchTotal = Math.max(1, proposalBatches.length);

  const proposalCacheWrites = new Map<string, CachedProposalEnrichment>();
  const expirationByKey = new Map<string, import('./governanceExpiration').BlockfrostProposalExpirationFields>();

  for (let i = 0; i < proposalBatches.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const batch = proposalBatches[i];
    const batchNum = proposalBatches.length === 0 ? 0 : i + 1;

    onProgress({
      title: RECACHE_MODAL_TITLE,
      description: formatProposalBatchDescription(batchNum, proposalBatchTotal),
    });

    const results = await mapWithConcurrency(batch, IN_BATCH_CONCURRENCY, (proposal) =>
      fetchSingleProposalEnrichment(apiKey, proposal)
    );

    for (const { key, fields, metadataAnchor } of results) {
      if (!fields || !metadataAnchor) {
        proposalFailures += 1;
        continue;
      }
      expirationByKey.set(key, fields);
      const timeStatus = resolveGovernanceTimeStatus(fields, ctx, nowSec);
      if (!isGovernanceActionFinalized(timeStatus)) continue;

      proposalCacheWrites.set(key, {
        expiration: fields,
        metadataAnchor,
        cachedAtSec: nowSec,
      });
    }

    if (i < proposalBatches.length - 1) {
      onProgress({
        title: RECACHE_MODAL_TITLE,
        description: formatBatchCooldownDescription(cooldownSec(), batchNum, batchNum + 1),
      });
      await sleep(BATCH_COOLDOWN_MS, signal);
    }
  }

  await putProposalCacheBatch(proposalCacheWrites);

  const finalizedKeys = new Set<string>();
  for (const [key, fields] of expirationByKey) {
    if (isGovernanceActionFinalized(resolveGovernanceTimeStatus(fields, ctx, nowSec))) {
      finalizedKeys.add(key);
    }
  }
  for (const [key, entry] of proposalCacheWrites) {
    if (isGovernanceActionFinalized(resolveGovernanceTimeStatus(entry.expiration, ctx, nowSec))) {
      finalizedKeys.add(key);
    }
  }

  const finalizedVotes = votes.filter((v) =>
    finalizedKeys.has(proposalCacheKey(v.proposalTxHash, v.proposalCertIndex))
  );
  const uniqueTxHashes = [
    ...new Set(finalizedVotes.map((v) => v.voteTxHash.trim().toLowerCase()).filter(Boolean)),
  ];

  const voteBatches = splitIntoBatches(uniqueTxHashes, VOTE_TX_BATCH_SIZE);
  const voteBatchTotal = Math.max(1, voteBatches.length);
  const anchorByProposalKey = new Map<string, { hasAnchor: boolean; url?: string; hashHex?: string }>();
  const failedTxHashes = new Set<string>();

  for (let i = 0; i < voteBatches.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const batch = voteBatches[i];
    const batchNum = voteBatches.length === 0 ? 0 : i + 1;

    onProgress({
      title: RECACHE_MODAL_TITLE,
      description: formatVoteCborBatchDescription(batchNum, voteBatchTotal),
    });

    const { anchorByProposalKey: batchAnchors, failedTxHashes: batchFailed } =
      await fetchVoteTxAnchorMap(apiKey, batch, drepId);

    for (const [k, v] of batchAnchors) anchorByProposalKey.set(k, v);
    for (const h of batchFailed) failedTxHashes.add(h.toLowerCase());
    voteTxFailures += batchFailed.length;

    if (i < voteBatches.length - 1) {
      onProgress({
        title: RECACHE_MODAL_TITLE,
        description: formatBatchCooldownDescription(cooldownSec(), batchNum, batchNum + 1),
      });
      await sleep(BATCH_COOLDOWN_MS, signal);
    }
  }

  const drepVoteWrites = new Map<string, CachedDrepVoteEnrichment>();
  for (const v of finalizedVotes) {
    const key = proposalCacheKey(v.proposalTxHash, v.proposalCertIndex);
    const voteAnchor = resolveVoteAnchorFromMap(
      v.vote,
      v.voteTxHash,
      v.proposalTxHash,
      v.proposalCertIndex,
      anchorByProposalKey,
      failedTxHashes
    );
    if (voteAnchor.status === 'unknown') continue;

    drepVoteWrites.set(key, {
      vote: v.vote,
      voteTxHash: v.voteTxHash,
      voteAnchor,
      cachedAtSec: nowSec,
    });
  }

  await putDrepVoteCacheBatch(drepId, drepVoteWrites);

  return { proposalFailures, voteTxFailures };
}
