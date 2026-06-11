import type { DrepMetadata } from '../functions/drepMetadata';
import { openDrepVotingHistoryDb, STORE_DREP_METADATA_DOCS } from './drepVotingHistoryCache';

export interface CachedDrepMetadataDoc {
  metadata: DrepMetadata | null;
  rawPayload: unknown;
  anchorUrl: string;
  hashHex?: string;
  blockfrostError?: { code: string; message: string } | null;
  cachedAtSec: number;
}

export function normalizeDrepMetadataCacheKey(drepId: string): string {
  return drepId.trim();
}

/** True when a cached entry matches the current on-chain metadata anchor. */
export function isDrepMetadataDocCacheHit(
  entry: CachedDrepMetadataDoc | null | undefined,
  anchorUrl: string
): entry is CachedDrepMetadataDoc {
  return entry != null && entry.anchorUrl === anchorUrl;
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DREP_METADATA_DOCS, 'readonly');
        const request = tx.objectStore(STORE_DREP_METADATA_DOCS).get(key);
        tx.oncomplete = () => resolve(request.result as T | undefined);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
      })
  );
}

function idbPut(key: string, value: CachedDrepMetadataDoc): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DREP_METADATA_DOCS, 'readwrite');
        tx.objectStore(STORE_DREP_METADATA_DOCS).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      })
  );
}

function idbCount(): Promise<number> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DREP_METADATA_DOCS, 'readonly');
        const request = tx.objectStore(STORE_DREP_METADATA_DOCS).count();
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB count failed'));
      })
  );
}

function idbClear(): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DREP_METADATA_DOCS, 'readwrite');
        tx.objectStore(STORE_DREP_METADATA_DOCS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
      })
  );
}

export async function getDrepMetadataDocCache(
  drepId: string
): Promise<CachedDrepMetadataDoc | null> {
  try {
    const entry = await idbGet<CachedDrepMetadataDoc>(normalizeDrepMetadataCacheKey(drepId));
    return entry ?? null;
  } catch (err) {
    console.warn('Failed to read DRep metadata doc cache', drepId, err);
    return null;
  }
}

export async function putDrepMetadataDocCache(
  drepId: string,
  entry: CachedDrepMetadataDoc
): Promise<void> {
  try {
    await idbPut(normalizeDrepMetadataCacheKey(drepId), entry);
  } catch (err) {
    console.warn('Failed to write DRep metadata doc cache', drepId, err);
  }
}

export async function countDrepMetadataDocCache(): Promise<number> {
  try {
    return await idbCount();
  } catch (err) {
    console.warn('Failed to count DRep metadata doc cache', err);
    return 0;
  }
}

export async function clearDrepMetadataDocCache(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.warn('Failed to clear DRep metadata doc cache', err);
  }
}
