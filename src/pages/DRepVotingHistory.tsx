import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';
import { GovernanceActionMetadataModal } from '../components/GovernanceActionMetadataModal';
import { IpfsLinkModal } from '../components/IpfsLinkModal';
import { DRepVoteSummaryChart } from '../components/DRepVoteSummaryChart';
import {
  DRepVoteMetadataChart,
  type VoteAnchorStatus,
} from '../components/DRepVoteMetadataChart';
import { fetchAllPages } from '../functions/governanceActionsFetch';
import { fetchVoteTxAnchorMap, proposalKey } from '../functions/voteTxAnchors';
import { ReloadingRecacheModal } from '../components/ReloadingRecacheModal';
import {
  clearGovernanceMetadataDocCache,
  countGovernanceMetadataDocCache,
} from '../utils/governanceMetadataDocCache';
import {
  loadAllProposalCache,
  loadDrepVoteCache,
  proposalCacheKey,
  putDrepVoteCacheBatch,
  putProposalCacheBatch,
  type CachedDrepVoteEnrichment,
  type CachedProposalEnrichment,
  type CachedVoteAnchorInfo,
} from '../utils/drepVotingHistoryCache';
import {
  RECACHE_MODAL_TITLE,
  runPhasedRecache,
  type RecacheProgress,
} from '../utils/drepVotingHistoryRecache';
import {
  fetchGovernanceEpochContext,
  fetchProposalExpirationFields,
  isGovernanceActionFinalized,
  type ProposalMetadataAnchorInfo,
  formatGovernanceTimeRemaining,
  governanceTimeStatusTitle,
  resolveGovernanceTimeStatus,
  timeRemainingColor,
  type GovernanceActionTimeStatus,
} from '../utils/governanceExpiration';

interface BlockfrostProposal {
  id: string;
  tx_hash: string;
  cert_index: number;
  governance_type: string;
}

interface BlockfrostDRepVote {
  tx_hash: string;
  cert_index: number;
  proposal_id: string;
  proposal_tx_hash: string;
  proposal_cert_index: number;
  vote: string;
}

export type VoteAnchorInfo = CachedVoteAnchorInfo;

interface MergedProposal {
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
  govActionType: string;
  vote: string | null;
  voteTxHash: string | null;
  voteAnchor: VoteAnchorInfo;
  actionMetadataAnchor: ProposalMetadataAnchorInfo;
  timeStatus: GovernanceActionTimeStatus;
}

interface IpfsModalState {
  url: string;
  hashHex?: string;
  title: string;
}

interface MetadataModalState {
  url: string;
  hashHex?: string;
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}

function voteColor(vote: string | null): string {
  switch (vote) {
    case 'yes': return '#22c55e';
    case 'no': return '#ef4444';
    case 'abstain': return '#eab308';
    default: return '#6b7280';
  }
}

