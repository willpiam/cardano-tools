import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';
import { IpfsLinkModal } from '../components/IpfsLinkModal';
import { DRepVoteSummaryChart } from '../components/DRepVoteSummaryChart';
import {
  DRepVoteMetadataChart,
  type VoteAnchorStatus,
} from '../components/DRepVoteMetadataChart';
import { fetchAllPages } from '../functions/governanceActionsFetch';
import { fetchVoteTxAnchorMap, proposalKey } from '../functions/voteTxAnchors';
import {
  fetchGovernanceEpochContext,
  fetchProposalExpirationFields,
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

export interface VoteAnchorInfo {
  status: VoteAnchorStatus;
  url?: string;
  hashHex?: string;
}

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
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

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
    if (!mergedData.some((row) => row.timeStatus.kind === 'countdown')) return;
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [mergedData]);

  const enrichAnchors = async (merged: MergedProposal[], id: string, key: string) => {
    const voteTxHashes = merged
      .map((m) => m.voteTxHash)
      .filter((h): h is string => Boolean(h));

    if (voteTxHashes.length === 0) {
      setAnchorCheckFailedCount(0);
      return;
    }

    setAnchorLoading(true);
    try {
      const { anchorByProposalKey, failedTxHashes } = await fetchVoteTxAnchorMap(
        key,
        voteTxHashes,
        id
      );
      const failedSet = new Set(failedTxHashes.map((h) => h.toLowerCase()));
      setAnchorCheckFailedCount(failedTxHashes.length);

      setMergedData((prev) =>
        prev.map((row) => ({
          ...row,
          voteAnchor: resolveVoteAnchor(
            row.vote,
            row.voteTxHash,
            row.proposalTxHash,
            row.proposalCertIndex,
            anchorByProposalKey,
            failedSet
          ),
        }))
      );
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

    try {
      const [proposals, votes, ctx] = await Promise.all([
        fetchAllPages<BlockfrostProposal>('/governance/proposals', key),
        fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${id}/votes`, key),
        fetchGovernanceEpochContext(key),
      ]);

      const { expirationByKey, metadataAnchorByKey } = await fetchProposalExpirationFields(
        key,
        proposals.map((p) => ({ tx_hash: p.tx_hash, cert_index: p.cert_index, id: p.id }))
      );

      const voteMap = new Map<string, BlockfrostDRepVote>();
      for (const v of votes) {
        const voteKey = `${v.proposal_tx_hash}#${v.proposal_cert_index}`;
        voteMap.set(voteKey, v);
      }

      const merged: MergedProposal[] = proposals.map((p) => {
        const proposalKeyStr = `${p.tx_hash}#${p.cert_index}`;
        const vote = voteMap.get(proposalKeyStr);
        const expirationFields = expirationByKey.get(proposalKeyStr);
        const timeStatus = expirationFields
          ? resolveGovernanceTimeStatus(expirationFields, ctx)
          : { kind: 'unknown' as const };
        const voteValue = vote?.vote ?? null;

        return {
          proposalId: p.id,
          proposalTxHash: p.tx_hash,
          proposalCertIndex: p.cert_index,
          govActionType: p.governance_type,
          vote: voteValue,
          voteTxHash: vote?.tx_hash ?? null,
          voteAnchor: initialVoteAnchor(voteValue),
          actionMetadataAnchor: metadataAnchorByKey.get(proposalKeyStr) ?? { status: 'unknown' },
          timeStatus,
        };
      });

      setNowSec(Math.floor(Date.now() / 1000));
      setMergedData(merged);
      setLoading(false);

      void enrichAnchors(merged, id, key);
    } catch (err) {
      console.error('Failed to fetch DRep voting history', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
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
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span>Total proposals: <strong>{mergedData.length}</strong></span>
                    <span style={{ color: '#22c55e' }}>Voted: <strong>{votedCount}</strong></span>
                    <span style={{ color: '#6b7280' }}>Did not vote: <strong>{missedCount}</strong></span>
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
