import { fetchAllPages } from '../functions/governanceActionsFetch';
import {
  getCcVotesByProposalCache,
  putCcVotesByProposalCache,
  type CcVoteForProposal,
} from './ccVotesByProposalCache';
import { proposalCacheKey } from './drepVotingHistoryCache';

export interface BlockfrostProposalVote {
  tx_hash: string;
  cert_index: number;
  voter_role: 'constitutional_committee' | 'drep' | 'spo';
  voter: string;
  vote: 'yes' | 'no' | 'abstain';
}

export interface BlockfrostCommitteeVote {
  tx_hash: string;
  voter_hot_id: string;
  proposal_id: string;
  proposal_tx_hash: string;
  proposal_index: number;
  governance_type: string;
  vote: 'yes' | 'no' | 'abstain';
  metadata_url: string | null;
  metadata_hash: string | null;
  block_height: number;
  block_time: number;
}

export type { CcVoteForProposal } from './ccVotesByProposalCache';

function normalizeHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '').toLowerCase();
}

export function mergeCcVotesForProposal(
  proposalVotes: BlockfrostProposalVote[],
  committeeVotes: BlockfrostCommitteeVote[],
  proposalTxHash: string,
  proposalCertIndex: number
): CcVoteForProposal[] {
  const normalizedProposalTx = normalizeHex(proposalTxHash);
  const ccProposalVotes = proposalVotes.filter((v) => v.voter_role === 'constitutional_committee');

  const committeeByTx = new Map<string, BlockfrostCommitteeVote>();
  for (const row of committeeVotes) {
    if (normalizeHex(row.proposal_tx_hash) !== normalizedProposalTx) continue;
    if (row.proposal_index !== proposalCertIndex) continue;
    committeeByTx.set(normalizeHex(row.tx_hash), row);
  }

  const merged = new Map<string, CcVoteForProposal>();

  for (const row of ccProposalVotes) {
    const txKey = normalizeHex(row.tx_hash);
    const committee = committeeByTx.get(txKey);
    merged.set(txKey, {
      voteTxHash: row.tx_hash,
      voterHotId: committee?.voter_hot_id ?? row.voter,
      vote: row.vote,
      metadataUrl: committee?.metadata_url ?? null,
      metadataHash: committee?.metadata_hash ?? null,
      blockTime: committee?.block_time,
    });
  }

  for (const [txKey, committee] of committeeByTx) {
    if (merged.has(txKey)) continue;
    merged.set(txKey, {
      voteTxHash: committee.tx_hash,
      voterHotId: committee.voter_hot_id,
      vote: committee.vote,
      metadataUrl: committee.metadata_url,
      metadataHash: committee.metadata_hash,
      blockTime: committee.block_time,
    });
  }

  return [...merged.values()].sort((a, b) => {
    const timeDiff = (b.blockTime ?? 0) - (a.blockTime ?? 0);
    if (timeDiff !== 0) return timeDiff;
    return a.voterHotId.localeCompare(b.voterHotId);
  });
}

export async function fetchCcVotesForProposal(params: {
  apiKey: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}): Promise<CcVoteForProposal[]> {
  const { apiKey, proposalTxHash, proposalCertIndex } = params;
  const tx = normalizeHex(proposalTxHash);

  const [proposalVotes, committeeVotes] = await Promise.all([
    fetchAllPages<BlockfrostProposalVote>(
      `/governance/proposals/${tx}/${proposalCertIndex}/votes`,
      apiKey
    ),
    fetchAllPages<BlockfrostCommitteeVote>('/governance/committee/votes', apiKey),
  ]);

  return mergeCcVotesForProposal(
    proposalVotes,
    committeeVotes,
    proposalTxHash,
    proposalCertIndex
  );
}

export type EnsureCcVotesOutcome = 'cached' | 'fetched';

export interface EnsureCcVotesResult {
  outcome: EnsureCcVotesOutcome;
  votes: CcVoteForProposal[];
}

export async function ensureCcVotesForProposalCached(params: {
  apiKey: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}): Promise<EnsureCcVotesResult> {
  const key = proposalCacheKey(params.proposalTxHash, params.proposalCertIndex);
  const cached = await getCcVotesByProposalCache(key);
  if (cached) {
    return { outcome: 'cached', votes: cached.votes };
  }

  const votes = await fetchCcVotesForProposal(params);
  await putCcVotesByProposalCache(key, {
    votes,
    cachedAtSec: Math.floor(Date.now() / 1000),
  });

  return { outcome: 'fetched', votes };
}
