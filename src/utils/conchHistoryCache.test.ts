import { conchTxCacheKey } from './conchHistoryCache';
import { cip20MessageRowFromCache } from './cip20AssetHistory';

describe('conchHistoryCache keys', () => {
  it('normalizes tx hash to lowercase hex without 0x prefix', () => {
    expect(conchTxCacheKey('0xAbCdEf1234567890')).toBe('abcdef1234567890');
  });

  it('trims whitespace in tx hash', () => {
    expect(conchTxCacheKey('  abcdef  ')).toBe('abcdef');
  });
});

describe('cip20MessageRowFromCache', () => {
  it('builds a message row from cached entry', () => {
    const row = cip20MessageRowFromCache('abcdef1234567890', {
      blockTime: 1_700_000_000,
      hasCip20: true,
      message: 'hello conch',
      cachedAtSec: 1_700_000_100,
    });

    expect(row.tx).toBe('abcdef1234567890');
    expect(row.url).toBe('https://cardanoscan.io/transaction/abcdef1234567890');
    expect(row.message).toBe('hello conch');
    expect(row.timestamp).toBe(new Date(1_700_000_000 * 1000).toLocaleString());
  });
});
