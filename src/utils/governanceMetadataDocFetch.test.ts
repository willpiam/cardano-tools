import { IPFS_GATEWAYS } from './ipfsGateways';
import {
  fetchGovernanceMetadataDocWithGatewayFallback,
  prefetchUncachedGovernanceMetadataDocs,
} from './governanceMetadataDocFetch';
import { formatMetadataPrefetchDescription } from './drepVotingHistoryRecacheHelpers';

jest.mock('./governanceMetadataDocCache', () => ({
  getGovernanceMetadataDocCache: jest.fn().mockResolvedValue(null),
  isGovernanceMetadataDocCacheHit: jest.fn().mockReturnValue(false),
  putGovernanceMetadataDocCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../functions/governanceActionsFetch', () => {
  const actual = jest.requireActual('../functions/governanceActionsFetch');
  return {
    ...actual,
    loadActionMetadataViaGateway: jest.fn(),
  };
});

import { loadActionMetadataViaGateway } from '../functions/governanceActionsFetch';

const mockLoadViaGateway = loadActionMetadataViaGateway as jest.MockedFunction<
  typeof loadActionMetadataViaGateway
>;

describe('formatMetadataPrefetchDescription', () => {
  it('formats progress without failures', () => {
    expect(formatMetadataPrefetchDescription(5, 23, 0)).toBe('Fetching metadata 5 of 23…');
  });

  it('appends failure count when present', () => {
    expect(formatMetadataPrefetchDescription(12, 47, 3)).toBe(
      'Fetching metadata 12 of 47… (3 failed)'
    );
  });
});

describe('fetchGovernanceMetadataDocWithGatewayFallback', () => {
  afterEach(() => {
    mockLoadViaGateway.mockReset();
  });

  it('returns on first successful gateway for IPFS anchors', async () => {
    mockLoadViaGateway
      .mockResolvedValueOnce({
        metadata: null,
        metadataError: {
          code: 'http_error',
          message: 'fail',
          retryable: true,
          source: 'step2',
        },
        rawPayload: null,
        fetchUrl: 'https://ipfs.io/ipfs/bafytest',
      })
      .mockResolvedValueOnce({
        metadata: {
          title: 'OK',
          abstract: null,
          motivation: null,
          rationale: null,
          references: [],
        },
        metadataError: null,
        rawPayload: { body: { title: 'OK' } },
        fetchUrl: 'https://cloudflare-ipfs.com/ipfs/bafytest',
      });

    const result = await fetchGovernanceMetadataDocWithGatewayFallback('ipfs://bafytest');

    expect(result.metadata?.title).toBe('OK');
    expect(mockLoadViaGateway).toHaveBeenCalledTimes(2);
    expect(mockLoadViaGateway.mock.calls[0][1]).toBe(IPFS_GATEWAYS[0]);
    expect(mockLoadViaGateway.mock.calls[1][1]).toBe(IPFS_GATEWAYS[1]);
  });

  it('stops after non-retryable error', async () => {
    mockLoadViaGateway.mockResolvedValue({
      metadata: null,
      metadataError: {
        code: 'schema_mismatch',
        message: 'bad schema',
        retryable: false,
        source: 'step2',
      },
      rawPayload: { foo: 'bar' },
      fetchUrl: 'https://ipfs.io/ipfs/bafytest',
    });

    await fetchGovernanceMetadataDocWithGatewayFallback('ipfs://bafytest');

    expect(mockLoadViaGateway).toHaveBeenCalledTimes(1);
  });

  it('uses a single fetch for non-IPFS URLs', async () => {
    mockLoadViaGateway.mockResolvedValue({
      metadata: {
        title: 'Direct',
        abstract: null,
        motivation: null,
        rationale: null,
        references: [],
      },
      metadataError: null,
      rawPayload: {},
      fetchUrl: 'https://example.com/meta.json',
    });

    await fetchGovernanceMetadataDocWithGatewayFallback('https://example.com/meta.json');

    expect(mockLoadViaGateway).toHaveBeenCalledTimes(1);
  });
});

describe('prefetchUncachedGovernanceMetadataDocs', () => {
  afterEach(() => {
    mockLoadViaGateway.mockReset();
  });

  it('reports progress counts for fetched and failed items', async () => {
    mockLoadViaGateway.mockImplementation(async (anchorUrl: string) => {
      if (anchorUrl === 'ipfs://a') {
        return {
          metadata: {
            title: 'A',
            abstract: null,
            motivation: null,
            rationale: null,
            references: [],
          },
          metadataError: null,
          rawPayload: {},
          fetchUrl: 'https://ipfs.io/ipfs/a',
        };
      }
      return {
        metadata: null,
        metadataError: {
          code: 'network_error',
          message: 'fail',
          retryable: true,
          source: 'step2',
        },
        rawPayload: null,
        fetchUrl: 'https://ipfs.io/ipfs/b',
      };
    });

    const progressSnapshots: Array<{ fetched: number; failed: number; current: number }> = [];

    const result = await prefetchUncachedGovernanceMetadataDocs(
      [
        { cacheKey: 'tx1#0', anchorUrl: 'ipfs://a' },
        { cacheKey: 'tx2#0', anchorUrl: 'ipfs://b' },
      ],
      {
        concurrency: 1,
        onProgress: (p) => {
          progressSnapshots.push({ fetched: p.fetched, failed: p.failed, current: p.current });
        },
      }
    );

    expect(result).toEqual({ fetched: 1, failed: 1, skipped: 0 });
    expect(progressSnapshots).toHaveLength(2);
    expect(progressSnapshots[1]).toEqual({ fetched: 1, failed: 1, current: 2 });
  });

  it('returns zero counts for empty input', async () => {
    const result = await prefetchUncachedGovernanceMetadataDocs([]);
    expect(result).toEqual({ fetched: 0, failed: 0, skipped: 0 });
    expect(mockLoadViaGateway).not.toHaveBeenCalled();
  });
});
