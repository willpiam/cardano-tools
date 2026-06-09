import {
  parseCip100RationaleMetadata,
  type VoteRationaleMetadata,
} from '../functions/cip100RationaleDocument';
import {
  mapWithConcurrency,
  resolveMetadataFetchUrl,
  type MetadataError,
} from '../functions/governanceActionsFetch';
import {
  getVoteRationaleDocCache,
  isVoteRationaleDocCacheHit,
  putVoteRationaleDocCache,
} from './voteRationaleDocCache';
import { IPFS_GATEWAYS, parseIpfsLink, type IpfsGateway } from './ipfsGateways';

export const VOTE_RATIONALE_PREFETCH_CONCURRENCY = 6;

export interface FetchVoteRationaleDocResult {
  metadata: VoteRationaleMetadata | null;
  metadataError: MetadataError | null;
  rawPayload: unknown | null;
  fetchUrl: string;
}

export type EnsureVoteRationaleDocOutcome = 'cached' | 'fetched' | 'failed';

export interface EnsureVoteRationaleDocResult {
  outcome: EnsureVoteRationaleDocOutcome;
  metadata: VoteRationaleMetadata | null;
  rawPayload: unknown | null;
  metadataError: MetadataError | null;
  fetchUrl: string | null;
}

export interface VoteRationalePrefetchItem {
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
}

export interface VoteRationalePrefetchProgress {
  current: number;
  total: number;
  fetched: number;
  failed: number;
  skipped: number;
}

async function loadVoteRationaleFromFetchUrl(
  fetchUrl: string
): Promise<Omit<FetchVoteRationaleDocResult, 'fetchUrl'>> {
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      const body = await res.text();
      return {
        metadata: null,
        rawPayload: null,
        metadataError: {
          code: 'http_error',
          message: `Vote rationale fetch failed with HTTP ${res.status}.`,
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
        rawPayload: null,
        metadataError: {
          code: 'invalid_json',
          message: 'Vote rationale response is not valid JSON.',
          details: err instanceof Error ? err.message : String(err),
          source: 'step2',
          retryable: false,
        },
      };
    }

    const metadata = parseCip100RationaleMetadata(payload);
    if (!metadata) {
      return {
        metadata: null,
        rawPayload: payload,
        metadataError: {
          code: 'schema_mismatch',
          message: 'Vote rationale JSON does not match expected CIP-100 fields (body.comment).',
          source: 'step2',
          retryable: false,
        },
      };
    }

    return { metadata, metadataError: null, rawPayload: payload };
  } catch (err) {
    return {
      metadata: null,
      rawPayload: null,
      metadataError: {
        code: 'network_error',
        message: 'Network error while loading vote rationale URL.',
        details: err instanceof Error ? err.message : String(err),
        source: 'step2',
        retryable: true,
      },
    };
  }
}

async function loadVoteRationaleViaGateway(
  anchorUrl: string,
  gateway: IpfsGateway
): Promise<FetchVoteRationaleDocResult> {
  const fetchUrl = resolveMetadataFetchUrl(anchorUrl, gateway);
  const result = await loadVoteRationaleFromFetchUrl(fetchUrl);
  return { ...result, fetchUrl };
}

export async function fetchVoteRationaleDocAtGatewayIndex(
  anchorUrl: string,
  gatewayIndex: number
): Promise<FetchVoteRationaleDocResult> {
  const gateway = IPFS_GATEWAYS[gatewayIndex] ?? IPFS_GATEWAYS[0];
  return loadVoteRationaleViaGateway(anchorUrl, gateway);
}

/** Try each IPFS gateway on retryable failures; non-IPFS anchors use a single fetch. */
export async function fetchVoteRationaleDocWithGatewayFallback(
  anchorUrl: string
): Promise<FetchVoteRationaleDocResult> {
  const gateways = parseIpfsLink(anchorUrl) ? IPFS_GATEWAYS : [IPFS_GATEWAYS[0]];
  let last: FetchVoteRationaleDocResult | null = null;

  for (const gateway of gateways) {
    const result = await loadVoteRationaleViaGateway(anchorUrl, gateway);
    if (!result.metadataError) return result;
    last = result;
    if (!result.metadataError.retryable) break;
  }

  return last!;
}

async function persistVoteRationaleDocCache(
  cacheKey: string,
  anchorUrl: string,
  hashHex: string | undefined,
  result: FetchVoteRationaleDocResult
): Promise<void> {
  if (!result.metadata) return;
  await putVoteRationaleDocCache(cacheKey, {
    metadata: result.metadata,
    rawPayload: result.rawPayload,
    anchorUrl,
    hashHex,
    cachedAtSec: Math.floor(Date.now() / 1000),
  });
}

/**
 * Return cached doc when anchor matches; otherwise fetch (single gateway or IPFS fallback).
 * When gatewayIndex is set, only that gateway is tried (modal manual retry path).
 */
export async function ensureVoteRationaleDocCached(params: {
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
  gatewayIndex?: number;
}): Promise<EnsureVoteRationaleDocResult> {
  const { cacheKey, anchorUrl, hashHex, gatewayIndex } = params;

  const cached = await getVoteRationaleDocCache(cacheKey);
  if (isVoteRationaleDocCacheHit(cached, anchorUrl)) {
    return {
      outcome: 'cached',
      metadata: cached.metadata,
      rawPayload: cached.rawPayload,
      metadataError: null,
      fetchUrl: null,
    };
  }

  const fetchResult =
    gatewayIndex !== undefined
      ? await fetchVoteRationaleDocAtGatewayIndex(anchorUrl, gatewayIndex)
      : await fetchVoteRationaleDocWithGatewayFallback(anchorUrl);

  if (fetchResult.metadataError) {
    return {
      outcome: 'failed',
      metadata: null,
      rawPayload: fetchResult.rawPayload,
      metadataError: fetchResult.metadataError,
      fetchUrl: fetchResult.fetchUrl,
    };
  }

  await persistVoteRationaleDocCache(cacheKey, anchorUrl, hashHex, fetchResult);

  return {
    outcome: 'fetched',
    metadata: fetchResult.metadata,
    rawPayload: fetchResult.rawPayload,
    metadataError: null,
    fetchUrl: fetchResult.fetchUrl,
  };
}

export async function prefetchUncachedVoteRationaleDocs(
  items: VoteRationalePrefetchItem[],
  options?: {
    concurrency?: number;
    onProgress?: (progress: VoteRationalePrefetchProgress) => void;
  }
): Promise<{ fetched: number; failed: number; skipped: number }> {
  const concurrency = options?.concurrency ?? VOTE_RATIONALE_PREFETCH_CONCURRENCY;
  const total = items.length;
  let current = 0;
  let fetched = 0;
  let failed = 0;
  let skipped = 0;

  const reportProgress = () => {
    options?.onProgress?.({ current, total, fetched, failed, skipped });
  };

  if (total === 0) {
    reportProgress();
    return { fetched, failed, skipped };
  }

  await mapWithConcurrency(items, concurrency, async (item) => {
    const result = await ensureVoteRationaleDocCached({
      cacheKey: item.cacheKey,
      anchorUrl: item.anchorUrl,
      hashHex: item.hashHex,
    });

    if (result.outcome === 'cached') skipped += 1;
    else if (result.outcome === 'fetched') fetched += 1;
    else failed += 1;

    current += 1;
    reportProgress();
  });

  return { fetched, failed, skipped };
}
