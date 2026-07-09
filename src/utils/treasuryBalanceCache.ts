export const TREASURY_BALANCE_CACHE_MAX_AGE_SEC = 24 * 60 * 60;

const TREASURY_BALANCE_STORAGE_KEY = 'ctools:treasury-balance-cache';
const ADA_USD_PRICE_STORAGE_KEY = 'ctools:ada-usd-price-cache';

export interface CachedTreasuryBalance {
  treasuryLovelace: string;
  cachedAtSec: number;
}

export interface CachedAdaUsdPrice {
  usd: number;
  cachedAtSec: number;
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
    console.warn(`Failed to write treasury cache (${key})`, err);
  }
}

export function isCacheFresh(
  cachedAtSec: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  return nowSec - cachedAtSec < TREASURY_BALANCE_CACHE_MAX_AGE_SEC;
}

export function getCachedTreasuryBalance(): CachedTreasuryBalance | null {
  const entry = readJson<CachedTreasuryBalance>(TREASURY_BALANCE_STORAGE_KEY);
  if (!entry || typeof entry.treasuryLovelace !== 'string' || typeof entry.cachedAtSec !== 'number') {
    return null;
  }
  return entry;
}

export function putCachedTreasuryBalance(treasuryLovelace: bigint): void {
  writeJson(TREASURY_BALANCE_STORAGE_KEY, {
    treasuryLovelace: treasuryLovelace.toString(),
    cachedAtSec: Math.floor(Date.now() / 1000),
  } satisfies CachedTreasuryBalance);
}

export function getCachedAdaUsdPrice(): CachedAdaUsdPrice | null {
  const entry = readJson<CachedAdaUsdPrice>(ADA_USD_PRICE_STORAGE_KEY);
  if (
    !entry ||
    typeof entry.usd !== 'number' ||
    !Number.isFinite(entry.usd) ||
    entry.usd <= 0 ||
    typeof entry.cachedAtSec !== 'number'
  ) {
    return null;
  }
  return entry;
}

export function putCachedAdaUsdPrice(usd: number): void {
  writeJson(ADA_USD_PRICE_STORAGE_KEY, {
    usd,
    cachedAtSec: Math.floor(Date.now() / 1000),
  } satisfies CachedAdaUsdPrice);
}
