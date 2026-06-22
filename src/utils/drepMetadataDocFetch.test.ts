import { IPFS_GATEWAYS } from './ipfsGateways';
import {
  ensureDrepMetadataDocCached,
  fetchDrepMetadataDocWithGatewayFallback,
  fetchDrepMetadataFromBlockfrost,
  seedDrepMetadataDocFromListItem,
} from './drepMetadataDocFetch';

jest.mock('./drepMetadataDocCache', () => ({
  getDrepMetadataDocCache: jest.fn().mockResolvedValue(null),
  isDrepMetadataDocCacheHit: jest.fn().mockReturnValue(false),
  putDrepMetadataDocCache: jest.fn().mockResolvedValue(undefined),
}));

import {
  getDrepMetadataDocCache,
  isDrepMetadataDocCacheHit,
  putDrepMetadataDocCache,
} from './drepMetadataDocCache';

const mockGetCache = getDrepMetadataDocCache as jest.MockedFunction<typeof getDrepMetadataDocCache>;
const mockIsHit = isDrepMetadataDocCacheHit as jest.MockedFunction<typeof isDrepMetadataDocCacheHit>;
const mockPutCache = putDrepMetadataDocCache as jest.MockedFunction<typeof putDrepMetadataDocCache>;

const sampleDrepDoc = {
  body: {
    givenName: 'Test DRep',
    objectives: 'Serve the community',
  },
};

describe('fetchDrepMetadataFromBlockfrost', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns parsed Blockfrost response on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        drep_id: 'drep1abc',
        hex: 'abc',
        url: 'https://example.com/drep.json',
        hash: 'deadbeef',
        json_metadata: sampleDrepDoc,
        bytes: null,
      }),
    } as Response);

    const result = await fetchDrepMetadataFromBlockfrost('test-key', 'drep1abc');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response.json_metadata).toEqual(sampleDrepDoc);
    }
  });
});

describe('fetchDrepMetadataDocWithGatewayFallback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns on first successful gateway for IPFS anchors', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'error',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleDrepDoc,
      } as Response);

    const result = await fetchDrepMetadataDocWithGatewayFallback('ipfs://bafytest');

    expect(result.metadata?.givenName).toBe('Test DRep');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      IPFS_GATEWAYS[0].buildUrl({ cid: 'bafytest', path: '' })
    );
  });
});

describe('ensureDrepMetadataDocCached', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockGetCache.mockReset();
    mockPutCache.mockReset();
    mockGetCache.mockResolvedValue(null);
  });

  it('returns cached entry without calling Blockfrost and re-parses rawPayload', async () => {
    mockGetCache.mockResolvedValue({
      metadata: {
        givenName: null,
        objectives: null,
        motivations: null,
        qualifications: null,
        paymentAddress: null,
        doNotList: null,
        image: null,
        references: [],
      },
      rawPayload: sampleDrepDoc,
      anchorUrl: 'https://example.com/drep.json',
      cachedAtSec: 1,
    });

    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await ensureDrepMetadataDocCached({
      drepId: 'drep1abc',
      apiKey: 'test-key',
    });

    expect(result.outcome).toBe('cached');
    expect(result.metadata?.givenName).toBe('Test DRep');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('caches absent metadata when Blockfrost returns no anchor', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        drep_id: 'drep1abc',
        hex: 'abc',
        url: '',
        hash: '',
        json_metadata: null,
        bytes: null,
      }),
    } as Response);

    const result = await ensureDrepMetadataDocCached({
      drepId: 'drep1abc',
      apiKey: 'test-key',
    });

    expect(result.outcome).toBe('absent');
    expect(mockPutCache).toHaveBeenCalledWith(
      'drep1abc',
      expect.objectContaining({ metadata: null, anchorUrl: '' })
    );
  });

  it('persists Blockfrost json_metadata when parseable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        drep_id: 'drep1abc',
        hex: 'abc',
        url: 'https://example.com/drep.json',
        hash: 'deadbeef',
        json_metadata: sampleDrepDoc,
        bytes: null,
      }),
    } as Response);

    const result = await ensureDrepMetadataDocCached({
      drepId: 'drep1abc',
      apiKey: 'test-key',
    });

    expect(result.outcome).toBe('fetched');
    expect(result.metadata?.givenName).toBe('Test DRep');
    expect(mockPutCache).toHaveBeenCalled();
  });
});

describe('seedDrepMetadataDocFromListItem', () => {
  afterEach(() => {
    mockGetCache.mockReset();
    mockPutCache.mockReset();
    mockIsHit.mockReset();
    mockGetCache.mockResolvedValue(null);
    mockIsHit.mockReturnValue(false);
  });

  it('skips write when cache already matches anchor', async () => {
    const existing = {
      metadata: null,
      rawPayload: sampleDrepDoc,
      anchorUrl: 'https://example.com/drep.json',
      cachedAtSec: 1,
    };
    mockGetCache.mockResolvedValue(existing);
    mockIsHit.mockReturnValue(true);

    const wrote = await seedDrepMetadataDocFromListItem('drep1abc', {
      url: 'https://example.com/drep.json',
      hash: 'deadbeef',
      json_metadata: { body: { givenName: 'New' } },
    });

    expect(wrote).toBe(false);
    expect(mockPutCache).not.toHaveBeenCalled();
  });

  it('writes parsed metadata when anchor is new', async () => {
    const wrote = await seedDrepMetadataDocFromListItem('drep1abc', {
      url: 'https://example.com/drep.json',
      hash: 'deadbeef',
      json_metadata: sampleDrepDoc,
    });

    expect(wrote).toBe(true);
    expect(mockPutCache).toHaveBeenCalledWith(
      'drep1abc',
      expect.objectContaining({
        anchorUrl: 'https://example.com/drep.json',
        metadata: expect.objectContaining({ givenName: 'Test DRep' }),
      })
    );
  });
});
