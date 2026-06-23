export const BLOCKFROST_API_KEY_STORAGE_KEY = 'ctools:blockfrost-api-key';
export const BULK_VOTE_CONFIG_STORAGE_KEY = 'ctools:tool-config:bulk-vote';
export const DREP_METADATA_CONFIG_STORAGE_KEY = 'ctools:tool-config:drep-metadata';
export const DREP_HISTORY_CONFIG_STORAGE_KEY = 'ctools:tool-config:drep-history';

export interface BulkVoteAnchorConfig {
  attachAnchor: boolean;
  anchorUrl: string;
  anchorHashHex: string;
}

export interface BulkVoteToolConfig {
  pinataJwt?: string;
  anchor?: BulkVoteAnchorConfig;
  savedAtSec?: number;
}

export interface DRepMetadataToolConfig {
  pinataJwt?: string;
  savedAtSec?: number;
}

export interface DRepHistoryToolConfig {
  drepId?: string;
  savedAtSec?: number;
}

function storageAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

function readJson<T>(key: string): T | null {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write tool config to localStorage (${key})`, err);
  }
}

export function getBlockfrostApiKeyFromStorage(): string | null {
  if (!storageAvailable()) return null;
  try {
    const value = localStorage.getItem(BLOCKFROST_API_KEY_STORAGE_KEY);
    const trimmed = value?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function saveBlockfrostApiKeyToStorage(apiKey: string): void {
  if (!storageAvailable()) return;
  const trimmed = apiKey.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(BLOCKFROST_API_KEY_STORAGE_KEY, trimmed);
  } catch (err) {
    console.warn('Failed to save Blockfrost API key to localStorage', err);
  }
}

export function getBulkVoteConfigFromStorage(): BulkVoteToolConfig | null {
  return readJson<BulkVoteToolConfig>(BULK_VOTE_CONFIG_STORAGE_KEY);
}

export function saveBulkVoteConfigToStorage(partial: Partial<BulkVoteToolConfig>): void {
  const existing = getBulkVoteConfigFromStorage() ?? {};
  writeJson(BULK_VOTE_CONFIG_STORAGE_KEY, {
    ...existing,
    ...partial,
    savedAtSec: Math.floor(Date.now() / 1000),
  });
}

export function getDRepMetadataConfigFromStorage(): DRepMetadataToolConfig | null {
  return readJson<DRepMetadataToolConfig>(DREP_METADATA_CONFIG_STORAGE_KEY);
}

export function saveDRepMetadataConfigToStorage(partial: Partial<DRepMetadataToolConfig>): void {
  const existing = getDRepMetadataConfigFromStorage() ?? {};
  writeJson(DREP_METADATA_CONFIG_STORAGE_KEY, {
    ...existing,
    ...partial,
    savedAtSec: Math.floor(Date.now() / 1000),
  });
}

export function getDRepHistoryConfigFromStorage(): DRepHistoryToolConfig | null {
  return readJson<DRepHistoryToolConfig>(DREP_HISTORY_CONFIG_STORAGE_KEY);
}

export function saveDRepHistoryConfigToStorage(partial: Partial<DRepHistoryToolConfig>): void {
  const existing = getDRepHistoryConfigFromStorage() ?? {};
  writeJson(DREP_HISTORY_CONFIG_STORAGE_KEY, {
    ...existing,
    ...partial,
    savedAtSec: Math.floor(Date.now() / 1000),
  });
}

export function hasBlockfrostApiKeyInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('blockfrostApiKey');
}
