import {
  fetchPopularDrepsPageFromBlockfrost,
  SPECIAL_DREP_IDS,
  type BlockfrostDrepListItem,
} from './popularDrepsFetch';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

/** Emergo DRep IDs included in the insights "set" bucket. */
export const EMERGO_INSIGHTS_DREP_IDS = [
  'drep1ygr9tuapcanc3kpeyy4dc3vmrz9cfe5q7v9wj3x9j0ap3tswtre9j',
  'drep1y2200we9c904un36tzaearntzzl63snffuul9qsk0te4utqfkke0w',
  'drep1ytvlwvyjmzfyn56n0zz4f6lj94wxhmsl5zky6knnzrf4jygpyahug',
] as const;

export const DEFAULT_TOP_DREPS_INSIGHTS_N = 10;
export const MIN_TOP_DREPS_INSIGHTS_N = 1;
export const MAX_TOP_DREPS_INSIGHTS_N = 100;

export type DelegationBucketKey =
  | 'undelegated'
  | 'featuredSet'
  | 'autoAbstain'
  | 'noConfidence'
  | 'otherDrep';

export interface DelegationBreakdownLovelace {
  undelegated: number;
  featuredSet: number;
  autoAbstain: number;
  noConfidence: number;
  otherDrep: number;
  activeStake: number;
  totalDelegated: number;
}

export interface DelegationInsightsVisibility {
  includeUndelegated: boolean;
  includeAutoAbstain: boolean;
  includeNoConfidence: boolean;
}

/** @deprecated Use DelegationInsightsVisibility */
export type EmergoInsightsVisibility = DelegationInsightsVisibility;

export const DEFAULT_DELEGATION_INSIGHTS_VISIBILITY: DelegationInsightsVisibility = {
  includeUndelegated: true,
  includeAutoAbstain: true,
  includeNoConfidence: true,
};

/** @deprecated Use DEFAULT_DELEGATION_INSIGHTS_VISIBILITY */
export const DEFAULT_EMERGO_INSIGHTS_VISIBILITY = DEFAULT_DELEGATION_INSIGHTS_VISIBILITY;

const AUTO_DREP_SET = new Set(SPECIAL_DREP_IDS.map(normalizeDrepId));
const EMERGO_FEATURED_SET = new Set(EMERGO_INSIGHTS_DREP_IDS.map(normalizeDrepId));

export function delegationBucketMeta(featuredLabel: string): readonly {
  key: DelegationBucketKey;
  label: string;
  color: string;
}[] {
  return [
    { key: 'undelegated', label: 'Undelegated', color: '#6b7280' },
    { key: 'featuredSet', label: featuredLabel, color: '#3b82f6' },
    { key: 'autoAbstain', label: 'Always abstain', color: '#c084fc' },
    { key: 'noConfidence', label: 'No confidence', color: '#9333ea' },
    { key: 'otherDrep', label: 'Other DRep', color: '#f97316' },
  ];
}

export const EMERGO_DELEGATION_BUCKET_META = delegationBucketMeta('Emergo set');

/** @deprecated Use EMERGO_DELEGATION_BUCKET_META or delegationBucketMeta */
export const DELEGATION_BUCKET_META = EMERGO_DELEGATION_BUCKET_META;

export function normalizeDrepId(drepId: string): string {
  return drepId.trim().toLowerCase();
}

export function clampTopDrepsInsightsN(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_TOP_DREPS_INSIGHTS_N;
  return Math.min(MAX_TOP_DREPS_INSIGHTS_N, Math.max(MIN_TOP_DREPS_INSIGHTS_N, Math.floor(n)));
}

export function topDrepsFeaturedLabel(n: number): string {
  return `Top ${clampTopDrepsInsightsN(n)} DReps`;
}

function parseAmountLovelace(amount: string): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function isSpecialDrepId(drepId: string): boolean {
  return AUTO_DREP_SET.has(normalizeDrepId(drepId));
}

