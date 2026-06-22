import { parseCip119Metadata, type DrepMetadata } from './drepMetadata';
import { truncateHash } from './governanceActionsFetch';
import {
  getDrepMetadataDocCacheBatch,
  type CachedDrepMetadataDoc,
} from '../utils/drepMetadataDocCache';
import {
  seedDrepMetadataDocFromListItem,
  type DrepListItemMetadataFields,
} from '../utils/drepMetadataDocFetch';
import {
  getPopularDrepsPageCache,
  popularDrepsPageCacheKey,
  putPopularDrepsPageCache,
  type PopularDrepsPageCacheParams,
} from '../utils/popularDrepsCache';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export const SPECIAL_DREP_IDS = ['drep_always_abstain', 'drep_always_no_confidence'] as const;
export const DEFAULT_POPULAR_DREPS_PAGE_SIZE = 50;

export interface BlockfrostDrepListItem {
  drep_id: string;
  hex: string;
  amount: string;
  has_script: boolean;
  retired: boolean;
  expired: boolean;
  last_active_epoch: number | null;
  metadata?: DrepListItemMetadataFields | null;
}

export interface PopularDrepRow {
  drepId: string;
  hex: string;
  amountLovelace: number;
  hasScript: boolean;
  retired: boolean;
  expired: boolean;
  lastActiveEpoch: number | null;
  profile: DrepMetadata | null;
  displayName: string;
}

export interface FetchPopularDrepsPageOptions {
  page: number;
  count?: number;
  retired?: boolean;
  expired?: boolean;
}

export interface LoadPopularDrepsPageOptions extends FetchPopularDrepsPageOptions {
  skipCache?: boolean;
}

export interface LoadPopularDrepsPageResult {
  rows: PopularDrepRow[];
  fromCache: boolean;
  fetchedFromNetwork: boolean;
  hasMore: boolean;
}

function truncateDrepId(drepId: string): string {
  const trimmed = drepId.trim();
  if (trimmed.length <= 24) return trimmed;
  return `${trimmed.slice(0, 12)}...${trimmed.slice(-8)}`;
}

function parseAmountLovelace(amount: string): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function resolveProfile(
  cachedDoc: CachedDrepMetadataDoc | undefined,
  embedded: DrepListItemMetadataFields | null | undefined
): DrepMetadata | null {
  if (cachedDoc?.metadata) return cachedDoc.metadata;
  if (cachedDoc?.rawPayload != null) {
    const fromCache = parseCip119Metadata(cachedDoc.rawPayload);
    if (fromCache) return fromCache;
  }
  if (embedded?.json_metadata != null) {
    return parseCip119Metadata(embedded.json_metadata);
  }
  return null;
}

function resolveDisplayName(drepId: string, profile: DrepMetadata | null): string {
  const givenName = profile?.givenName?.trim();
  if (givenName) return givenName;
  return truncateDrepId(drepId);
}

export function mapBlockfrostDrepToRow(
  item: BlockfrostDrepListItem,
  metadataDocCache?: Map<string, CachedDrepMetadataDoc>
): PopularDrepRow {
  const drepId = item.drep_id.trim();
  const cachedDoc = metadataDocCache?.get(drepId);
  const profile = resolveProfile(cachedDoc, item.metadata);

  return {
    drepId,
    hex: item.hex,
    amountLovelace: parseAmountLovelace(item.amount),
    hasScript: item.has_script,
    retired: item.retired,
    expired: item.expired,
    lastActiveEpoch: item.last_active_epoch,
    profile,
    displayName: resolveDisplayName(drepId, profile),
  };
}

export function filterLeaderboardDreps(rows: PopularDrepRow[]): PopularDrepRow[] {
  const special = new Set<string>(SPECIAL_DREP_IDS);
  return rows.filter((row) => !special.has(row.drepId));
}

export async function seedDrepMetadataDocsFromListItems(
  items: BlockfrostDrepListItem[]
): Promise<number> {
  let seeded = 0;
  for (const item of items) {
    const wrote = await seedDrepMetadataDocFromListItem(item.drep_id, item.metadata);
    if (wrote) seeded++;
  }
  return seeded;
}

function buildBlockfrostQuery(options: FetchPopularDrepsPageOptions): string {
  const count = options.count ?? DEFAULT_POPULAR_DREPS_PAGE_SIZE;
  const params = new URLSearchParams({
    order_by: 'amount',
    order: 'desc',
    page: String(options.page),
    count: String(count),
  });
  if (options.retired !== undefined) params.set('retired', String(options.retired));
  if (options.expired !== undefined) params.set('expired', String(options.expired));
  return params.toString();
}

export async function fetchPopularDrepsPageFromBlockfrost(
  apiKey: string,
  options: FetchPopularDrepsPageOptions
): Promise<BlockfrostDrepListItem[]> {
  const query = buildBlockfrostQuery(options);
  const res = await fetch(`${BLOCKFROST_BASE}/governance/dreps?${query}`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Blockfrost ${res.status}: ${body}`);
  }
  const data = (await res.json()) as BlockfrostDrepListItem[];
  return Array.isArray(data) ? data : [];
}

async function mapItemsToRows(items: BlockfrostDrepListItem[]): Promise<PopularDrepRow[]> {
  const drepIds = items.map((item) => item.drep_id.trim());
  const metadataDocCache = await getDrepMetadataDocCacheBatch(drepIds);
  const rows = items.map((item) => mapBlockfrostDrepToRow(item, metadataDocCache));
  return filterLeaderboardDreps(rows);
}

function cacheParamsFromOptions(options: FetchPopularDrepsPageOptions): PopularDrepsPageCacheParams {
  return {
    retired: options.retired,
    expired: options.expired,
    page: options.page,
    count: options.count ?? DEFAULT_POPULAR_DREPS_PAGE_SIZE,
  };
}

export async function fetchAndCachePopularDrepsPage(
  apiKey: string,
  options: LoadPopularDrepsPageOptions
): Promise<LoadPopularDrepsPageResult> {
  const count = options.count ?? DEFAULT_POPULAR_DREPS_PAGE_SIZE;
  const items = await fetchPopularDrepsPageFromBlockfrost(apiKey, options);
  await seedDrepMetadataDocsFromListItems(items);
  const rows = await mapItemsToRows(items);
  const cacheKey = popularDrepsPageCacheKey(cacheParamsFromOptions(options));
  await putPopularDrepsPageCache(cacheKey, {
    rows,
    cachedAtSec: Math.floor(Date.now() / 1000),
  });

  return {
    rows,
    fromCache: false,
    fetchedFromNetwork: true,
    hasMore: items.length >= count,
  };
}

export async function loadPopularDrepsPage(
  apiKey: string,
  options: LoadPopularDrepsPageOptions
): Promise<LoadPopularDrepsPageResult> {
  const count = options.count ?? DEFAULT_POPULAR_DREPS_PAGE_SIZE;

  if (!options.skipCache) {
    const cacheKey = popularDrepsPageCacheKey(cacheParamsFromOptions(options));
    const cached = await getPopularDrepsPageCache(cacheKey);
    if (cached) {
      return {
        rows: cached.rows,
        fromCache: true,
        fetchedFromNetwork: false,
        hasMore: cached.rows.length >= count,
      };
    }
  }

  return fetchAndCachePopularDrepsPage(apiKey, options);
}

/** Re-export for display of hex fields in the table. */
export { truncateHash };
