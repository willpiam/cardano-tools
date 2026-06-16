import type { CcVoteMetadata } from '../functions/cip136VoteMetadata';
import {
  ccVoteMetadataDocCacheKey,
  openDrepVotingHistoryDb,
  STORE_CC_VOTE_METADATA_DOCS,
} from './drepVotingHistoryCache';

export { ccVoteMetadataDocCacheKey };

export interface CachedCcVoteMetadataDoc {
  metadata: CcVoteMetadata | null;
  rawPayload: unknown;
  anchorUrl: string;
  hashHex?: string;
  cachedAtSec: number;
}

export function isCcVoteMetadataDocCacheHit(
  entry: CachedCcVoteMetadataDoc | null | undefined,
  anchorUrl: string
): entry is CachedCcVoteMetadataDoc {
  return entry != null && entry.anchorUrl === anchorUrl;
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTE_METADATA_DOCS, 'readonly');
        const request = tx.objectStore(STORE_CC_VOTE_METADATA_DOCS).get(key);
        tx.oncomplete = () => resolve(request.result as T | undefined);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
      })
  );
}

function idbPut(key: string, value: CachedCcVoteMetadataDoc): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTE_METADATA_DOCS, 'readwrite');
        tx.objectStore(STORE_CC_VOTE_METADATA_DOCS).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      })
  );
}

function idbCount(): Promise<number> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTE_METADATA_DOCS, 'readonly');
        const request = tx.objectStore(STORE_CC_VOTE_METADATA_DOCS).count();
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB count failed'));
      })
  );
}

function idbClear(): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTE_METADATA_DOCS, 'readwrite');
        tx.objectStore(STORE_CC_VOTE_METADATA_DOCS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
      })
  );
}

export async function getCcVoteMetadataDocCache(
  key: string
): Promise<CachedCcVoteMetadataDoc | null> {
  try {
    const entry = await idbGet<CachedCcVoteMetadataDoc>(key);
    return entry ?? null;
  } catch (err) {
    console.warn('Failed to read CC vote metadata doc cache', key, err);
    return null;
  }
}

export async function putCcVoteMetadataDocCache(
  key: string,
  entry: CachedCcVoteMetadataDoc
): Promise<void> {
  try {
    await idbPut(key, entry);
  } catch (err) {
    console.warn('Failed to write CC vote metadata doc cache', key, err);
  }
}

export async function countCcVoteMetadataDocCache(): Promise<number> {
  try {
    return await idbCount();
  } catch (err) {
    console.warn('Failed to count CC vote metadata doc cache', err);
    return 0;
  }
}

export async function clearCcVoteMetadataDocCache(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.warn('Failed to clear CC vote metadata doc cache', err);
  }
}