export function classifyDrepDelegation(
  drepId: string,
  featuredSet: ReadonlySet<string>
): Exclude<DelegationBucketKey, 'undelegated'> {
  const id = normalizeDrepId(drepId);
  if (id === 'drep_always_abstain') return 'autoAbstain';
  if (id === 'drep_always_no_confidence') return 'noConfidence';
  if (featuredSet.has(id)) return 'featuredSet';
  return 'otherDrep';
}

export function computeDelegationBreakdown(
  dreps: BlockfrostDrepListItem[],
  activeStakeLovelace: number,
  featuredSet: ReadonlySet<string>
): DelegationBreakdownLovelace {
  const breakdown = {
    featuredSet: 0,
    autoAbstain: 0,
    noConfidence: 0,
    otherDrep: 0,
  };

  for (const item of dreps) {
    const amount = parseAmountLovelace(item.amount);
    const bucket = classifyDrepDelegation(item.drep_id, featuredSet);
    breakdown[bucket] += amount;
  }

  const totalDelegated =
    breakdown.featuredSet + breakdown.autoAbstain + breakdown.noConfidence + breakdown.otherDrep;
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
  visibility: DelegationInsightsVisibility = DEFAULT_DELEGATION_INSIGHTS_VISIBILITY
): Record<DelegationBucketKey, number> {
  return {
    undelegated: visibility.includeUndelegated ? breakdown.undelegated : 0,
    featuredSet: breakdown.featuredSet,
    autoAbstain: visibility.includeAutoAbstain ? breakdown.autoAbstain : 0,
    noConfidence: visibility.includeNoConfidence ? breakdown.noConfidence : 0,
    otherDrep: breakdown.otherDrep,
  };
}

/** Collect top N non-special DRep IDs from ranked pages (already sorted by amount desc). */
export function collectTopNIdsFromRankedPages(
  items: BlockfrostDrepListItem[],
  n: number
): string[] {
  const target = clampTopDrepsInsightsN(n);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const id = item.drep_id.trim();
    if (!id || isSpecialDrepId(id)) continue;
    const key = normalizeDrepId(id);
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(id);
    if (ids.length >= target) break;
  }

  return ids;
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

/** Top N active DReps by voting power; excludes special auto DReps. */
export async function resolveTopNDrepIds(apiKey: string, n: number): Promise<string[]> {
  const target = clampTopDrepsInsightsN(n);
  const ranked: BlockfrostDrepListItem[] = [];
  let page = 1;

  while (ranked.length < target * 2) {
    const chunk = await fetchPopularDrepsPageFromBlockfrost(apiKey, {
      page,
      count: 100,
      retired: false,
      expired: false,
    });
    if (chunk.length === 0) break;
    ranked.push(...chunk);
    const collected = collectTopNIdsFromRankedPages(ranked, target);
    if (collected.length >= target) return collected;
    if (chunk.length < 100) break;
    page++;
  }

  return collectTopNIdsFromRankedPages(ranked, target);
}

async function fetchDelegationInsightsBreakdown(
  apiKey: string,
  featuredSet: ReadonlySet<string>
): Promise<DelegationBreakdownLovelace> {
  const [activeStake, dreps] = await Promise.all([
    fetchLatestActiveStakeLovelace(apiKey),
    fetchAllGovernanceDreps(apiKey),
  ]);
  return computeDelegationBreakdown(dreps, activeStake, featuredSet);
}

export async function fetchEmergoInsightsBreakdown(
  apiKey: string
): Promise<DelegationBreakdownLovelace> {
  return fetchDelegationInsightsBreakdown(apiKey, EMERGO_FEATURED_SET);
}

export async function fetchTopDrepsInsightsBreakdown(
  apiKey: string,
  n: number
): Promise<{ breakdown: DelegationBreakdownLovelace; topDrepIds: string[] }> {
  const topDrepIds = await resolveTopNDrepIds(apiKey, n);
  const featuredSet = new Set(topDrepIds.map(normalizeDrepId));
  const breakdown = await fetchDelegationInsightsBreakdown(apiKey, featuredSet);
  return { breakdown, topDrepIds };
}
