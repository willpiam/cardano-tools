import {
  isDrepMetadataDocCacheHit,
  type CachedDrepMetadataDoc,
} from './drepMetadataDocCache';

const sampleEntry = (anchorUrl: string): CachedDrepMetadataDoc => ({
  metadata: {
    givenName: 'Test DRep',
    objectives: null,
    motivations: null,
    qualifications: null,
    paymentAddress: null,
    doNotList: null,
    image: null,
    references: [],
  },
  rawPayload: { body: { givenName: 'Test DRep' } },
  anchorUrl,
  cachedAtSec: 1_700_000_000,
});

describe('isDrepMetadataDocCacheHit', () => {
  it('returns true when anchor URL matches', () => {
    const entry = sampleEntry('https://example.com/drep.json');
    expect(isDrepMetadataDocCacheHit(entry, 'https://example.com/drep.json')).toBe(true);
  });

  it('returns true for absent sentinel with empty anchor', () => {
    const entry: CachedDrepMetadataDoc = {
      metadata: null,
      rawPayload: null,
      anchorUrl: '',
      cachedAtSec: 1_700_000_000,
    };
    expect(isDrepMetadataDocCacheHit(entry, '')).toBe(true);
  });

  it('returns false when anchor URL differs', () => {
    const entry = sampleEntry('https://example.com/drep.json');
    expect(isDrepMetadataDocCacheHit(entry, 'https://example.com/other.json')).toBe(false);
  });

  it('returns false for null or undefined entries', () => {
    expect(isDrepMetadataDocCacheHit(null, 'https://example.com/drep.json')).toBe(false);
    expect(isDrepMetadataDocCacheHit(undefined, 'https://example.com/drep.json')).toBe(false);
  });
});
