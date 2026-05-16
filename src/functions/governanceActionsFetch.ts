const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export const GOVERNANCE_TYPES = [
  'hard_fork_initiation',
  'info_action',
  'new_committee',
  'new_constitution',
  'no_confidence',
  'parameter_change',
  'treasury_withdrawals',
] as const;

export type GovernanceType = (typeof GOVERNANCE_TYPES)[number];

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

export interface GovernanceMetadataReference {
  label: string;
  uri: string;
  hashDigest?: string | null;
  hashAlgorithm?: string | null;
}

export interface GovernanceMetadata {
  title: string | null;
  abstract: string | null;
  motivation: string | null;
  rationale: string | null;
  references: GovernanceMetadataReference[];
}

export type MetadataErrorCode =
  | 'anchor_discovery_failed'
  | 'anchor_missing'
  | 'network_error'
  | 'http_error'
  | 'invalid_json'
  | 'schema_mismatch';

export interface MetadataError {
  code: MetadataErrorCode;
  message: string;
  details?: string;
  statusCode?: number;
  source: 'step1' | 'step2';
  retryable: boolean;
}

export interface LiveGovernanceAction {
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

export interface FetchLiveGovernanceActionsOptions {
  onPartial?: (actions: LiveGovernanceAction[]) => void;
}

export async function fetchAllPages<T>(endpoint: string, apiKey: string): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${BLOCKFROST_BASE}${endpoint}?page=${page}&count=100&order=desc`, {
      headers: { project_id: apiKey },
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

export function truncateHash(hash: string): string {
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

export function formatGovActionType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
        (desc?.action as Record<string, unknown> | undefined)?.withdrawals ??
        (desc?.contents as Record<string, unknown> | undefined)?.withdrawals;
      const summary = summarizeWithdrawals(rawWithdrawals);
      totalLovelace = summary.totalLovelace;
      recipientCount = summary.recipientCount;
    }

    return {
      summary: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} · ${(totalLovelace / 1_000_000).toLocaleString()} ADA`,
      treasuryTotalLovelace: totalLovelace,
    };
  }

  if (type === 'parameter_change') {
    const paramChanges =
      ((desc?.protocol_param_update as Record<string, unknown> | undefined) ??
        (desc?.parameter_changes as Record<string, unknown> | undefined) ??
        {}) as Record<string, unknown>;
    const keys = Object.keys(paramChanges);
    return {
      summary:
        keys.length > 0
          ? `Parameters: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`
          : 'Protocol parameter updates',
      treasuryTotalLovelace: null,
    };
  }

  if (type === 'new_committee') {
    const newMembers = (desc?.new_members as unknown[] | undefined) ?? [];
    const removedMembers = (desc?.removed_members as unknown[] | undefined) ?? [];
    const threshold = desc?.new_quorum_threshold;
    return {
      summary: `Members +${newMembers.length}/-${removedMembers.length}${
        threshold !== undefined ? ` · Threshold ${String(threshold)}` : ''
      }`,
      treasuryTotalLovelace: null,
    };
  }

  if (type === 'new_constitution') {
    const anchor = desc?.constitution as Record<string, unknown> | undefined;
    const url = anchor?.url ? String(anchor.url) : null;
    const hash = anchor?.data_hash ? truncateHash(String(anchor.data_hash)) : null;
    return {
      summary: `Constitution anchor${url ? ` · ${url}` : ''}${hash ? ` · ${hash}` : ''}`,
      treasuryTotalLovelace: null,
    };
  }

  if (type === 'hard_fork_initiation') {
    const version = (desc?.protocol_version as Record<string, unknown> | undefined) ?? {};
    const major = version.major !== undefined ? String(version.major) : '?';
    const minor = version.minor !== undefined ? String(version.minor) : '?';
    return {
      summary: `Target protocol version ${major}.${minor}`,
      treasuryTotalLovelace: null,
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
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
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
      obj.references,
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
          retryable: false,
        },
      };
    }
    return {
      step1Status: 'success',
      metadataUrl: found.url,
      metadataHash: found.hash,
      metadataError: null,
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
        retryable: false,
      },
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
      hashAlgorithm: asText(refHash?.hashAlgorithm),
    });
  }

  if (!title && !abstract && !motivation && !rationale && references.length === 0) {
    return null;
  }

  return { title, abstract, motivation, rationale, references };
}

export async function loadActionMetadata(
  url: string
): Promise<{ metadata: GovernanceMetadata | null; metadataError: MetadataError | null }> {
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
          retryable: res.status >= 500 || res.status === 429,
        },
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
          retryable: false,
        },
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
          retryable: false,
        },
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
        retryable: true,
      },
    };
  }
}

/**
 * Fetch all governance proposals that are still "live" (not dropped, expired, ratified, or enacted),
 * including CIP-108 metadata where discoverable.
 */
export async function fetchLiveGovernanceActions(
  apiKey: string,
  options?: FetchLiveGovernanceActionsOptions
): Promise<LiveGovernanceAction[]> {
  const proposals = await fetchAllPages<BlockfrostProposal>('/governance/proposals', apiKey);

  const details = await mapWithConcurrency(proposals, 8, async (proposal) => {
    try {
      const res = await fetch(`${BLOCKFROST_BASE}/governance/proposals/${proposal.tx_hash}/${proposal.cert_index}`, {
        headers: { project_id: apiKey },
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
            { headers: { project_id: apiKey } }
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
        metadataError: anchor.metadataError,
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

  const stage2Pending = liveActions.map((action) =>
    action.metadataStep1Status === 'success' && action.metadataUrl
      ? { ...action, metadataStep2Status: 'loading' as const }
      : action
  );
  options?.onPartial?.(stage2Pending);

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
      metadataError: metadataError ?? action.metadataError,
    };
  });

  return stage2Loaded;
}
