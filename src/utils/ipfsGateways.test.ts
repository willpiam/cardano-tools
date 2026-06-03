import { IPFS_GATEWAYS, parseIpfsLink } from './ipfsGateways';

describe('parseIpfsLink', () => {
  it('parses ipfs:// CID', () => {
    const parsed = parseIpfsLink('ipfs://bafybeigdyrzt5sfp7udm7uh3od27');
    expect(parsed).toEqual({
      cid: 'bafybeigdyrzt5sfp7udm7uh3od27',
      path: '',
      ipfsUri: 'ipfs://bafybeigdyrzt5sfp7udm7uh3od27',
    });
  });

  it('parses ipfs:// with path', () => {
    const parsed = parseIpfsLink('ipfs://bafytest/metadata.json');
    expect(parsed?.cid).toBe('bafytest');
    expect(parsed?.path).toBe('/metadata.json');
    expect(parsed?.ipfsUri).toBe('ipfs://bafytest/metadata.json');
  });

  it('parses https gateway path', () => {
    const parsed = parseIpfsLink('https://ipfs.io/ipfs/QmTest/doc.json');
    expect(parsed?.ipfsUri).toBe('ipfs://QmTest/doc.json');
  });

  it('builds gateway URLs', () => {
    const parsed = parseIpfsLink('ipfs://bafytest')!;
    expect(IPFS_GATEWAYS[0].buildUrl(parsed)).toBe('https://ipfs.io/ipfs/bafytest');
    expect(IPFS_GATEWAYS[2].buildUrl(parsed)).toBe('https://bafytest.ipfs.dweb.link');
  });
});
