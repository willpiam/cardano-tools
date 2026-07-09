import {
  TREASURY_BALANCE_CACHE_MAX_AGE_SEC,
  isCacheFresh,
} from './treasuryBalanceCache';

describe('treasuryBalanceCache freshness', () => {
  it('treats entries younger than 24 hours as fresh', () => {
    const nowSec = 1_700_000_000;
    const cachedAtSec = nowSec - TREASURY_BALANCE_CACHE_MAX_AGE_SEC + 1;
    expect(isCacheFresh(cachedAtSec, nowSec)).toBe(true);
  });

  it('treats entries exactly 24 hours old as stale', () => {
    const nowSec = 1_700_000_000;
    const cachedAtSec = nowSec - TREASURY_BALANCE_CACHE_MAX_AGE_SEC;
    expect(isCacheFresh(cachedAtSec, nowSec)).toBe(false);
  });

  it('treats entries older than 24 hours as stale', () => {
    const nowSec = 1_700_000_000;
    const cachedAtSec = nowSec - TREASURY_BALANCE_CACHE_MAX_AGE_SEC - 60;
    expect(isCacheFresh(cachedAtSec, nowSec)).toBe(false);
  });
});
