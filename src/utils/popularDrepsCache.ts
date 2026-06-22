import type { PopularDrepRow } from '../functions/popularDrepsFetch';

export const POPULAR_DREPS_DB_NAME = 'ctools-popular-dreps';
export const POPULAR_DREPS_DB_VERSION = 1;

const STORE_PAGES = 'pages';

export interface PopularDrepsPageCacheParams {
  retired?: boolean;
  expired?: boolean;
  page: number;
  count: number;
}

export interface CachedPopularDrepsPage {
  rows: PopularDrepRow[];
  cachedAtSec: number;
}

export function popularDrepsPageCacheKey(params: PopularDrepsPageCacheParams): string {
  const retired = params.retired === undefined ? 'any' : String(params.retired);
  const expired = params.expired === undefined ? 'any' : String(params.expired);
  return `amount-desc|retired=${retired}|expired=${expired}|page=${params.page}|count=${params.count}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(POPULAR_DREPS_DB_NAME, POPULAR_DREPS_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        db.createObjectStore(STORE_PAGES);
      }
    };
  });
}

export async function getPopularDrepsPageCache(
  key: string
): Promise<CachedPopularDrepsPage | null> {
  try {
    const db = await openDb();
    const entry = await new Promise<CachedPopularDrepsPage | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readonly');
      const request = tx.objectStore(STORE_PAGES).get(key);
      tx.oncomplete = () => resolve(request.result as CachedPopularDrepsPage | undefined);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
    });
    return entry ?? null;
  } catch (err) {
    console.warn('Failed to read popular DReps page cache', key, err);
    return null;
  }
}

export async function putPopularDrepsPageCache(
  key: string,
  entry: CachedPopularDrepsPage
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readwrite');
      tx.objectStore(STORE_PAGES).put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    });
  } catch (err) {
    console.warn('Failed to write popular DReps page cache', key, err);
  }
}

export async function countPopularDrepsPageCache(): Promise<number> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readonly');
      const request = tx.objectStore(STORE_PAGES).count();
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB count failed'));
    });
  } catch (err) {
    console.warn('Failed to count popular DReps page cache', err);
    return 0;
  }
}

export async function clearPopularDrepsPageCache(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PAGES, 'readwrite');
      tx.objectStore(STORE_PAGES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
    });
  } catch (err) {
    console.warn('Failed to clear popular DReps page cache', err);
  }
}
