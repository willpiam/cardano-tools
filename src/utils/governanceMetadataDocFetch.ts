import {
  loadActionMetadataViaGateway,
  mapWithConcurrency,
  type GovernanceMetadata,
  type MetadataError,
} from '../functions/governanceActionsFetch';
import {
  getGovernanceMetadataDocCache,
  isGovernanceMetadataDocCacheHit,
  putGovernanceMetadataDocCache,
} from './governanceMetadataDocCache';
import { IPFS_GATEWAYS, parseIpfsLink } from './ipfsGateways';

export const METADATA_PREFETCH_CONCURRENCY = 6;

export interface FetchGovernanceMetadataDocResult {
  metadata: GovernanceMetadata | null;
  metadataError: MetadataError | null;
  rawPayload: unknown | null;
  fetchUrl: string;
}

export type EnsureGovernanceMetadataDocOutcome = 'cached' | 'fetched' | 'failed';

export interface EnsureGovernanceMetadataDocResult {
  outcome: EnsureGovernanceMetadataDocOutcome;
  metadata: GovernanceMetadata | null;
  rawPayload: unknown | null;
  metadataError: MetadataError | null;
  fetchUrl: string | null;
}

export interface MetadataPrefetchItem {
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
}

export interface MetadataPrefetchProgress {
  current: number;
  total: number;
  fetched: number;
  failed: number;
  skipped: number;
}

export async function fetchGovernanceMetadataDocAtGatewayIndex(
  anchorUrl: string,
  gatewayIndex: number
): Promise<FetchGovernanceMetadataDocResult> {
  const gateway = IPFS_GATEWAYS[gatewayIndex] ?? IPFS_GATEWAYS[0];
  return loadActionMetadataViaGateway(anchorUrl, gateway);
}

/** Try each IPFS gateway on retryable failures; non-IPFS anchors use a single fetch. */
export async function fetchGovernanceMetadataDocWithGatewayFallback(
  anchorUrl: string
): Promise<FetchGovernanceMetadataDocResult> {
  const gateways = parseIpfsLink(anchorUrl) ? IPFS_GATEWAYS : [IPFS_GATEWAYS[0]];
  let last: FetchGovernanceMetadataDocResult | null = null;

  for (const gateway of gateways) {
    const result = await loadActionMetadataViaGateway(anchorUrl, gateway);
    if (!result.metadataError) return result;
    last = result;
    if (!result.metadataError.retryable) break;
  }

  return last!;
}

async function persistGovernanceMetadataDocCache(
  cacheKey: string,
  anchorUrl: string,
  hashHex: string | undefined,
  result: FetchGovernanceMetadataDocResult
): Promise<void> {
  if (!result.metadata) return;
  await putGovernanceMetadataDocCache(cacheKey, {
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
export async function ensureGovernanceMetadataDocCached(params: {
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
  gatewayIndex?: number;
}): Promise<EnsureGovernanceMetadataDocResult> {
  const { cacheKey, anchorUrl, hashHex, gatewayIndex } = params;

  const cached = await getGovernanceMetadataDocCache(cacheKey);
  if (isGovernanceMetadataDocCacheHit(cached, anchorUrl)) {
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
      ? await fetchGovernanceMetadataDocAtGatewayIndex(anchorUrl, gatewayIndex)
      : await fetchGovernanceMetadataDocWithGatewayFallback(anchorUrl);

  if (fetchResult.metadataError) {
    return {
      outcome: 'failed',
      metadata: null,
      rawPayload: fetchResult.rawPayload,
      metadataError: fetchResult.metadataError,
      fetchUrl: fetchResult.fetchUrl,
    };
  }

  await persistGovernanceMetadataDocCache(cacheKey, anchorUrl, hashHex, fetchResult);

  return {
    outcome: 'fetched',
    metadata: fetchResult.metadata,
    rawPayload: fetchResult.rawPayload,
    metadataError: null,
    fetchUrl: fetchResult.fetchUrl,
  };
}

export async function prefetchUncachedGovernanceMetadataDocs(
  items: MetadataPrefetchItem[],
  options?: {
    concurrency?: number;
    onProgress?: (progress: MetadataPrefetchProgress) => void;
  }
): Promise<{ fetched: number; failed: number; skipped: number }> {
  const concurrency = options?.concurrency ?? METADATA_PREFETCH_CONCURRENCY;
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
    const result = await ensureGovernanceMetadataDocCached({
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
