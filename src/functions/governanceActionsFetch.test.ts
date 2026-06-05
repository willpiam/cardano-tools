import { IPFS_GATEWAYS } from '../utils/ipfsGateways';
import {
  loadActionMetadataViaGateway,
  resolveMetadataFetchUrl,
} from './governanceActionsFetch';

describe('resolveMetadataFetchUrl', () => {
  it('builds gateway URL for ipfs:// anchors', () => {
    const anchor = 'ipfs://bafytest/metadata.json';
    const fetchUrl = resolveMetadataFetchUrl(anchor, IPFS_GATEWAYS[0]);
    expect(fetchUrl).toBe('https://ipfs.io/ipfs/bafytest/metadata.json');
  });

  it('passes through non-IPFS URLs unchanged', () => {
    const anchor = 'https://example.com/metadata.json';
    const fetchUrl = resolveMetadataFetchUrl(anchor, IPFS_GATEWAYS[0]);
    expect(fetchUrl).toBe(anchor);
  });
});

describe('loadActionMetadataViaGateway', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses CIP-108 metadata on success', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            body: {
              title: 'Test action',
              abstract: 'Short summary',
            },
          }),
      })
    ) as jest.Mock;

    const result = await loadActionMetadataViaGateway('ipfs://bafytest', IPFS_GATEWAYS[0]);

    expect(result.fetchUrl).toBe('https://ipfs.io/ipfs/bafytest');
    expect(result.metadataError).toBeNull();
    expect(result.metadata).toEqual({
      title: 'Test action',
      abstract: 'Short summary',
      motivation: null,
      rationale: null,
      references: [],
    });
    expect(result.rawPayload).toEqual({
      body: {
        title: 'Test action',
        abstract: 'Short summary',
      },
    });
  });

  it('returns retryable error on HTTP 500', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('server error'),
      })
    ) as jest.Mock;

    const result = await loadActionMetadataViaGateway('ipfs://bafytest', IPFS_GATEWAYS[1]);

    expect(result.metadata).toBeNull();
    expect(result.metadataError).toMatchObject({
      code: 'http_error',
      statusCode: 500,
      retryable: true,
    });
  });
});
