import { parseCip119Metadata, type DrepMetadata } from '../functions/drepMetadata';
import {
  resolveMetadataFetchUrl,
  type MetadataError,
} from '../functions/governanceActionsFetch';
import {
  getDrepMetadataDocCache,
  isDrepMetadataDocCacheHit,
  putDrepMetadataDocCache,
  type CachedDrepMetadataDoc,
} from './drepMetadataDocCache';
import { IPFS_GATEWAYS, parseIpfsLink, type IpfsGateway } from './ipfsGateways';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface BlockfrostDrepMetadataResponse {
  drep_id: string;
  hex: string;
  url: string;
  hash: string;
  json_metadata: unknown;
  bytes: string | null;
  error?: { code: string; message: string };
}

export type EnsureDrepMetadataDocOutcome = 'cached' | 'fetched' | 'absent' | 'failed';

export interface FetchDrepMetadataDocResult {
  metadata: DrepMetadata | null;
  metadataError: MetadataError | null;
  rawPayload: unknown | null;
  fetchUrl: string;
}

export interface EnsureDrepMetadataDocResult {
  outcome: EnsureDrepMetadataDocOutcome;
  metadata: DrepMetadata | null;
  rawPayload: unknown | null;
  metadataError: MetadataError | null;
  fetchUrl: string | null;
  anchorUrl: string;
  hashHex?: string;
  blockfrostError?: { code: string; message: string } | null;
}

function hasMetadataAnchor(response: BlockfrostDrepMetadataResponse): boolean {
  return Boolean(response.url?.trim());
}

async function loadDrepMetadataFromFetchUrl(fetchUrl: string): Promise<FetchDrepMetadataDocResult> {
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      const body = await res.text();
      return {
        metadata: null,
        rawPayload: null,
        metadataError: {
          code: 'http_error',
          message: `Metadata fetch failed with HTTP ${res.status}.`,
          details: body.slice(0, 300),
          statusCode: res.status,
          source: 'step2',
          retryable: res.status >= 500 || res.status === 429,
        },
        fetchUrl,
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
          message: 'Metadata response is not valid JSON.',
          details: err instanceof Error ? err.message : String(err),
          source: 'step2',
          retryable: false,
        },
        fetchUrl,
      };
    }

    const metadata = parseCip119Metadata(payload);
    if (!metadata) {
      return {
        metadata: null,
        rawPayload: payload,
        metadataError: {
          code: 'schema_mismatch',
          message: 'Metadata JSON does not match expected CIP-119 fields.',
          source: 'step2',
          retryable: false,
        },
        fetchUrl,
      };
    }

    return { metadata, metadataError: null, rawPayload: payload, fetchUrl };
  } catch (err) {
    return {
      metadata: null,
      rawPayload: null,
      metadataError: {
        code: 'network_error',
        message: 'Network error while loading metadata URL.',
        details: err instanceof Error ? err.message : String(err),
        source: 'step2',
        retryable: true,
      },
      fetchUrl,
    };
  }
}

export async function loadDrepMetadataViaGateway(
  anchorUrl: string,
  gateway: IpfsGateway
): Promise<FetchDrepMetadataDocResult> {
  const fetchUrl = resolveMetadataFetchUrl(anchorUrl, gateway);
  return loadDrepMetadataFromFetchUrl(fetchUrl);
}

export async function fetchDrepMetadataDocAtGatewayIndex(
  anchorUrl: string,
  gatewayIndex: number
): Promise<FetchDrepMetadataDocResult> {
  const gateway = IPFS_GATEWAYS[gatewayIndex] ?? IPFS_GATEWAYS[0];
  return loadDrepMetadataViaGateway(anchorUrl, gateway);
}

/** Try each IPFS gateway on retryable failures; non-IPFS anchors use a single fetch. */
export async function fetchDrepMetadataDocWithGatewayFallback(
  anchorUrl: string
): Promise<FetchDrepMetadataDocResult> {
  const gateways = parseIpfsLink(anchorUrl) ? IPFS_GATEWAYS : [IPFS_GATEWAYS[0]];
  let last: FetchDrepMetadataDocResult | null = null;

  for (const gateway of gateways) {
    const result = await loadDrepMetadataViaGateway(anchorUrl, gateway);
    if (!result.metadataError) return result;
    last = result;
    if (!result.metadataError.retryable) break;
  }

  return last!;
}

export async function fetchDrepMetadataFromBlockfrost(
  apiKey: string,
  drepId: string
): Promise<
  | { ok: true; response: BlockfrostDrepMetadataResponse }
  | { ok: false; metadataError: MetadataError }
> {
  try {
    const res = await fetch(
      `${BLOCKFROST_BASE}/governance/dreps/${encodeURIComponent(drepId.trim())}/metadata`,
      { headers: { project_id: apiKey } }
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        metadataError: {
          code: 'http_error',
          message: `Blockfrost metadata request failed with HTTP ${res.status}.`,
          details: body.slice(0, 300),
          statusCode: res.status,
          source: 'step1',
          retryable: res.status >= 500 || res.status === 429,
        },
      };
    }

    const response = (await res.json()) as BlockfrostDrepMetadataResponse;
    return { ok: true, response };
  } catch (err) {
    return {
      ok: false,
      metadataError: {
        code: 'network_error',
        message: 'Network error while requesting DRep metadata from Blockfrost.',
        details: err instanceof Error ? err.message : String(err),
        source: 'step1',
        retryable: true,
      },
    };
  }
}

