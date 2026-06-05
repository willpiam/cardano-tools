export const CONCH_HISTORY_DB_NAME = 'ctools-conch-history';
export const CONCH_HISTORY_DB_VERSION = 1;

const STORE_TRANSACTIONS = 'transactions';

export interface CachedConchTx {
  blockTime: number;
  hasCip20: boolean;
  message: string;
  cachedAtSec: number;
}

function normalizeHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '').toLowerCase();
}

export function conchTxCacheKey(txHash: string): string {
  return normalizeHex(txHash);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(CONCH_HISTORY_DB_NAME, CONCH_HISTORY_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        db.createObjectStore(STORE_TRANSACTIONS);
      }
    };
  });
}

export async function getConchTxCacheBatch(
  txHashes: string[]
): Promise<Map<string, CachedConchTx>> {
  const map = new Map<string, CachedConchTx>();
  if (txHashes.length === 0) return map;

  try {
    const db = await openDb();
    const keys = txHashes.map(conchTxCacheKey);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORE_TRANSACTIONS);
      let pending = keys.length;

      for (const key of keys) {
        const request = store.get(key);
        request.onsuccess = () => {
          if (request.result) {
            map.set(key, request.result as CachedConchTx);
          }
          pending--;
          if (pending === 0) resolve();
        };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
      }

      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
    });
  } catch (err) {
    console.warn('Failed to read Conch tx cache batch', err);
  }

  return map;
}

export async function putConchTxCacheBatch(entries: Map<string, CachedConchTx>): Promise<void> {
  if (entries.size === 0) return;

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
      const store = tx.objectStore(STORE_TRANSACTIONS);
      for (const [txHash, value] of entries) {
        store.put(value, conchTxCacheKey(txHash));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB batch write failed'));
    });
  } catch (err) {
    console.warn('Failed to batch-write Conch tx cache', err);
  }
}

export async function countConchTxCache(): Promise<number> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
      const request = tx.objectStore(STORE_TRANSACTIONS).count();
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB count failed'));
    });
  } catch (err) {
    console.warn('Failed to count Conch tx cache', err);
    return 0;
  }
}

export async function clearConchTxCache(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
      tx.objectStore(STORE_TRANSACTIONS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
    });
  } catch (err) {
    console.warn('Failed to clear Conch tx cache', err);
  }
}
