import { proposalCacheKey } from './drepVotingHistoryCache';
import {
  isGovernanceMetadataDocCacheHit,
  type CachedGovernanceMetadataDoc,
} from './governanceMetadataDocCache';

const sampleEntry = (anchorUrl: string): CachedGovernanceMetadataDoc => ({
  metadata: {
    title: 'Test',
    abstract: 'Summary',
    motivation: null,
    rationale: null,
    references: [],
  },
  rawPayload: { body: { title: 'Test', abstract: 'Summary' } },
  anchorUrl,
  cachedAtSec: 1_700_000_000,
});

describe('proposalCacheKey reuse', () => {
  it('normalizes tx hash for metadata doc keys', () => {
    expect(proposalCacheKey('0xAbCd1234', 2)).toBe('abcd1234#2');
  });
});

describe('isGovernanceMetadataDocCacheHit', () => {
  it('returns true when anchor URL matches', () => {
    const entry = sampleEntry('ipfs://bafytest');
    expect(isGovernanceMetadataDocCacheHit(entry, 'ipfs://bafytest')).toBe(true);
  });

  it('returns false when anchor URL differs', () => {
    const entry = sampleEntry('ipfs://bafytest');
    expect(isGovernanceMetadataDocCacheHit(entry, 'ipfs://bafyother')).toBe(false);
  });

  it('returns false for null or undefined entries', () => {
    expect(isGovernanceMetadataDocCacheHit(null, 'ipfs://bafytest')).toBe(false);
    expect(isGovernanceMetadataDocCacheHit(undefined, 'ipfs://bafytest')).toBe(false);
  });
});
