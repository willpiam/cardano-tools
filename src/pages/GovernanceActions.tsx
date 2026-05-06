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
  metadataStep1Status: 'idle' | 'loading' | 'success' | 'error';
  metadataStep2Status: 'idle' | 'loading' | 'loaded' | 'error' | 'skipped';
  metadataUrl: string | null;
  metadataHash: string | null;
  metadata: GovernanceMetadata | null;
  metadataError: MetadataError | null;
}

interface GovernanceMetadataReference {
  label: string;
  uri: string;
  hashDigest?: string | null;
  hashAlgorithm?: string | null;
}

interface GovernanceMetadata {
  title: string | null;
  abstract: string | null;
  motivation: string | null;
  rationale: string | null;
  references: GovernanceMetadataReference[];
}

type MetadataErrorCode =
  | 'anchor_discovery_failed'
  | 'anchor_missing'
  | 'network_error'
  | 'http_error'
  | 'invalid_json'
  | 'schema_mismatch';

interface MetadataError {
  code: MetadataErrorCode;
  message: string;
  details?: string;
  statusCode?: number;
  source: 'step1' | 'step2';
  retryable: boolean;
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

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonIfString(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function discoverMetadataAnchor(rawDescription: unknown): {
  step1Status: 'success' | 'error';
  metadataUrl: string | null;
  metadataHash: string | null;
  metadataError: MetadataError | null;
} {
  const visited = new Set<unknown>();

  const walk = (value: unknown, depth: number): { url: string | null; hash: string | null } | null => {
    if (depth > 6 || value === null || value === undefined) return null;
    const parsed = parseJsonIfString(value);
    if (parsed === null || parsed === undefined) return null;
    if (typeof parsed !== 'object') return null;
    if (visited.has(parsed)) return null;
    visited.add(parsed);

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const found = walk(item, depth + 1);
        if (found?.url) return found;
      }
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const directUrl = asText(obj.uri) ?? asText(obj.url);
    const directHash =
      asText(obj.hash) ??
      asText(obj.data_hash) ??
      asText(obj.hashDigest) ??
      asText(obj.referenceHash);

    if (directUrl) {
      return { url: directUrl, hash: directHash };
    }

    const prioritized = [
      obj.anchor,
      obj.metadata_anchor,
      obj.governance_metadata_anchor,
      obj.metadata,
      obj.body,
      obj.action,
      obj.contents,
      obj.constitution,
      obj.referenceHash,
      obj.references
    ];

    for (const nested of prioritized) {
      const found = walk(nested, depth + 1);
      if (found?.url) return found;
    }

    for (const nested of Object.values(obj)) {
      const found = walk(nested, depth + 1);
      if (found?.url) return found;
    }

    return null;
  };

  try {
    const found = walk(rawDescription, 0);
    if (!found) {
      return {
        step1Status: 'error',
        metadataUrl: null,
        metadataHash: null,
        metadataError: {
          code: 'anchor_missing',
          message: 'No metadata URL found in on-chain governance description.',
          source: 'step1',
          retryable: false
        }
      };
    }
    return {
      step1Status: 'success',
      metadataUrl: found.url,
      metadataHash: found.hash,
      metadataError: null
    };
  } catch (err) {
    return {
      step1Status: 'error',
      metadataUrl: null,
      metadataHash: null,
      metadataError: {
        code: 'anchor_discovery_failed',
        message: 'Failed to discover metadata anchor from on-chain data.',
        details: err instanceof Error ? err.message : String(err),
        source: 'step1',
        retryable: false
      }
    };
  }
}

function parseCip108Metadata(payload: unknown): GovernanceMetadata | null {
  const root = asObject(payload);
  if (!root) return null;

  const body = asObject(root.body) ?? root;
  const title = asText(body.title);
  const abstract = asText(body.abstract);
  const motivation = asText(body.motivation);
  const rationale = asText(body.rationale);

  const rawReferencesValue = body.references;
  const rawRefs = Array.isArray(rawReferencesValue)
    ? rawReferencesValue
    : Array.isArray(asObject(rawReferencesValue)?.['@set'])
      ? (asObject(rawReferencesValue)?.['@set'] as unknown[])
      : [];
  const references: GovernanceMetadataReference[] = [];
  for (const entry of rawRefs) {
    const ref = asObject(entry);
    if (!ref) continue;
    const label = asText(ref.label);
    const uri = asText(ref.uri);
    if (!label || !uri) continue;
    const refHash = asObject(ref.referenceHash);
    references.push({
      label,
      uri,
      hashDigest: asText(refHash?.hashDigest),
      hashAlgorithm: asText(refHash?.hashAlgorithm)
    });
  }

  if (!title && !abstract && !motivation && !rationale && references.length === 0) {
    return null;
  }

  return { title, abstract, motivation, rationale, references };
}

async function loadActionMetadata(url: string): Promise<{ metadata: GovernanceMetadata | null; metadataError: MetadataError | null }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      return {
        metadata: null,
        metadataError: {
          code: 'http_error',
          message: `Metadata fetch failed with HTTP ${res.status}.`,
          details: body.slice(0, 300),
          statusCode: res.status,
          source: 'step2',
          retryable: res.status >= 500 || res.status === 429
        }
      };
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch (err) {
      return {
        metadata: null,
        metadataError: {
          code: 'invalid_json',
          message: 'Metadata response is not valid JSON.',
          details: err instanceof Error ? err.message : String(err),
          source: 'step2',
          retryable: false
        }
      };
    }

