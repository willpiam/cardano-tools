import {
  conchTxCacheKey,
  getConchTxCacheBatch,
  putConchTxCacheBatch,
  type CachedConchTx,
} from './conchHistoryCache';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface BlockfrostAssetTx {
  tx_hash: string;
  block_time: number;
}

export interface BlockfrostTxMetadataEntry {
  label: string;
  json_metadata: unknown;
}

export interface Cip20MessageRow {
  tx: string;
  url: string;
  timestamp: string;
  message: string;
}

export interface Cip20HistoryResult {
  rows: Cip20MessageRow[];
  cachedTxCount: number;
  fetchedTxCount: number;
}

async function bfFetchJson<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${BLOCKFROST_BASE}${path}`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Blockfrost ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Paginate asset txs ascending until `amount` rows or no more pages. */
export async function fetchAssetTransactions(
  assetId: string,
  apiKey: string,
  amount: number
): Promise<BlockfrostAssetTx[]> {
  if (amount <= 0) return [];

  const enc = encodeURIComponent(assetId);
  const out: BlockfrostAssetTx[] = [];
  let page = 1;

  while (out.length < amount) {
    const count = Math.min(100, amount - out.length);
    const path = `/assets/${enc}/transactions?page=${page}&count=${count}&order=asc`;
    const chunk = await bfFetchJson<BlockfrostAssetTx[]>(path, apiKey);
    if (chunk.length === 0) break;
    out.push(...chunk);
    if (chunk.length < count) break;
    page++;
  }

  return out;
}

export async function fetchTxMetadata(
  txHash: string,
  apiKey: string
): Promise<BlockfrostTxMetadataEntry[]> {
  const data = await bfFetchJson<BlockfrostTxMetadataEntry[]>(
    `/txs/${txHash}/metadata`,
    apiKey
  );
  return Array.isArray(data) ? data : [];
}

function hasCip20Metadata(metadata: BlockfrostTxMetadataEntry[]): boolean {
  if (metadata.length === 0) return false;
  return metadata.some((m) => m.label === '674');
}

function formatCip20Message(jsonMetadata: unknown): string {
  if (jsonMetadata === null || jsonMetadata === undefined) return '';

  if (typeof jsonMetadata === 'string') return jsonMetadata;

  if (typeof jsonMetadata === 'object' && !Array.isArray(jsonMetadata)) {
    const obj = jsonMetadata as Record<string, unknown>;
    const payload = obj.msg ?? jsonMetadata;
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) return payload.join('');
  }

  if (Array.isArray(jsonMetadata)) {
    return jsonMetadata.join('');
  }

  return '';
}

function buildCacheEntry(
  blockTime: number,
  metadata: BlockfrostTxMetadataEntry[]
): CachedConchTx {
  const hasCip20 = hasCip20Metadata(metadata);
  const entry = metadata.find((m) => m.label === '674');
  const message = hasCip20 ? formatCip20Message(entry?.json_metadata) : '';
  return {
    blockTime,
    hasCip20,
    message,
    cachedAtSec: Math.floor(Date.now() / 1000),
  };
}

export function cip20MessageRowFromCache(txHash: string, cached: CachedConchTx): Cip20MessageRow {
  return {
    tx: txHash,
    url: `https://cardanoscan.io/transaction/${txHash}`,
    timestamp: new Date(cached.blockTime * 1000).toLocaleString(),
    message: cached.message,
  };
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function getAssetCip20History(
  assetId: string,
  apiKey: string,
  amount: number
): Promise<Cip20HistoryResult> {
  const history = await fetchAssetTransactions(assetId, apiKey, amount);
  if (history.length === 0) {
    return { rows: [], cachedTxCount: 0, fetchedTxCount: 0 };
  }

  const cacheByKey = await getConchTxCacheBatch(history.map((row) => row.tx_hash));
  const uncached = history.filter((row) => !cacheByKey.has(conchTxCacheKey(row.tx_hash)));
  const cachedTxCount = history.length - uncached.length;

  const newCacheEntries = new Map<string, CachedConchTx>();

  if (uncached.length > 0) {
    const fetched = await mapWithConcurrency(uncached, 8, async (row) => {
      const metadata = await fetchTxMetadata(row.tx_hash, apiKey);
      const entry = buildCacheEntry(row.block_time ?? 0, metadata);
      newCacheEntries.set(row.tx_hash, entry);
      return { txHash: row.tx_hash, entry };
    });
    await putConchTxCacheBatch(newCacheEntries);
    for (const { txHash, entry } of fetched) {
      cacheByKey.set(conchTxCacheKey(txHash), entry);
    }
  }

  const rows = history
    .map((row) => {
      const cached = cacheByKey.get(conchTxCacheKey(row.tx_hash));
      if (!cached?.hasCip20) return null;
      return cip20MessageRowFromCache(row.tx_hash, cached);
    })
    .filter((row): row is Cip20MessageRow => row != null);

  return {
    rows,
    cachedTxCount,
    fetchedTxCount: uncached.length,
  };
}
