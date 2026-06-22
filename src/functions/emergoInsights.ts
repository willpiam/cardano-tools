import {
  fetchPopularDrepsPageFromBlockfrost,
  type BlockfrostDrepListItem,
} from './popularDrepsFetch';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

/** Emergo DRep IDs included in the insights "set" bucket. */
export const EMERGO_INSIGHTS_DREP_IDS = [
  'drep1ygr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tswtre9j',
  'drep1y2200we9c904un36tzaearntzzl63snffuul9qsk0te4utqfkke0w',
  'drep1ytvlwvyjmzfyn56n0zz4f6lj94wxhmsl5zky6knnzrf4jygpyahug',
] as const;

export type DelegationBucketKey =
  | 'undelegated'
  | 'emergoSet'
  | 'autoAbstain'
  | 'noConfidence'
  | 'otherDrep';

export interface DelegationBreakdownLovelace {
  undelegated: number;
  emergoSet: number;
  autoAbstain: number;
  noConfidence: number;
  otherDrep: number;
  activeStake: number;
  totalDelegated: number;
}

export interface EmergoInsightsVisibility {
  includeUndelegated: boolean;
  includeAutoAbstain: boolean;
  includeNoConfidence: boolean;
}

export const DEFAULT_EMERGO_INSIGHTS_VISIBILITY: EmergoInsightsVisibility = {
  includeUndelegated: true,
  includeAutoAbstain: true,
  includeNoConfidence: true,
};

export const DELEGATION_BUCKET_META: readonly {
  key: DelegationBucketKey;
  label: string;
  color: string;
}[] = [
  { key: 'undelegated', label: 'Undelegated', color: '#6b7280' },
  { key: 'emergoSet', label: 'Emergo set', color: '#3b82f6' },
  { key: 'autoAbstain', label: 'Always abstain', color: '#c084fc' },
  { key: 'noConfidence', label: 'No confidence', color: '#9333ea' },
  { key: 'otherDrep', label: 'Other DRep', color: '#f97316' },
];

const EMERGO_SET = new Set(EMERGO_INSIGHTS_DREP_IDS.map(normalizeDrepId));

export function normalizeDrepId(drepId: string): string {
  return drepId.trim().toLowerCase();
}

function parseAmountLovelace(amount: string): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export function classifyDrepDelegation(
  drepId: string
): Exclude<DelegationBucketKey, 'undelegated'> {
  const id = normalizeDrepId(drepId);
  if (EMERGO_SET.has(id)) return 'emergoSet';
  if (id === 'drep_always_abstain') return 'autoAbstain';
  if (id === 'drep_always_no_confidence') return 'noConfidence';
  return 'otherDrep';
}

export function computeDelegationBreakdown(
  dreps: BlockfrostDrepListItem[],
  activeStakeLovelace: number
): DelegationBreakdownLovelace {
  const breakdown = {
    emergoSet: 0,
    autoAbstain: 0,
    noConfidence: 0,
    otherDrep: 0,
  };

  for (const item of dreps) {
    const amount = parseAmountLovelace(item.amount);
    const bucket = classifyDrepDelegation(item.drep_id);
    breakdown[bucket] += amount;
  }

  const totalDelegated =
    breakdown.emergoSet + breakdown.autoAbstain + breakdown.noConfidence + breakdown.otherDrep;
  const undelegated = Math.max(0, activeStakeLovelace - totalDelegated);

  return {
    ...breakdown,
    undelegated,
    activeStake: activeStakeLovelace,
    totalDelegated,
  };
}

export function breakdownToCounts(
  breakdown: DelegationBreakdownLovelace,
  visibility: EmergoInsightsVisibility = DEFAULT_EMERGO_INSIGHTS_VISIBILITY
): Record<DelegationBucketKey, number> {
  return {
    undelegated: visibility.includeUndelegated ? breakdown.undelegated : 0,
    emergoSet: breakdown.emergoSet,
    autoAbstain: visibility.includeAutoAbstain ? breakdown.autoAbstain : 0,
    noConfidence: visibility.includeNoConfidence ? breakdown.noConfidence : 0,
    otherDrep: breakdown.otherDrep,
  };
}

async function fetchLatestActiveStakeLovelace(apiKey: string): Promise<number> {
  const res = await fetch(`${BLOCKFROST_BASE}/epochs/latest`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Blockfrost ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { active_stake?: string };
  return parseAmountLovelace(data.active_stake ?? '0');
}

/** Paginate all DReps (includes retired/expired; no sort filter). */
export async function fetchAllGovernanceDreps(apiKey: string): Promise<BlockfrostDrepListItem[]> {
  const results: BlockfrostDrepListItem[] = [];
  let page = 1;

  while (true) {
    const chunk = await fetchPopularDrepsPageFromBlockfrost(apiKey, { page, count: 100 });
    results.push(...chunk);
    if (chunk.length < 100) break;
    page++;
  }

  return results;
}

export async function fetchEmergoInsightsBreakdown(
  apiKey: string
): Promise<DelegationBreakdownLovelace> {
  const [activeStake, dreps] = await Promise.all([
    fetchLatestActiveStakeLovelace(apiKey),
    fetchAllGovernanceDreps(apiKey),
  ]);
  return computeDelegationBreakdown(dreps, activeStake);
}
