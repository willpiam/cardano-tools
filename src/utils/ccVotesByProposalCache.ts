import { openDrepVotingHistoryDb, STORE_CC_VOTES_BY_PROPOSAL } from './drepVotingHistoryCache';

export interface CcVoteForProposal {
  voteTxHash: string;
  voterHotId: string;
  vote: string;
  metadataUrl: string | null;
  metadataHash: string | null;
  blockTime?: number;
}

export interface CachedCcVotesByProposal {
  votes: CcVoteForProposal[];
  cachedAtSec: number;
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTES_BY_PROPOSAL, 'readonly');
        const request = tx.objectStore(STORE_CC_VOTES_BY_PROPOSAL).get(key);
        tx.oncomplete = () => resolve(request.result as T | undefined);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'));
      })
  );
}

function idbPut(key: string, value: CachedCcVotesByProposal): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTES_BY_PROPOSAL, 'readwrite');
        tx.objectStore(STORE_CC_VOTES_BY_PROPOSAL).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      })
  );
}

function idbCount(): Promise<number> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTES_BY_PROPOSAL, 'readonly');
        const request = tx.objectStore(STORE_CC_VOTES_BY_PROPOSAL).count();
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB count failed'));
      })
  );
}

function idbClear(): Promise<void> {
  return openDrepVotingHistoryDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_CC_VOTES_BY_PROPOSAL, 'readwrite');
        tx.objectStore(STORE_CC_VOTES_BY_PROPOSAL).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
      })
  );
}

export async function getCcVotesByProposalCache(
  proposalKey: string
): Promise<CachedCcVotesByProposal | null> {
  try {
    const entry = await idbGet<CachedCcVotesByProposal>(proposalKey);
    return entry ?? null;
  } catch (err) {
    console.warn('Failed to read CC votes by proposal cache', proposalKey, err);
    return null;
  }
}

export async function putCcVotesByProposalCache(
  proposalKey: string,
  entry: CachedCcVotesByProposal
): Promise<void> {
  try {
    await idbPut(proposalKey, entry);
  } catch (err) {
    console.warn('Failed to write CC votes by proposal cache', proposalKey, err);
  }
}

export async function countCcVotesByProposalCache(): Promise<number> {
  try {
    return await idbCount();
  } catch (err) {
    console.warn('Failed to count CC votes by proposal cache', err);
    return 0;
  }
}

export async function clearCcVotesByProposalCache(): Promise<void> {
  try {
    await idbClear();
  } catch (err) {
    console.warn('Failed to clear CC votes by proposal cache', err);
  }
}
