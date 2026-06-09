import type { VoteRationaleMetadata } from '../functions/cip100RationaleDocument';
import {
  drepVoteCacheKey,
  openDrepVotingHistoryDb,
  STORE_VOTE_METADATA_DOCS,
} from './drepVotingHistoryCache';

export { drepVoteCacheKey };

export interface CachedVoteRationaleDoc {
  metadata: VoteRationaleMetadata;
  rawPayload: unknown;
  anchorUrl: string;
  hashHex?: string;
  cachedAtSec: number;
}

/** True when a cached entry matches the current on-chain vote rationale anchor. */
export function isVoteRationaleDocCacheHit(
  entry: CachedVoteRationaleDoc | null | undefined,
  anchorUrl: string
): entry is CachedVoteRationaleDoc {
  return entry != null && entry.anchorUrl === anchorUrl;
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VOTE_METADATA_DOCS, 'readonly');
        const request = tx.objectStore(STORE_VOTE_METADATA_DOCS).get(key);
        tx.oncomplete = () => resolve(request.result as T | undefined);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
      })
  );
}

function idbPut(key: string, value: CachedVoteRationaleDoc): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VOTE_METADATA_DOCS, 'readwrite');
        tx.objectStore(STORE_VOTE_METADATA_DOCS).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      })
  );
}

function idbCount(): Promise<number> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VOTE_METADATA_DOCS, 'readonly');
        const request = tx.objectStore(STORE_VOTE_METADATA_DOCS).count();
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB count failed'));
      })
  );
}

function idbClear(): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VOTE_METADATA_DOCS, 'readwrite');
        tx.objectStore(STORE_VOTE_METADATA_DOCS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
      })
  );
}

function idbGetAll(): Promise<Map<string, CachedVoteRationaleDoc>> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VOTE_METADATA_DOCS, 'readonly');
        const store = tx.objectStore(STORE_VOTE_METADATA_DOCS);
        const request = store.getAll();
        const keysRequest = store.getAllKeys();
        tx.oncomplete = () => {
          const values = request.result as CachedVoteRationaleDoc[];
          const keys = keysRequest.result as string[];
          const map = new Map<string, CachedVoteRationaleDoc>();
          for (let i = 0; i < keys.length; i++) {
            map.set(String(keys[i]), values[i]);
          }
          resolve(map);
        };
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
      })
  );
}

export async function getVoteRationaleDocCache(
  key: string
): Promise<CachedVoteRationaleDoc | null> {
  try {
    const entry = await idbGet<CachedVoteRationaleDoc>(key);
    return entry ?? null;
  } catch (err) {
    console.warn('Failed to read vote rationale doc cache', key, err);
    return null;
  }
}

export async function putVoteRationaleDocCache(
  key: string,
  entry: CachedVoteRationaleDoc
): Promise<void> {
  try {
    await idbPut(key, entry);
  } catch (err) {
    console.warn('Failed to write vote rationale doc cache', key, err);
  }
}

/** All cached vote rationale documents (keyed by drep vote cache key). */
export async function loadAllVoteRationaleDocCache(): Promise<Map<string, CachedVoteRationaleDoc>> {
  try {
    return await idbGetAll();
  } catch (err) {
    console.warn('Failed to load vote rationale doc cache', err);
    return new Map();
  }
}

/** Cached vote rationale documents for a single DRep. */
export async function loadVoteRationaleDocCacheForDrep(
  drepId: string
): Promise<Map<string, CachedVoteRationaleDoc>> {
  const prefix = `${drepId.trim()}|`;
  const all = await loadAllVoteRationaleDocCache();
  const map = new Map<string, CachedVoteRationaleDoc>();
  for (const [key, value] of all) {
    if (key.startsWith(prefix)) {
      map.set(key, value);
    }
  }
  return map;
}

export async function countVoteRationaleDocCache(): Promise<number> {
  try {
    return await idbCount();
  } catch (err) {
    console.warn('Failed to count vote rationale doc cache', err);
    return 0;
  }
}

export async function clearVoteRationaleDocCache(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.warn('Failed to clear vote rationale doc cache', err);
  }
}