function voteLabel(vote: string | null): string {
  if (!vote) return 'Did Not Vote';
  return vote.charAt(0).toUpperCase() + vote.slice(1);
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

function formatGovActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function initialVoteAnchor(vote: string | null): VoteAnchorInfo {
  if (!vote) return { status: 'none' };
  return { status: 'unknown' };
}

function resolveVoteAnchor(
  vote: string | null,
  voteTxHash: string | null,
  proposalTxHash: string,
  proposalCertIndex: number,
  anchorByProposalKey: Map<string, { hasAnchor: boolean; url?: string; hashHex?: string }>,
  failedTxHashes: Set<string>
): VoteAnchorInfo {
  if (!vote) return { status: 'none' };
  if (!voteTxHash) return { status: 'unknown' };

  const normalizedTx = voteTxHash.trim().toLowerCase();
  if (failedTxHashes.has(normalizedTx)) {
    return { status: 'unknown' };
  }

  const key = proposalKey(proposalTxHash, proposalCertIndex);
  const entry = anchorByProposalKey.get(key);
  if (!entry) {
    return { status: 'unknown' };
  }

  if (entry.hasAnchor) {
    return {
      status: 'present',
      url: entry.url,
      hashHex: entry.hashHex,
    };
  }
  return { status: 'absent' };
}

const DRepVotingHistory = () => {
  const { drepId } = useParams<{ drepId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [drepInput, setDrepInput] = useState(drepId || '');
  const [mergedData, setMergedData] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [anchorCheckFailedCount, setAnchorCheckFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);
  const [ipfsModal, setIpfsModal] = useState<IpfsModalState | null>(null);
  const [metadataModal, setMetadataModal] = useState<MetadataModalState | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [cachedClosedCount, setCachedClosedCount] = useState(0);
  const [cachedMetadataDocCount, setCachedMetadataDocCount] = useState(0);
  const [recaching, setRecaching] = useState(false);
  const [recacheModalOpen, setRecacheModalOpen] = useState(false);
  const [recacheProgress, setRecacheProgress] = useState<RecacheProgress>({
    title: RECACHE_MODAL_TITLE,
    description: '',
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockfrostApiKey = urlParams.get('blockfrostApiKey');
    if (blockfrostApiKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: blockfrostApiKey }));
      setLocalApiKey(blockfrostApiKey);
    }
  }, [dispatch]);

  useEffect(() => {
    if (apiKey) setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (drepId) setDrepInput(drepId);
  }, [drepId]);

  useEffect(() => {
    if (!drepId || !apiKey) return;
    fetchData(drepId, apiKey);
  }, [drepId, apiKey]);

  useEffect(() => {
    if (!drepId) return;
    void countGovernanceMetadataDocCache().then(setCachedMetadataDocCount);
  }, [drepId]);

  useEffect(() => {
    if (!mergedData.some((row) => row.timeStatus.kind === 'countdown')) return;
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [mergedData]);

  const enrichAnchors = async (
    merged: MergedProposal[],
    id: string,
    key: string,
    ctx: import('../utils/governanceExpiration').GovernanceEpochContext
  ) => {
    const rowsNeedingCbor = merged.filter((row) => {
      if (!row.vote || !row.voteTxHash) return false;
      if (!isGovernanceActionFinalized(row.timeStatus)) return true;
      return row.voteAnchor.status === 'unknown';
    });

    const voteTxHashes = [
      ...new Set(rowsNeedingCbor.map((m) => m.voteTxHash).filter((h): h is string => Boolean(h))),
    ];

    if (voteTxHashes.length === 0) {
      setAnchorCheckFailedCount(0);
      return;
    }

    setAnchorLoading(true);
    const nowSec = Math.floor(Date.now() / 1000);
    try {
      const { anchorByProposalKey, failedTxHashes } = await fetchVoteTxAnchorMap(
        key,
        voteTxHashes,
        id
      );
      const failedSet = new Set(failedTxHashes.map((h) => h.toLowerCase()));
      setAnchorCheckFailedCount(failedTxHashes.length);

      const drepVoteWrites = new Map<string, CachedDrepVoteEnrichment>();

      setMergedData((prev) =>
        prev.map((row) => {
          const needsUpdate = rowsNeedingCbor.some(
            (r) =>
              r.proposalTxHash === row.proposalTxHash &&
              r.proposalCertIndex === row.proposalCertIndex
          );
          if (!needsUpdate) return row;

          const voteAnchor = resolveVoteAnchor(
            row.vote,
            row.voteTxHash,
            row.proposalTxHash,
            row.proposalCertIndex,
            anchorByProposalKey,
            failedSet
          );

          if (
            row.vote &&
            row.voteTxHash &&
            isGovernanceActionFinalized(row.timeStatus) &&
            voteAnchor.status !== 'unknown'
          ) {
            const pk = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
            drepVoteWrites.set(pk, {
              vote: row.vote,
              voteTxHash: row.voteTxHash,
              voteAnchor,
              cachedAtSec: nowSec,
            });
          }

          return { ...row, voteAnchor };
        })
      );

      await putDrepVoteCacheBatch(id, drepVoteWrites);
    } catch (err) {
      console.error('Failed to enrich vote anchors', err);
      setMergedData((prev) =>
        prev.map((row) => ({
          ...row,
          voteAnchor: row.vote
            ? { status: 'unknown' as const }
            : { status: 'none' as const },
        }))
      );
    } finally {
      setAnchorLoading(false);
    }
  };

  const fetchData = async (id: string, key: string) => {
    setLoading(true);
    setError(null);
    setMergedData([]);
    setAnchorCheckFailedCount(0);
    setAnchorLoading(false);
    setCachedClosedCount(0);

    try {
      const [proposals, votes, ctx, proposalCache, drepVoteCache] = await Promise.all([
        fetchAllPages<BlockfrostProposal>('/governance/proposals', key),
        fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${id}/votes`, key),
        fetchGovernanceEpochContext(key),
        loadAllProposalCache(),
        loadDrepVoteCache(id),
      ]);

      const needsDetail: BlockfrostProposal[] = [];
      for (const p of proposals) {
        const cacheKey = proposalCacheKey(p.tx_hash, p.cert_index);
        const cached = proposalCache.get(cacheKey);
        if (!cached) {
          needsDetail.push(p);
          continue;
        }
        const status = resolveGovernanceTimeStatus(cached.expiration, ctx);
        if (!isGovernanceActionFinalized(status)) {
          needsDetail.push(p);
        }
      }

      const fetched =
        needsDetail.length > 0
          ? await fetchProposalExpirationFields(
              key,
              needsDetail.map((p) => ({
                tx_hash: p.tx_hash,
                cert_index: p.cert_index,
                id: p.id,
              }))
            )
          : {
              expirationByKey: new Map<string, import('../utils/governanceExpiration').BlockfrostProposalExpirationFields>(),
              metadataAnchorByKey: new Map<string, ProposalMetadataAnchorInfo>(),
            };

      const expirationByKey = new Map(fetched.expirationByKey);
      const metadataAnchorByKey = new Map(fetched.metadataAnchorByKey);
      for (const [cacheKey, cached] of proposalCache) {
        if (!expirationByKey.has(cacheKey)) {
          expirationByKey.set(cacheKey, cached.expiration);
        }
        if (!metadataAnchorByKey.has(cacheKey)) {
          metadataAnchorByKey.set(cacheKey, cached.metadataAnchor);
        }
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const proposalCacheWrites = new Map<string, CachedProposalEnrichment>();

      const voteMap = new Map<string, BlockfrostDRepVote>();
      for (const v of votes) {
        voteMap.set(proposalCacheKey(v.proposal_tx_hash, v.proposal_cert_index), v);
      }

      let closedFromCache = 0;

      const merged: MergedProposal[] = proposals.map((p) => {
        const proposalKeyStr = proposalCacheKey(p.tx_hash, p.cert_index);
        const vote = voteMap.get(proposalKeyStr);
        const expirationFields = expirationByKey.get(proposalKeyStr);
        const timeStatus = expirationFields
          ? resolveGovernanceTimeStatus(expirationFields, ctx, nowSec)
          : { kind: 'unknown' as const };
        const voteValue = vote?.vote ?? null;
        const voteTxHash = vote?.tx_hash ?? null;
        const finalized = isGovernanceActionFinalized(timeStatus);

        const fetchedFields = fetched.expirationByKey.has(proposalKeyStr);
        if (finalized && fetchedFields && expirationFields) {
          const meta = metadataAnchorByKey.get(proposalKeyStr);
          if (meta) {
            proposalCacheWrites.set(proposalKeyStr, {
              expiration: expirationFields,
              metadataAnchor: meta,
              cachedAtSec: nowSec,
            });
          }
        }

        let voteAnchor: VoteAnchorInfo = initialVoteAnchor(voteValue);
        const cachedVote = drepVoteCache.get(proposalKeyStr);
        const proposalCached = proposalCache.has(proposalKeyStr);

        if (finalized && proposalCached) {
          const voteFullyCached =
            !voteValue ||
            (cachedVote &&
              cachedVote.vote === voteValue &&
              cachedVote.voteTxHash === voteTxHash &&
              cachedVote.voteAnchor.status !== 'unknown');
          if (voteFullyCached) closedFromCache += 1;
        }

        if (
          finalized &&
          voteValue &&
          voteTxHash &&
          cachedVote &&
          cachedVote.vote === voteValue &&
          cachedVote.voteTxHash === voteTxHash &&
          cachedVote.voteAnchor.status !== 'unknown'
        ) {
          voteAnchor = cachedVote.voteAnchor;
        }

        return {
          proposalId: p.id,
          proposalTxHash: p.tx_hash,
          proposalCertIndex: p.cert_index,
          govActionType: p.governance_type,
          vote: voteValue,
          voteTxHash,
          voteAnchor,
          actionMetadataAnchor: metadataAnchorByKey.get(proposalKeyStr) ?? { status: 'unknown' },
          timeStatus,
        };
      });

      await putProposalCacheBatch(proposalCacheWrites);

      setNowSec(nowSec);
      setMergedData(merged);
      setCachedClosedCount(closedFromCache);
      setLoading(false);

      void enrichAnchors(merged, id, key, ctx);
    } catch (err) {
      console.error('Failed to fetch DRep voting history', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  const handleForceRecache = async () => {
    if (!drepId || !apiKey || recaching) return;

    setRecaching(true);
    setRecacheModalOpen(true);
    setRecacheProgress({ title: RECACHE_MODAL_TITLE, description: 'Loading governance actions…' });

    try {
      const [proposals, votes, ctx, proposalCache] = await Promise.all([
        fetchAllPages<BlockfrostProposal>('/governance/proposals', apiKey),
        fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${drepId}/votes`, apiKey),
        fetchGovernanceEpochContext(apiKey),
        loadAllProposalCache(),
      ]);

      const nowSec = Math.floor(Date.now() / 1000);
      const finalizedProposals: { tx_hash: string; cert_index: number; id?: string }[] = [];

      for (const p of proposals) {
        const key = proposalCacheKey(p.tx_hash, p.cert_index);
        const cached = proposalCache.get(key);
        if (!cached) continue;
        const status = resolveGovernanceTimeStatus(cached.expiration, ctx, nowSec);
        if (isGovernanceActionFinalized(status)) {
          finalizedProposals.push({
            tx_hash: p.tx_hash,
            cert_index: p.cert_index,
            id: p.id,
          });
        }
      }

      if (mergedData.length > 0) {
        const seen = new Set(finalizedProposals.map((p) => proposalCacheKey(p.tx_hash, p.cert_index)));
        for (const row of mergedData) {
          if (!isGovernanceActionFinalized(row.timeStatus)) continue;
          const key = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
          if (seen.has(key)) continue;
          seen.add(key);
          finalizedProposals.push({
            tx_hash: row.proposalTxHash,
            cert_index: row.proposalCertIndex,
            id: row.proposalId,
          });
        }
      }

      const recacheVotes = votes
        .filter((v) => {
          const key = proposalCacheKey(v.proposal_tx_hash, v.proposal_cert_index);
          return finalizedProposals.some(
            (p) => proposalCacheKey(p.tx_hash, p.cert_index) === key
          );
        })
        .map((v) => ({
          proposalTxHash: v.proposal_tx_hash,
          proposalCertIndex: v.proposal_cert_index,
          vote: v.vote,
          voteTxHash: v.tx_hash,
        }));

      if (finalizedProposals.length === 0) {
        setRecacheProgress({
          title: RECACHE_MODAL_TITLE,
          description: 'No closed governance actions in cache yet. Load history first.',
        });
        await new Promise((r) => window.setTimeout(r, 2500));
        return;
      }

      await runPhasedRecache({
        apiKey,
        drepId,
        ctx,
        proposals: finalizedProposals,
        votes: recacheVotes,
        onProgress: setRecacheProgress,
      });

      setRecacheProgress({ title: RECACHE_MODAL_TITLE, description: 'Refreshing table…' });
      await fetchData(drepId, apiKey);
    } catch (err) {
      console.error('Force recache failed', err);
      setError(err instanceof Error ? err.message : 'Recache failed');
    } finally {
      setRecaching(false);
      setRecacheModalOpen(false);
    }
  };

  const refreshMetadataDocCount = () => {
    void countGovernanceMetadataDocCache().then(setCachedMetadataDocCount);
  };

  const handleClearMetadataDocCache = async () => {
    await clearGovernanceMetadataDocCache();
    setCachedMetadataDocCount(0);
  };

  const handleApplyKey = () => {
    if (!localApiKey.trim()) return;
    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: localApiKey.trim() }));
    const url = new URL(window.location.href);
    url.searchParams.set('blockfrostApiKey', localApiKey.trim());
    window.history.replaceState({}, '', url.toString());
  };

  const handleLookup = () => {
    if (!drepInput.trim()) return;
    navigate(`/drephistory/${encodeURIComponent(drepInput.trim())}`);
  };

  const copyGovActionId = (id: string) => {
    void navigator.clipboard.writeText(id).then(() => {
      setCopiedProposalId(id);
      window.setTimeout(() => {
        setCopiedProposalId((cur) => (cur === id ? null : cur));
      }, 2000);
    });
  };

  const votedCount = mergedData.filter((m) => m.vote !== null).length;
  const missedCount = mergedData.filter((m) => m.vote === null).length;

  const withAnchorCount = useMemo(
    () => mergedData.filter((m) => m.voteAnchor.status === 'present').length,
    [mergedData]
  );

  const anchorPct =
    votedCount > 0 && !anchorLoading
      ? Math.round((withAnchorCount / votedCount) * 100)
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div className="main-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
          <h1>DRep Voting History</h1>

          {!apiKey && (
            <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                A Blockfrost API key is required to look up voting history. Get one from{' '}
                <a href="https://blockfrost.io" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>
                  blockfrost.io
                </a>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter your Blockfrost API key"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyKey()}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <Button onClick={handleApplyKey}>Set Key</Button>
              </div>
            </div>
          )}

          <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              DRep ID
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="drep1..."
                value={drepInput}
                onChange={(e) => setDrepInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <Button onClick={handleLookup} disabled={!drepInput.trim() || !apiKey}>
                Lookup
              </Button>
            </div>
          </div>

          {drepId && (
            <div style={{ width: '100%' }}>
              <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block', marginBottom: '0.5rem' }}>
                {drepId}
              </code>
            </div>
          )}

          {loading && <p>Loading voting history...</p>}

          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00', width: '100%' }}>
              Error: {error}
            </div>
          )}

          {!loading && !error && mergedData.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Total proposals: <strong>{mergedData.length}</strong></span>
                    <span style={{ color: '#22c55e' }}>Voted: <strong>{votedCount}</strong></span>
                    <span style={{ color: '#6b7280' }}>Did not vote: <strong>{missedCount}</strong></span>
                    {cachedClosedCount > 0 && (
                      <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                        Cached <strong>{cachedClosedCount}</strong> closed actions
                      </span>
                    )}
                    <Button
                      onClick={() => void handleForceRecache()}
                      disabled={loading || anchorLoading || recaching}
                    >
                      Reload closed actions
                    </Button>
                    <Button
                      onClick={() => void handleClearMetadataDocCache()}
                      disabled={cachedMetadataDocCount === 0 || loading || recaching}
                    >
                      Clear {cachedMetadataDocCount} cached governance metadata documents
                    </Button>
                  </div>
                  {votedCount > 0 && (
                    <span style={{ fontSize: '0.9rem', color: '#14b8a6' }}>
                      {anchorLoading ? (
                        'Checking CIP-100 vote anchors…'
                      ) : anchorPct !== null ? (
                        <>
                          <strong>{withAnchorCount}</strong> of <strong>{votedCount}</strong> voted actions
                          include a CIP-100 anchor ({anchorPct}%)
                        </>
                      ) : null}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <DRepVoteSummaryChart
                    rows={mergedData.map((row) => ({
                      vote: row.vote,
                      timeStatus: row.timeStatus,
                    }))}
                  />
                  <DRepVoteMetadataChart
                    rows={mergedData.map((row) => ({
                      vote: row.vote,
                      anchorStatus: row.voteAnchor.status,
                      timeStatus: row.timeStatus,
                    }))}
                    anchorCheckFailedCount={anchorCheckFailedCount}
                    loading={anchorLoading}
                  />
                </div>
              </div>

              <div className="overflow-x-auto" style={{ width: '100%' }}>
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a1103]">
                      <th className="px-2 py-2 border-b w-0 whitespace-nowrap" title="View governance metadata">Details</th>
                      <th className="px-4 py-2 border-b">Governance Action</th>
                      <th className="px-4 py-2 border-b w-0 whitespace-nowrap">Copy ID</th>
                      <th className="px-4 py-2 border-b">Action Type</th>
                      <th className="px-4 py-2 border-b">Action metadata</th>
                      <th className="px-4 py-2 border-b">Time left</th>
                      <th className="px-4 py-2 border-b">Vote</th>
                      <th className="px-4 py-2 border-b">Rationale</th>
                      <th className="px-4 py-2 border-b">Vote Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.map((row) => (
                      <tr key={`${row.proposalTxHash}#${row.proposalCertIndex}`} className="odd:bg-[#33240b] even:bg-[#1a1103]">
                        <td className="px-2 py-2 border-b w-0 whitespace-nowrap align-middle text-xs">
                          {row.actionMetadataAnchor.status === 'present' && row.actionMetadataAnchor.url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setMetadataModal({
                                  url: row.actionMetadataAnchor.url!,
                                  hashHex: row.actionMetadataAnchor.hashHex,
                                  proposalId: row.proposalId,
                                  proposalTxHash: row.proposalTxHash,
                                  proposalCertIndex: row.proposalCertIndex,
                                })
                              }
                              className="btn text-xs py-1 px-2"
                              title="View governance metadata"
                            >
                              View
                            </button>
                          ) : row.actionMetadataAnchor.status === 'absent' ? (
                            <span style={{ color: '#6b7280' }}>—</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>?</span>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b font-mono text-xs">
                          <a
                            href={`https://cardanoscan.io/govAction/${row.proposalId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0066cc', textDecoration: 'underline' }}
                          >
                            {truncateHash(row.proposalId)}
                          </a>
                        </td>
                        <td className="px-2 py-2 border-b w-0 whitespace-nowrap align-middle">
                          <button
                            type="button"
                            onClick={() => copyGovActionId(row.proposalId)}
                            className="btn text-xs py-1 px-2"
                            title="Copy governance action ID"
                          >
                            {copiedProposalId === row.proposalId ? 'Copied' : 'Copy'}
                          </button>
                        </td>
                        <td className="px-4 py-2 border-b">
                          {formatGovActionType(row.govActionType)}
                        </td>
                        <td className="px-4 py-2 border-b text-xs">
                          {row.actionMetadataAnchor.status === 'present' && row.actionMetadataAnchor.url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setIpfsModal({
                                  url: row.actionMetadataAnchor.url!,
                                  hashHex: row.actionMetadataAnchor.hashHex,
                                  title: 'Open governance action metadata',
                                })
                              }
                              style={{
                                color: '#7dd3fc',
                                textDecoration: 'underline',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontSize: 'inherit',
                                fontWeight: 500,
                              }}
                            >
                              Metadata
                            </button>
                          ) : row.actionMetadataAnchor.status === 'absent' ? (
                            <span style={{ color: '#6b7280' }}>—</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>?</span>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b whitespace-nowrap" title={governanceTimeStatusTitle(row.timeStatus)}>
                          <span style={{
                            color: timeRemainingColor(row.timeStatus, nowSec),
                            fontWeight: row.timeStatus.kind === 'countdown' ? 'bold' : 'normal',
                          }}>
                            {formatGovernanceTimeRemaining(row.timeStatus, nowSec)}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-b">
                          <span style={{
                            color: voteColor(row.vote),
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: `${voteColor(row.vote)}20`,
                          }}>
                            {voteLabel(row.vote)}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-b text-xs">
                          {!row.vote ? (
                            <span style={{ color: '#6b7280' }}>—</span>
                          ) : anchorLoading ? (
                            <span style={{ color: '#9ca3af' }}>…</span>
                          ) : row.voteAnchor.status === 'present' && row.voteAnchor.url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setIpfsModal({
                                  url: row.voteAnchor.url!,
                                  hashHex: row.voteAnchor.hashHex,
                                  title: 'Open vote rationale',
                                })
                              }
                              style={{
                                color: '#7dd3fc',
                                textDecoration: 'underline',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontSize: 'inherit',
                                fontWeight: 500,
                              }}
                            >
                              Rationale
                            </button>
                          ) : row.voteAnchor.status === 'absent' ? (
                            <span style={{ color: '#6b7280' }}>—</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>?</span>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b font-mono text-xs">
                          {row.voteTxHash ? (
                            <a
                              href={`https://cardanoscan.io/vote/${row.voteTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#0066cc', textDecoration: 'underline' }}
                            >
                              {truncateHash(row.voteTxHash)}
                            </a>
                          ) : (
                            <span style={{ color: '#6b7280' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <ReloadingRecacheModal
            open={recacheModalOpen}
            title={recacheProgress.title}
            description={recacheProgress.description}
          />

          <GovernanceActionMetadataModal
            open={metadataModal !== null}
            cacheKey={
              metadataModal
                ? proposalCacheKey(metadataModal.proposalTxHash, metadataModal.proposalCertIndex)
                : ''
            }
            anchorUrl={metadataModal?.url ?? ''}
            hashHex={metadataModal?.hashHex}
            proposalLabel={metadataModal ? truncateHash(metadataModal.proposalId) : ''}
            onClose={() => setMetadataModal(null)}
            onCacheUpdated={refreshMetadataDocCount}
          />

          <IpfsLinkModal
            open={ipfsModal !== null}
            url={ipfsModal?.url ?? ''}
            hashHex={ipfsModal?.hashHex}
            title={ipfsModal?.title}
            onClose={() => setIpfsModal(null)}
          />

          {!loading && !error && drepId && apiKey && mergedData.length === 0 && (
            <p>No governance proposals found.</p>
          )}

          <div style={{ width: '100%', marginTop: '2rem', textAlign: 'center' }}>
            <a
              href="https://projects.williamdoyle.ca"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc', textDecoration: 'underline' }}
            >
              Other work projects
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DRepVotingHistory;
