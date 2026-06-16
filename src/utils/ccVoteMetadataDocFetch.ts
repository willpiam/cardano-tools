import { parseCip136VoteMetadata, type CcVoteMetadata } from '../functions/cip136VoteMetadata';
import {
  mapWithConcurrency,
  resolveMetadataFetchUrl,
  type MetadataError,
} from '../functions/governanceActionsFetch';
import {
  getCcVoteMetadataDocCache,
  isCcVoteMetadataDocCacheHit,
  putCcVoteMetadataDocCache,
} from './ccVoteMetadataDocCache';
import { IPFS_GATEWAYS, parseIpfsLink, type IpfsGateway } from './ipfsGateways';

export const CC_VOTE_METADATA_PREFETCH_CONCURRENCY = 6;

export interface FetchCcVoteMetadataDocResult {
  metadata: CcVoteMetadata | null;
  metadataError: MetadataError | null;
  rawPayload: unknown | null;
  fetchUrl: string;
}

export type EnsureCcVoteMetadataDocOutcome = 'cached' | 'fetched' | 'failed' | 'absent';

export interface EnsureCcVoteMetadataDocResult {
  outcome: EnsureCcVoteMetadataDocOutcome;
  metadata: CcVoteMetadata | null;
  rawPayload: unknown | null;
  metadataError: MetadataError | null;
  fetchUrl: string | null;
}

export interface CcVoteMetadataPrefetchItem {
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
}

async function loadCcVoteMetadataFromFetchUrl(
  fetchUrl: string
): Promise<Omit<FetchCcVoteMetadataDocResult, 'fetchUrl'>> {
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      const body = await res.text();
      return {
        metadata: null,
        rawPayload: null,
        metadataError: {
          code: 'http_error',
          message: `CC vote metadata fetch failed with HTTP ${res.status}.`,
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
          message: 'CC vote metadata response is not valid JSON.',
          details: err instanceof Error ? err.message : String(err),
          source: 'step2',
          retryable: false,
        },
      };
    }

    const metadata = parseCip136VoteMetadata(payload);
    if (!metadata) {
      return {
        metadata: null,
        rawPayload: payload,
        metadataError: {
          code: 'schema_mismatch',
          message: 'CC vote metadata JSON does not match expected CIP-136 fields.',
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
        message: 'Network error while loading CC vote metadata URL.',
        details: err instanceof Error ? err.message : String(err),
        source: 'step2',
        retryable: true,
      },
    };
  }
}

async function loadCcVoteMetadataViaGateway(
  anchorUrl: string,
  gateway: IpfsGateway
): Promise<FetchCcVoteMetadataDocResult> {
  const fetchUrl = resolveMetadataFetchUrl(anchorUrl, gateway);
  const result = await loadCcVoteMetadataFromFetchUrl(fetchUrl);
  return { ...result, fetchUrl };
}

export async function fetchCcVoteMetadataDocAtGatewayIndex(
  anchorUrl: string,
  gatewayIndex: number
): Promise<FetchCcVoteMetadataDocResult> {
  const gateway = IPFS_GATEWAYS[gatewayIndex] ?? IPFS_GATEWAYS[0];
  return loadCcVoteMetadataViaGateway(anchorUrl, gateway);
}

export async function fetchCcVoteMetadataDocWithGatewayFallback(
  anchorUrl: string
): Promise<FetchCcVoteMetadataDocResult> {
  const gateways = parseIpfsLink(anchorUrl) ? IPFS_GATEWAYS : [IPFS_GATEWAYS[0]];
  let last: FetchCcVoteMetadataDocResult | null = null;

  for (const gateway of gateways) {
    const result = await loadCcVoteMetadataViaGateway(anchorUrl, gateway);
    if (!result.metadataError) return result;
    last = result;
    if (!result.metadataError.retryable) break;
  }

  return last!;
}

export async function ensureCcVoteMetadataDocCached(params: {
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
  gatewayIndex?: number;
}): Promise<EnsureCcVoteMetadataDocResult> {
  const { cacheKey, anchorUrl, hashHex, gatewayIndex } = params;
  const trimmedUrl = anchorUrl.trim();

  if (!trimmedUrl) {
    const cached = await getCcVoteMetadataDocCache(cacheKey);
    if (cached && cached.anchorUrl === '') {
      return {
        outcome: 'absent',
        metadata: null,
        rawPayload: cached.rawPayload,
        metadataError: null,
        fetchUrl: null,
      };
    }
    await putCcVoteMetadataDocCache(cacheKey, {
      metadata: null,
      rawPayload: null,
      anchorUrl: '',
      hashHex,
      cachedAtSec: Math.floor(Date.now() / 1000),
    });
    return {
      outcome: 'absent',
      metadata: null,
      rawPayload: null,
      metadataError: null,
      fetchUrl: null,
    };
  }

  const cached = await getCcVoteMetadataDocCache(cacheKey);
  if (isCcVoteMetadataDocCacheHit(cached, trimmedUrl)) {
    return {
      outcome: cached.metadata ? 'cached' : 'absent',
      metadata: cached.metadata,
      rawPayload: cached.rawPayload,
      metadataError: null,
      fetchUrl: null,
    };
  }

  const fetchResult =
    gatewayIndex !== undefined
      ? await fetchCcVoteMetadataDocAtGatewayIndex(trimmedUrl, gatewayIndex)
      : await fetchCcVoteMetadataDocWithGatewayFallback(trimmedUrl);

  if (fetchResult.metadataError) {
    return {
      outcome: 'failed',
      metadata: null,
      rawPayload: fetchResult.rawPayload,
      metadataError: fetchResult.metadataError,
      fetchUrl: fetchResult.fetchUrl,
    };
  }

  await putCcVoteMetadataDocCache(cacheKey, {
    metadata: fetchResult.metadata,
    rawPayload: fetchResult.rawPayload,
    anchorUrl: trimmedUrl,
    hashHex,
    cachedAtSec: Math.floor(Date.now() / 1000),
  });

  return {
    outcome: 'fetched',
    metadata: fetchResult.metadata,
    rawPayload: fetchResult.rawPayload,
    metadataError: null,
    fetchUrl: fetchResult.fetchUrl,
  };
}

export async function prefetchCcVoteMetadataDocs(
  items: CcVoteMetadataPrefetchItem[],
  options?: {
    concurrency?: number;
    onItemComplete?: (cacheKey: string, result: EnsureCcVoteMetadataDocResult) => void;
  }
): Promise<{ fetched: number; failed: number; skipped: number; absent: number }> {
  const concurrency = options?.concurrency ?? CC_VOTE_METADATA_PREFETCH_CONCURRENCY;
  let fetched = 0;
  let failed = 0;
  let skipped = 0;
  let absent = 0;

  if (items.length === 0) {
    return { fetched, failed, skipped, absent };
  }

  await mapWithConcurrency(items, concurrency, async (item) => {
    const result = await ensureCcVoteMetadataDocCached({
      cacheKey: item.cacheKey,
      anchorUrl: item.anchorUrl,
      hashHex: item.hashHex,
    });

    if (result.outcome === 'cached') skipped += 1;
    else if (result.outcome === 'fetched') fetched += 1;
    else if (result.outcome === 'absent') absent += 1;
    else failed += 1;

    options?.onItemComplete?.(item.cacheKey, result);
  });

  return { fetched, failed, skipped, absent };
}
