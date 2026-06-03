export interface ParsedIpfsLink {
  cid: string;
  path: string;
  ipfsUri: string;
}

export interface IpfsGateway {
  name: string;
  buildUrl: (parsed: ParsedIpfsLink) => string;
}

/** Parse ipfs:// or common gateway URLs into CID + path + canonical ipfs:// URI. */
export function parseIpfsLink(url: string): ParsedIpfsLink | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('ipfs://')) {
    const rest = trimmed.slice('ipfs://'.length);
    const withoutPrefix = rest.startsWith('ipfs/') ? rest.slice('ipfs/'.length) : rest;
    const slash = withoutPrefix.indexOf('/');
    if (slash === -1) {
      const cid = withoutPrefix;
      if (!cid) return null;
      return { cid, path: '', ipfsUri: `ipfs://${cid}` };
    }
    const cid = withoutPrefix.slice(0, slash);
    const path = withoutPrefix.slice(slash);
    if (!cid) return null;
    return { cid, path, ipfsUri: `ipfs://${cid}${path}` };
  }

  try {
    const parsed = new URL(trimmed);
    const ipfsPath = parsed.pathname.match(/\/ipfs\/([^/]+)(\/.*)?$/);
    if (ipfsPath) {
      const cid = ipfsPath[1];
      const path = ipfsPath[2] ?? '';
      return { cid, path, ipfsUri: `ipfs://${cid}${path}` };
    }

    const subdomain = parsed.hostname.match(/^([^.]+)\.ipfs\.dweb\.link$/);
    if (subdomain) {
      const cid = subdomain[1];
      const path = parsed.pathname === '/' ? '' : parsed.pathname;
      return { cid, path, ipfsUri: `ipfs://${cid}${path}` };
    }
  } catch {
    return null;
  }

  return null;
}

export const IPFS_GATEWAYS: IpfsGateway[] = [
  {
    name: 'IPFS.io',
    buildUrl: ({ cid, path }) => `https://ipfs.io/ipfs/${cid}${path}`,
  },
  {
    name: 'Cloudflare',
    buildUrl: ({ cid, path }) => `https://cloudflare-ipfs.com/ipfs/${cid}${path}`,
  },
  {
    name: 'dweb.link',
    buildUrl: ({ cid, path }) => `https://${cid}.ipfs.dweb.link${path}`,
  },
  {
    name: 'Pinata',
    buildUrl: ({ cid, path }) => `https://gateway.pinata.cloud/ipfs/${cid}${path}`,
  },
  {
    name: 'w3s.link',
    buildUrl: ({ cid, path }) => `https://w3s.link/ipfs/${cid}${path}`,
  },
  {
    name: '4everland',
    buildUrl: ({ cid, path }) => `https://4everland.io/ipfs/${cid}${path}`,
  },
];
