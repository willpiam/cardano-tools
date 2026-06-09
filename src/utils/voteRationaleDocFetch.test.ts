import { IPFS_GATEWAYS } from './ipfsGateways';
import {
  fetchVoteRationaleDocWithGatewayFallback,
  prefetchUncachedVoteRationaleDocs,
} from './voteRationaleDocFetch';
import { formatVoteRationalePrefetchDescription } from './drepVotingHistoryRecacheHelpers';

jest.mock('./voteRationaleDocCache', () => ({
  getVoteRationaleDocCache: jest.fn().mockResolvedValue(null),
  isVoteRationaleDocCacheHit: jest.fn().mockReturnValue(false),
  putVoteRationaleDocCache: jest.fn().mockResolvedValue(undefined),
}));

const originalFetch = global.fetch;

describe('formatVoteRationalePrefetchDescription', () => {
  it('formats progress without failures', () => {
    expect(formatVoteRationalePrefetchDescription(5, 23, 0)).toBe(
      'Fetching vote rationales 5 of 23…'
    );
  });

  it('appends failure count when present', () => {
    expect(formatVoteRationalePrefetchDescription(12, 47, 3)).toBe(
      'Fetching vote rationales 12 of 47… (3 failed)'
    );
  });
});

describe('fetchVoteRationaleDocWithGatewayFallback', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns on first successful gateway for IPFS anchors', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'server error',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ body: { comment: 'OK' } }),
      }) as typeof fetch;

    const result = await fetchVoteRationaleDocWithGatewayFallback('ipfs://bafytest');

    expect(result.metadata?.comment).toBe('OK');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const firstUrl = String((global.fetch as jest.Mock).mock.calls[0][0]);
    const secondUrl = String((global.fetch as jest.Mock).mock.calls[1][0]);
    expect(firstUrl).toContain(IPFS_GATEWAYS[0].buildUrl({ cid: 'bafytest', path: '', ipfsUri: 'ipfs://bafytest' }).split('/ipfs/')[0]);
    expect(secondUrl).not.toBe(firstUrl);
  });

  it('stops after non-retryable schema mismatch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ body: {} }),
    }) as typeof fetch;

    await fetchVoteRationaleDocWithGatewayFallback('ipfs://bafytest');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('parses legacy body.rationale', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ body: { rationale: 'Legacy text' } }),
    }) as typeof fetch;

    const result = await fetchVoteRationaleDocWithGatewayFallback('https://example.com/vote.json');

    expect(result.metadata?.comment).toBe('Legacy text');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('prefetchUncachedVoteRationaleDocs', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports progress counts for fetched and failed items', async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/a')) {
        return {
          ok: true,
          json: async () => ({ body: { comment: 'A' } }),
        };
      }
      return {
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      };
    }) as typeof fetch;

    const progressSnapshots: Array<{ fetched: number; failed: number; current: number }> = [];

    const result = await prefetchUncachedVoteRationaleDocs(
      [
        { cacheKey: 'drep1|tx1#0', anchorUrl: 'ipfs://a' },
        { cacheKey: 'drep1|tx2#0', anchorUrl: 'ipfs://b' },
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
    global.fetch = jest.fn() as typeof fetch;
    const result = await prefetchUncachedVoteRationaleDocs([]);
    expect(result).toEqual({ fetched: 0, failed: 0, skipped: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