function cachedResultFromEntry(entry: CachedDrepMetadataDoc): EnsureDrepMetadataDocResult {
  if (entry.metadata === null && entry.anchorUrl === '') {
    return {
      outcome: 'absent',
      metadata: null,
      rawPayload: entry.rawPayload,
      metadataError: null,
      fetchUrl: null,
      anchorUrl: '',
      hashHex: entry.hashHex,
      blockfrostError: entry.blockfrostError ?? null,
    };
  }

  const metadata =
    entry.rawPayload != null
      ? (parseCip119Metadata(entry.rawPayload) ?? entry.metadata)
      : entry.metadata;

  return {
    outcome: 'cached',
    metadata,
    rawPayload: entry.rawPayload,
    metadataError: null,
    fetchUrl: null,
    anchorUrl: entry.anchorUrl,
    hashHex: entry.hashHex,
    blockfrostError: entry.blockfrostError ?? null,
  };
}

async function persistDrepMetadataDocCache(
  drepId: string,
  entry: Omit<CachedDrepMetadataDoc, 'cachedAtSec'>
): Promise<void> {
  await putDrepMetadataDocCache(drepId, {
    ...entry,
    cachedAtSec: Math.floor(Date.now() / 1000),
  });
}

/**
 * Return cached doc when present; otherwise fetch from Blockfrost (with IPFS fallback).
 * When gatewayIndex is set, only that gateway is tried for the fallback path.
 */
export async function ensureDrepMetadataDocCached(params: {
  drepId: string;
  apiKey: string;
  gatewayIndex?: number;
}): Promise<EnsureDrepMetadataDocResult> {
  const { drepId, apiKey, gatewayIndex } = params;

  const existing = await getDrepMetadataDocCache(drepId);
  if (existing) {
    return cachedResultFromEntry(existing);
  }

  const blockfrost = await fetchDrepMetadataFromBlockfrost(apiKey, drepId);
  if (!blockfrost.ok) {
    return {
      outcome: 'failed',
      metadata: null,
      rawPayload: null,
      metadataError: blockfrost.metadataError,
      fetchUrl: null,
      anchorUrl: '',
      blockfrostError: null,
    };
  }

  const response = blockfrost.response;
  const anchorUrl = response.url?.trim() ?? '';
  const hashHex = response.hash?.trim() || undefined;
  const blockfrostError = response.error ?? null;

  const anchorCached = await getDrepMetadataDocCache(drepId);
  if (isDrepMetadataDocCacheHit(anchorCached, anchorUrl)) {
    return cachedResultFromEntry(anchorCached);
  }

  if (!hasMetadataAnchor(response)) {
    await persistDrepMetadataDocCache(drepId, {
      metadata: null,
      rawPayload: response.json_metadata ?? null,
      anchorUrl: '',
      hashHex,
      blockfrostError,
    });
    return {
      outcome: 'absent',
      metadata: null,
      rawPayload: response.json_metadata ?? null,
      metadataError: null,
      fetchUrl: null,
      anchorUrl: '',
      hashHex,
      blockfrostError,
    };
  }

  if (response.json_metadata != null) {
    const metadata = parseCip119Metadata(response.json_metadata);
    if (metadata) {
      await persistDrepMetadataDocCache(drepId, {
        metadata,
        rawPayload: response.json_metadata,
        anchorUrl,
        hashHex,
        blockfrostError,
      });
      return {
        outcome: 'fetched',
        metadata,
        rawPayload: response.json_metadata,
        metadataError: null,
        fetchUrl: null,
        anchorUrl,
        hashHex,
        blockfrostError,
      };
    }
  }

  const fetchResult =
    gatewayIndex !== undefined
      ? await fetchDrepMetadataDocAtGatewayIndex(anchorUrl, gatewayIndex)
      : await fetchDrepMetadataDocWithGatewayFallback(anchorUrl);

  if (fetchResult.metadataError) {
    return {
      outcome: 'failed',
      metadata: null,
      rawPayload: fetchResult.rawPayload,
      metadataError: fetchResult.metadataError,
      fetchUrl: fetchResult.fetchUrl,
      anchorUrl,
      hashHex,
      blockfrostError,
    };
  }

  await persistDrepMetadataDocCache(drepId, {
    metadata: fetchResult.metadata,
    rawPayload: fetchResult.rawPayload,
    anchorUrl,
    hashHex,
    blockfrostError,
  });

  return {
    outcome: 'fetched',
    metadata: fetchResult.metadata,
    rawPayload: fetchResult.rawPayload,
    metadataError: null,
    fetchUrl: fetchResult.fetchUrl,
    anchorUrl,
    hashHex,
    blockfrostError,
  };
}
