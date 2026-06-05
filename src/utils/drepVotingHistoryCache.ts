import type { ProposalMetadataAnchorInfo } from '../functions/governanceActionsFetch';
import type { VoteAnchorStatus } from '../components/DRepVoteMetadataChart';
import type { BlockfrostProposalExpirationFields } from './governanceExpiration';

export const DREP_VOTING_HISTORY_DB_NAME = 'ctools-drep-voting-history';
export const DREP_VOTING_HISTORY_DB_VERSION = 2;

const STORE_PROPOSALS = 'proposals';
const STORE_DREP_VOTES = 'drepVotes';
export const STORE_METADATA_DOCS = 'metadataDocs';

export interface CachedProposalEnrichment {
  expiration: BlockfrostProposalExpirationFields;
  metadataAnchor: ProposalMetadataAnchorInfo;
  cachedAtSec: number;
}

export interface CachedVoteAnchorInfo {
  status: VoteAnchorStatus;
  url?: string;
  hashHex?: string;
}

export interface CachedDrepVoteEnrichment {
  vote: string;
  voteTxHash: string;
  voteAnchor: CachedVoteAnchorInfo;
  cachedAtSec: number;
}

function normalizeHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '').toLowerCase();
}

/** Same key format as vote anchor parsing (`txHash#certIndex`, normalized hex). */
export function proposalCacheKey(txHash: string, certIndex: number): string {
  return `${normalizeHex(txHash)}#${certIndex}`;
}

export function drepVoteCacheKey(drepId: string, proposalKey: string): string {
  return `${drepId.trim()}|${proposalKey}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DREP_VOTING_HISTORY_DB_NAME, DREP_VOTING_HISTORY_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROPOSALS)) {
        db.createObjectStore(STORE_PROPOSALS);
      }
      if (!db.objectStoreNames.contains(STORE_DREP_VOTES)) {
        db.createObjectStore(STORE_DREP_VOTES);
      }
      if (!db.objectStoreNames.contains(STORE_METADATA_DOCS)) {
        db.createObjectStore(STORE_METADATA_DOCS);
      }
    };
  });
}

/** Shared DB opener for DRep voting history caches (including metadata documents). */
export function openDrepVotingHistoryDb(): Promise<IDBDatabase> {
  return openDb();
}

function idbGetAll<T>(storeName: string): Promise<Map<string, T>> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        const keysRequest = store.getAllKeys();
        tx.oncomplete = () => {
          const values = request.result as T[];
          const keys = keysRequest.result as string[];
          const map = new Map<string, T>();
          for (let i = 0; i < keys.length; i++) {
            map.set(String(keys[i]), values[i]);
          }
          resolve(map);
        };
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
      })
  );
}

function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      })
  );
}

/** All cached proposal enrichments (global). */
export async function loadAllProposalCache(): Promise<Map<string, CachedProposalEnrichment>> {
  try {
    return await idbGetAll<CachedProposalEnrichment>(STORE_PROPOSALS);
  } catch (err) {
    console.warn('Failed to load proposal cache', err);
    return new Map();
  }
}

export async function putProposalCache(
  key: string,
  entry: CachedProposalEnrichment
): Promise<void> {
  try {
    await idbPut(STORE_PROPOSALS, key, entry);
  } catch (err) {
    console.warn('Failed to write proposal cache', key, err);
  }
}

export async function putProposalCacheBatch(
  entries: Map<string, CachedProposalEnrichment>
): Promise<void> {
  if (entries.size === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROPOSALS, 'readwrite');
      const store = tx.objectStore(STORE_PROPOSALS);
      for (const [key, value] of entries) {
        store.put(value, key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB batch write failed'));
    });
  } catch (err) {
    console.warn('Failed to batch-write proposal cache', err);
  }
}

/** Per-DRep vote enrichments for finalized actions. */
export async function loadDrepVoteCache(drepId: string): Promise<Map<string, CachedDrepVoteEnrichment>> {
  const prefix = `${drepId.trim()}|`;
  try {
    const all = await idbGetAll<CachedDrepVoteEnrichment>(STORE_DREP_VOTES);
    const map = new Map<string, CachedDrepVoteEnrichment>();
    for (const [compoundKey, value] of all) {
      if (!compoundKey.startsWith(prefix)) continue;
      const proposalKey = compoundKey.slice(prefix.length);
      map.set(proposalKey, value);
    }
    return map;
  } catch (err) {
    console.warn('Failed to load DRep vote cache', err);
    return new Map();
  }
}

export async function putDrepVoteCache(
  drepId: string,
  proposalKey: string,
  entry: CachedDrepVoteEnrichment
): Promise<void> {
  try {
    await idbPut(STORE_DREP_VOTES, drepVoteCacheKey(drepId, proposalKey), entry);
  } catch (err) {
    console.warn('Failed to write DRep vote cache', proposalKey, err);
  }
}

export async function putDrepVoteCacheBatch(
  drepId: string,
  entries: Map<string, CachedDrepVoteEnrichment>
): Promise<void> {
  if (entries.size === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DREP_VOTES, 'readwrite');
      const store = tx.objectStore(STORE_DREP_VOTES);
      for (const [proposalKey, value] of entries) {
        store.put(value, drepVoteCacheKey(drepId, proposalKey));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB batch write failed'));
    });
  } catch (err) {
    console.warn('Failed to batch-write DRep vote cache', err);
  }
}
