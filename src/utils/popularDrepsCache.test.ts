import { popularDrepsPageCacheKey } from './popularDrepsCache';

describe('popularDrepsPageCacheKey', () => {
  it('is stable for the same filter and page params', () => {
    const params = { retired: false, expired: false, page: 1, count: 50 };
    expect(popularDrepsPageCacheKey(params)).toBe(popularDrepsPageCacheKey(params));
  });

  it('encodes retired and expired filters', () => {
    expect(popularDrepsPageCacheKey({ retired: false, expired: false, page: 2, count: 50 })).toBe(
      'amount-desc|retired=false|expired=false|page=2|count=50'
    );
    expect(popularDrepsPageCacheKey({ page: 1, count: 25 })).toBe(
      'amount-desc|retired=any|expired=any|page=1|count=25'
    );
  });
});
