import { drepVoteCacheKey } from './drepVotingHistoryCache';

describe('drepVotingHistoryCache keys', () => {
  it('builds compound DRep vote cache key', () => {
    expect(drepVoteCacheKey('drep1abc', 'tx#1')).toBe('drep1abc|tx#1');
  });

  it('trims DRep id in compound key', () => {
    expect(drepVoteCacheKey('  drep1abc  ', 'tx#1')).toBe('drep1abc|tx#1');
  });
});
