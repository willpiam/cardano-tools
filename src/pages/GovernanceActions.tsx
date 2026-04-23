import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';
const GOVERNANCE_TYPES = [
  'hard_fork_initiation',
  'info_action',
  'new_committee',
  'new_constitution',
  'no_confidence',
  'parameter_change',
  'treasury_withdrawals',
] as const;

type GovernanceType = typeof GOVERNANCE_TYPES[number];
type SortOption = 'none' | 'amount_asc' | 'amount_desc';

interface BlockfrostProposal {
  id: string;
  tx_hash: string;
  cert_index: number;
  governance_type: GovernanceType;
}

interface BlockfrostProposalDetail {
  tx_hash: string;
  cert_index: number;
  governance_type: GovernanceType;
  dropped_epoch: number | null;
  expired_epoch: number | null;
  ratified_epoch: number | null;
  enacted_epoch: number | null;
  governance_description?: unknown;
}

interface LiveGovernanceAction {
  id: string;
  txHash: string;
  certIndex: number;
  governanceType: GovernanceType;
  droppedEpoch: number | null;
  expiredEpoch: number | null;
  ratifiedEpoch: number | null;
  enactedEpoch: number | null;
  treasuryWithdrawalTotalLovelace: number | null;
  title: string | null;
  summary: string;
  detailJson: string | null;
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

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const current = next++;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

function formatGovActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      return parseNumericValue(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

function summarizeWithdrawals(rawWithdrawals: unknown): { totalLovelace: number; recipientCount: number } {
  if (!rawWithdrawals) return { totalLovelace: 0, recipientCount: 0 };

  // Handles [{coin}], [[address, amount]], and deeply nested variants.
  if (Array.isArray(rawWithdrawals)) {
    let total = 0;
    let recipients = 0;
    for (const entry of rawWithdrawals) {
      if (Array.isArray(entry) && entry.length > 1) {
        const amount = parseNumericValue(entry[1]);
        if (amount !== null) {
          total += amount;
          recipients += 1;
          continue;
        }
      }

      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        const directAmount =
          parseNumericValue(obj.coin) ??
          parseNumericValue(obj.amount) ??
          parseNumericValue(obj.lovelace) ??
          parseNumericValue(obj.value);

        if (directAmount !== null) {
          total += directAmount;
          recipients += 1;
          continue;
        }
      }
    }
    return { totalLovelace: total, recipientCount: recipients };
  }

  // Handles map-shaped forms: { "<reward_address>": "<lovelace>" }.
  if (rawWithdrawals && typeof rawWithdrawals === 'object') {
    const entries = Object.entries(rawWithdrawals as Record<string, unknown>);
    let total = 0;
    let recipients = 0;
    for (const [, value] of entries) {
      const amount = parseNumericValue(value);
      if (amount !== null) {
        total += amount;
        recipients += 1;
      }
    }
    return { totalLovelace: total, recipientCount: recipients };
  }

  return { totalLovelace: 0, recipientCount: 0 };
}

function typeColor(type: GovernanceType): { bg: string; fg: string } {
  switch (type) {
    case 'treasury_withdrawals':
      return { bg: '#022c22', fg: '#34d399' };
    case 'parameter_change':
      return { bg: '#1e1b4b', fg: '#a5b4fc' };
    case 'hard_fork_initiation':
      return { bg: '#3f1d2e', fg: '#f9a8d4' };
    case 'new_committee':
      return { bg: '#172554', fg: '#93c5fd' };
    case 'new_constitution':
      return { bg: '#3f2a00', fg: '#facc15' };
    case 'no_confidence':
      return { bg: '#450a0a', fg: '#fca5a5' };
    case 'info_action':
      return { bg: '#1f2937', fg: '#d1d5db' };
    default:
      return { bg: '#111827', fg: '#d1d5db' };
  }
}

function parseSummary(
  type: GovernanceType,
  rawDescription: unknown,
  preloadedWithdrawals?: { stake_address: string; amount: string }[] | null
): { summary: string; treasuryTotalLovelace: number | null } {
  const desc = rawDescription as Record<string, unknown> | null;

  if (type === 'treasury_withdrawals') {
    let totalLovelace = 0;
    let recipientCount = 0;

    if (preloadedWithdrawals && preloadedWithdrawals.length > 0) {
      for (const w of preloadedWithdrawals) {
        const amount = parseNumericValue(w.amount);
        if (amount !== null) {
          totalLovelace += amount;
          recipientCount += 1;
        }
      }
    } else {
      const rawWithdrawals =
        desc?.withdrawals ??
        desc?.treasury_withdrawals ??
        ((desc?.action as Record<string, unknown> | undefined)?.withdrawals) ??
        ((desc?.contents as Record<string, unknown> | undefined)?.withdrawals);
      const summary = summarizeWithdrawals(rawWithdrawals);
      totalLovelace = summary.totalLovelace;
      recipientCount = summary.recipientCount;
    }

    return {
      summary: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} · ${(totalLovelace / 1_000_000).toLocaleString()} ADA`,
      treasuryTotalLovelace: totalLovelace
    };
  }

  if (type === 'parameter_change') {
    const paramChanges =
      ((desc?.protocol_param_update as Record<string, unknown> | undefined) ??
        (desc?.parameter_changes as Record<string, unknown> | undefined) ??
        {}) as Record<string, unknown>;
    const keys = Object.keys(paramChanges);
    return {
      summary: keys.length > 0 ? `Parameters: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}` : 'Protocol parameter updates',
      treasuryTotalLovelace: null,
    };
  }

  if (type === 'new_committee') {
    const newMembers = (desc?.new_members as unknown[] | undefined) ?? [];
    const removedMembers = (desc?.removed_members as unknown[] | undefined) ?? [];
    const threshold = desc?.new_quorum_threshold;
    return {
      summary: `Members +${newMembers.length}/-${removedMembers.length}${threshold !== undefined ? ` · Threshold ${String(threshold)}` : ''}`,
      treasuryTotalLovelace: null
    };
  }

  if (type === 'new_constitution') {
    const anchor = desc?.constitution as Record<string, unknown> | undefined;
    const url = anchor?.url ? String(anchor.url) : null;
    const hash = anchor?.data_hash ? truncateHash(String(anchor.data_hash)) : null;
    return {
      summary: `Constitution anchor${url ? ` · ${url}` : ''}${hash ? ` · ${hash}` : ''}`,
      treasuryTotalLovelace: null
    };
  }

  if (type === 'hard_fork_initiation') {
    const version = (desc?.protocol_version as Record<string, unknown> | undefined) ?? {};
    const major = version.major !== undefined ? String(version.major) : '?';
    const minor = version.minor !== undefined ? String(version.minor) : '?';
    return {
      summary: `Target protocol version ${major}.${minor}`,
      treasuryTotalLovelace: null
    };
  }

  if (type === 'no_confidence') {
    return { summary: 'No confidence action', treasuryTotalLovelace: null };
  }

  if (type === 'info_action') {
    return { summary: 'Informational governance action', treasuryTotalLovelace: null };
  }

  return { summary: 'Governance action', treasuryTotalLovelace: null };
}

function extractGovernanceTitle(rawDescription: unknown): string | null {
  const visited = new Set<unknown>();
  const candidateKeys = ['title', 'action_title', 'proposal_title', 'name'] as const;

  const walk = (value: unknown, depth: number): string | null => {
    if (depth > 4 || value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        return walk(JSON.parse(trimmed), depth + 1);
      } catch {
        return null;
      }
    }
    if (typeof value !== 'object') return null;
    if (visited.has(value)) return null;
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const match = walk(item, depth + 1);
        if (match) return match;
      }
      return null;
    }

    const obj = value as Record<string, unknown>;
    for (const key of candidateKeys) {
      const candidate = obj[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    const priorityContainers = [obj.metadata, obj.action, obj.contents, obj.proposal];
    for (const container of priorityContainers) {
      const match = walk(container, depth + 1);
      if (match) return match;
    }

    for (const nested of Object.values(obj)) {
      const match = walk(nested, depth + 1);
      if (match) return match;
    }

    return null;
  };

  return walk(rawDescription, 0);
}

const GovernanceActions = () => {
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [actions, setActions] = useState<LiveGovernanceAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | GovernanceType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('none');

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
    if (!apiKey) return;
    fetchData(apiKey);
  }, [apiKey]);

  const fetchData = async (key: string) => {
    setLoading(true);
    setError(null);
    setActions([]);

    try {
      const proposals = await fetchAllPages<BlockfrostProposal>('/governance/proposals', key);

      const details = await mapWithConcurrency(proposals, 8, async (proposal) => {
        const res = await fetch(`${BLOCKFROST_BASE}/governance/proposals/${proposal.tx_hash}/${proposal.cert_index}`, {
          headers: { project_id: key }
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Blockfrost ${res.status}: ${body}`);
        }
        const detail: BlockfrostProposalDetail = await res.json();

        let withdrawals: { stake_address: string; amount: string }[] | null = null;
        if (proposal.governance_type === 'treasury_withdrawals') {
          try {
            const wRes = await fetch(
              `${BLOCKFROST_BASE}/governance/proposals/${proposal.tx_hash}/${proposal.cert_index}/withdrawals?count=100`,
              { headers: { project_id: key } }
            );
            if (wRes.ok) {
              withdrawals = await wRes.json();
            }
          } catch (wErr) {
            console.warn('Failed to fetch treasury withdrawal amounts', wErr);
          }
        }

        const { summary, treasuryTotalLovelace } = parseSummary(
          proposal.governance_type,
          detail.governance_description,
          withdrawals
        );
        const title = extractGovernanceTitle(detail.governance_description);
        return {
          id: proposal.id,
          txHash: proposal.tx_hash,
          certIndex: proposal.cert_index,
          governanceType: proposal.governance_type,
          droppedEpoch: detail.dropped_epoch,
          expiredEpoch: detail.expired_epoch,
          ratifiedEpoch: detail.ratified_epoch,
          enactedEpoch: detail.enacted_epoch,
          treasuryWithdrawalTotalLovelace: treasuryTotalLovelace,
          title,
          summary,
          detailJson: detail.governance_description ? JSON.stringify(detail.governance_description, null, 2) : null,
        } satisfies LiveGovernanceAction;
      });

      const liveActions = details.filter(action =>
        action.droppedEpoch === null &&
        action.expiredEpoch === null &&
        action.ratifiedEpoch === null &&
        action.enactedEpoch === null
      );
      setActions(liveActions);
    } catch (err) {
      console.error('Failed to fetch live governance actions', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch governance actions');
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = useMemo(() => {
    const base = selectedType === 'all'
      ? [...actions]
      : actions.filter(action => action.governanceType === selectedType);

    if (selectedType === 'treasury_withdrawals') {
      if (sortOption === 'amount_asc') {
        base.sort((a, b) => (a.treasuryWithdrawalTotalLovelace ?? 0) - (b.treasuryWithdrawalTotalLovelace ?? 0));
      } else if (sortOption === 'amount_desc') {
        base.sort((a, b) => (b.treasuryWithdrawalTotalLovelace ?? 0) - (a.treasuryWithdrawalTotalLovelace ?? 0));
      }
    }

    return base;
  }, [actions, selectedType, sortOption]);

  const countsByType = useMemo(() => {
    const counts: Record<GovernanceType, number> = {
      hard_fork_initiation: 0,
      info_action: 0,
      new_committee: 0,
      new_constitution: 0,
      no_confidence: 0,
      parameter_change: 0,
      treasury_withdrawals: 0,
    };
    for (const action of actions) counts[action.governanceType] += 1;
    return counts;
  }, [actions]);

  const handleApplyKey = () => {
    if (!localApiKey.trim()) return;
    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: localApiKey.trim() }));
    const url = new URL(window.location.href);
    url.searchParams.set('blockfrostApiKey', localApiKey.trim());
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div className="main-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '980px' }}>
          <h1>Live Governance Actions</h1>

          {!apiKey && (
            <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                A Blockfrost API key is required to list governance actions. Get one from{' '}
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

          <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '260px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Filter by type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | GovernanceType)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="all">All action types</option>
                {GOVERNANCE_TYPES.map(type => (
                  <option key={type} value={type}>{formatGovActionType(type)}</option>
                ))}
              </select>
            </div>

            {selectedType === 'treasury_withdrawals' && (
              <div style={{ minWidth: '260px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Sort treasury withdrawals</label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="none">None</option>
                  <option value="amount_asc">Amount ascending</option>
                  <option value="amount_desc">Amount descending</option>
                </select>
              </div>
            )}
          </div>

          {loading && <p>Loading live governance actions...</p>}
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00', width: '100%' }}>
              Error: {error}
            </div>
          )}

          {!loading && !error && actions.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>Total live actions: <strong>{actions.length}</strong></span>
                {GOVERNANCE_TYPES.map(type => (
                  <span key={type}>
                    {formatGovActionType(type)}: <strong>{countsByType[type]}</strong>
                  </span>
                ))}
              </div>

              <div style={{ width: '100%', display: 'grid', gap: '0.75rem' }}>
                {filteredActions.map(action => {
                  const colors = typeColor(action.governanceType);
                  return (
                    <div
                      key={`${action.txHash}#${action.certIndex}`}
                      style={{
                        border: '1px solid #4b5563',
                        borderRadius: '8px',
                        padding: '0.9rem',
                        backgroundColor: '#1a1103',
                        display: 'grid',
                        gap: '0.6rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <a
                          href={`https://cardanoscan.io/govAction/${action.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#93c5fd', textDecoration: 'underline', fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
                        >
                          {truncateHash(action.id)}
                        </a>
                        <span
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.fg,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            borderRadius: '9999px',
                            padding: '0.25rem 0.65rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatGovActionType(action.governanceType)}
                        </span>
                      </div>

                      {action.title && (
                        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                          {action.title}
                        </div>
                      )}
                      <div style={{ color: '#e5e7eb' }}>{action.summary}</div>

                      {(action.ratifiedEpoch !== null || action.enactedEpoch !== null) && (
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {action.ratifiedEpoch !== null && <span style={{ marginRight: '0.75rem' }}>Ratified epoch: {action.ratifiedEpoch}</span>}
                          {action.enactedEpoch !== null && <span>Enacted epoch: {action.enactedEpoch}</span>}
                        </div>
                      )}

                      {action.detailJson && (
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Show action JSON
                          </summary>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', marginTop: '0.6rem', color: '#d1d5db' }}>
                            {action.detailJson}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && !error && apiKey && actions.length === 0 && (
            <p>No live governance actions found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernanceActions;
