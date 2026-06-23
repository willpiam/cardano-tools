import { TextEncoder } from 'util';
import { sha256HexFromBytes, uploadImageToPinata } from './pinataUpload';

Object.assign(global, { TextEncoder });

describe('sha256HexFromBytes', () => {
  it('returns lowercase hex digest', () => {
    const bytes = new TextEncoder().encode('hello');
    const hash = sha256HexFromBytes(bytes);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});

describe('uploadImageToPinata', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects unsupported mime types', async () => {
    const file = new File(['x'], 'test.txt', { type: 'text/plain' });
    await expect(uploadImageToPinata('jwt', file)).rejects.toThrow(/Unsupported image type/);
  });

  it('uploads image bytes and returns sha256', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { cid: 'bafytestimage' } }),
    }) as typeof fetch;

    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    const result = await uploadImageToPinata('test-jwt', file);

    expect(result.url).toBe('ipfs://bafytestimage');
    expect(result.sha256Hex).toMatch(/^[0-9a-f]{64}$/);
    expect(result.mimeType).toBe('image/png');
  });
});
