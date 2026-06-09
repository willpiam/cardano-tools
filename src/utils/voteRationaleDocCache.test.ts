import { drepVoteCacheKey } from './drepVotingHistoryCache';
import {
  isVoteRationaleDocCacheHit,
  type CachedVoteRationaleDoc,
} from './voteRationaleDocCache';

const sampleEntry = (anchorUrl: string): CachedVoteRationaleDoc => ({
  metadata: { comment: 'Voting YES because…' },
  rawPayload: { body: { comment: 'Voting YES because…' } },
  anchorUrl,
  cachedAtSec: 1_700_000_000,
});

describe('drepVoteCacheKey reuse', () => {
  it('builds compound keys for vote rationale docs', () => {
    expect(drepVoteCacheKey('drep1abc', 'txhash#0')).toBe('drep1abc|txhash#0');
  });
});

describe('isVoteRationaleDocCacheHit', () => {
  it('returns true when anchor URL matches', () => {
    const entry = sampleEntry('ipfs://bafyvote');
    expect(isVoteRationaleDocCacheHit(entry, 'ipfs://bafyvote')).toBe(true);
  });

  it('returns false when anchor URL differs', () => {
    const entry = sampleEntry('ipfs://bafyvote');
    expect(isVoteRationaleDocCacheHit(entry, 'ipfs://bafyother')).toBe(false);
  });

  it('returns false for null or undefined entries', () => {
    expect(isVoteRationaleDocCacheHit(null, 'ipfs://bafyvote')).toBe(false);
    expect(isVoteRationaleDocCacheHit(undefined, 'ipfs://bafyvote')).toBe(false);
  });
});
