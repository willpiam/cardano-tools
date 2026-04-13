import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

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

interface MergedProposal {
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
  govActionType: string;
  vote: string | null;
  voteTxHash: string | null;
}

async function fetchAllPages<T>(endpoint: string, apiKey: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${BLOCKFROST_BASE}${endpoint}?page=${page}&count=100&order=desc`, {
      headers: { project_id: apiKey }
    });
    if (res.status === 404) break;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Blockfrost ${res.status}: ${body}`);
    }
    const data: T[] = await res.json();
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
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

const DRepVotingHistory = () => {
  const { drepId } = useParams<{ drepId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [drepInput, setDrepInput] = useState(drepId || '');
  const [mergedData, setMergedData] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchData = async (id: string, key: string) => {
    setLoading(true);
    setError(null);
    setMergedData([]);

    try {
      const [proposals, votes] = await Promise.all([
        fetchAllPages<BlockfrostProposal>('/governance/proposals', key),
        fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${id}/votes`, key),
      ]);

      const voteMap = new Map<string, BlockfrostDRepVote>();
      for (const v of votes) {
        const voteKey = `${v.proposal_tx_hash}#${v.proposal_cert_index}`;
        voteMap.set(voteKey, v);
      }

      const merged: MergedProposal[] = proposals.map((p) => {
        const key = `${p.tx_hash}#${p.cert_index}`;
        const vote = voteMap.get(key);
        return {
          proposalId: p.id,
          proposalTxHash: p.tx_hash,
          proposalCertIndex: p.cert_index,
          govActionType: p.governance_type,
          vote: vote?.vote ?? null,
          voteTxHash: vote?.tx_hash ?? null,
        };
      });

      setMergedData(merged);
    } catch (err) {
      console.error('Failed to fetch DRep voting history', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
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
    navigate(`/drep/${encodeURIComponent(drepInput.trim())}`);
  };

  const votedCount = mergedData.filter(m => m.vote !== null).length;
  const missedCount = mergedData.filter(m => m.vote === null).length;

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
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <span>Total proposals: <strong>{mergedData.length}</strong></span>
                <span style={{ color: '#22c55e' }}>Voted: <strong>{votedCount}</strong></span>
                <span style={{ color: '#6b7280' }}>Did not vote: <strong>{missedCount}</strong></span>
              </div>

              <div className="overflow-x-auto" style={{ width: '100%' }}>
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a1103]">
                      <th className="px-4 py-2 border-b">Governance Action</th>
                      <th className="px-4 py-2 border-b">Action Type</th>
                      <th className="px-4 py-2 border-b">Vote</th>
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
                        <td className="px-4 py-2 border-b">
                          {formatGovActionType(row.govActionType)}
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

          {!loading && !error && drepId && apiKey && mergedData.length === 0 && (
            <p>No governance proposals found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DRepVotingHistory;