    const metadata = parseCip108Metadata(payload);
    if (!metadata) {
      return {
        metadata: null,
        metadataError: {
          code: 'schema_mismatch',
          message: 'Metadata JSON does not match expected CIP-108 fields.',
          source: 'step2',
          retryable: false
        }
      };
    }
    return { metadata, metadataError: null };
  } catch (err) {
    return {
      metadata: null,
      metadataError: {
        code: 'network_error',
        message: 'Network error while loading metadata URL.',
        details: err instanceof Error ? err.message : String(err),
        source: 'step2',
        retryable: true
      }
    };
  }
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

  const setActionByKey = (
    txHash: string,
    certIndex: number,
    updater: (action: LiveGovernanceAction) => LiveGovernanceAction
  ) => {
    setActions(prev => prev.map(action => (
      action.txHash === txHash && action.certIndex === certIndex
        ? updater(action)
        : action
    )));
  };

  const runMetadataStep2 = async (txHash: string, certIndex: number) => {
    const target = actions.find(action => action.txHash === txHash && action.certIndex === certIndex);
    if (!target || !target.metadataUrl || target.metadataStep1Status !== 'success') return;

    setActionByKey(txHash, certIndex, (action) => ({
      ...action,
      metadataStep2Status: 'loading',
      metadataError: null
    }));

    const { metadata, metadataError } = await loadActionMetadata(target.metadataUrl);
    setActionByKey(txHash, certIndex, (action) => ({
      ...action,
      metadataStep2Status: metadataError ? 'error' : 'loaded',
      metadata,
      metadataError
    }));
  };

  const fetchData = async (key: string) => {
    setLoading(true);
    setError(null);
    setActions([]);

    try {
      const proposals = await fetchAllPages<BlockfrostProposal>('/governance/proposals', key);

      const details = await mapWithConcurrency(proposals, 8, async (proposal) => {
        try {
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
          const anchor = discoverMetadataAnchor(detail.governance_description);

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
            metadataStep1Status: anchor.step1Status,
            metadataStep2Status: anchor.step1Status === 'success' && anchor.metadataUrl ? 'idle' : 'skipped',
            metadataUrl: anchor.metadataUrl,
            metadataHash: anchor.metadataHash,
            metadata: null,
            metadataError: anchor.metadataError
          } satisfies LiveGovernanceAction;
        } catch (err) {
          console.error('Failed to load proposal detail', proposal.tx_hash, proposal.cert_index, err);
          return null;
        }
      });

      const liveActions = details.reduce<LiveGovernanceAction[]>((acc, action) => {
        if (!action) return acc;
        if (
          action.droppedEpoch === null &&
          action.expiredEpoch === null &&
          action.ratifiedEpoch === null &&
          action.enactedEpoch === null
        ) {
          acc.push(action);
        }
        return acc;
      }, []);
      const stage2Pending = liveActions.map((action) => (
        action.metadataStep1Status === 'success' && action.metadataUrl
          ? { ...action, metadataStep2Status: 'loading' as const }
          : action
      ));
      setActions(stage2Pending);

      const stage2Loaded = await mapWithConcurrency<LiveGovernanceAction, LiveGovernanceAction>(stage2Pending, 6, async (action) => {
        if (action.metadataStep1Status !== 'success' || !action.metadataUrl) {
          return action;
        }
        const { metadata, metadataError } = await loadActionMetadata(action.metadataUrl);
        const nextStep2Status: LiveGovernanceAction['metadataStep2Status'] = metadataError ? 'error' : 'loaded';
        return {
          ...action,
          metadataStep2Status: nextStep2Status,
          metadata,
          metadataError: metadataError ?? action.metadataError
        };
      });
      setActions(stage2Loaded);
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
                  const displayTitle = action.metadata?.title ?? action.title;
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

                      {displayTitle && (
                        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                          {displayTitle}
                        </div>
                      )}
                      <div style={{ color: '#e5e7eb' }}>{action.summary}</div>

                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'grid', gap: '0.25rem' }}>
                        <div>
                          On-chain metadata anchor:{' '}
                          <strong>
                            {action.metadataStep1Status === 'success' ? 'success' : action.metadataStep1Status === 'error' ? 'error' : 'loading'}
                          </strong>
                        </div>
                        {action.metadataUrl && (
                          <div style={{ wordBreak: 'break-all' }}>
                            URL:{' '}
                            <a href={action.metadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
                              {action.metadataUrl}
                            </a>
                          </div>
                        )}
                        {action.metadataHash && (
                          <div style={{ wordBreak: 'break-all' }}>
                            Hash: {action.metadataHash}
                          </div>
                        )}
                        <div>
                          Metadata document fetch:{' '}
                          <strong>{action.metadataStep2Status}</strong>
                        </div>
                      </div>

                      {action.metadataError && (
                        <div style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #7f1d1d', backgroundColor: '#450a0a', color: '#fecaca', display: 'grid', gap: '0.35rem' }}>
                          <div>
                            {action.metadataError.source === 'step1' ? 'Step 1' : 'Step 2'}: {action.metadataError.message}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                            Code: {action.metadataError.code}
                            {action.metadataError.statusCode !== undefined ? ` · HTTP ${action.metadataError.statusCode}` : ''}
                            {action.metadataError.details ? ` · ${action.metadataError.details}` : ''}
                          </div>
                          {action.metadataStep2Status === 'error' && action.metadataUrl && (
                            <div>
                              <Button
                                onClick={() => runMetadataStep2(action.txHash, action.certIndex)}
                              >
                                Retry metadata
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {action.metadata && (
                        <div style={{ border: '1px solid #334155', borderRadius: '6px', padding: '0.6rem', display: 'grid', gap: '0.45rem' }}>
                          {action.metadata.abstract && (
                            <div style={{ color: '#e2e8f0' }}>
                              {action.metadata.abstract}
                            </div>
                          )}
                          {(action.metadata.motivation || action.metadata.rationale || action.metadata.references.length > 0) && (
                            <details>
                              <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}>
                                Show CIP-108 details
                              </summary>
                              <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.4rem', color: '#d1d5db' }}>
                                {action.metadata.motivation && <div><strong>Motivation:</strong> {action.metadata.motivation}</div>}
                                {action.metadata.rationale && <div><strong>Rationale:</strong> {action.metadata.rationale}</div>}
                                {action.metadata.references.length > 0 && (
                                  <div>
                                    <strong>References:</strong>
                                    <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
                                      {action.metadata.references.map((ref, idx) => (
                                        <li key={`${ref.uri}-${idx}`}>
                                          <a href={ref.uri} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
                                            {ref.label}
                                          </a>
                                          {ref.hashDigest ? ` · ${ref.hashDigest}` : ''}
                                          {ref.hashAlgorithm ? ` (${ref.hashAlgorithm})` : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      )}

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
