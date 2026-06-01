import { blake2b_256 } from '@harmoniclabs/crypto';

interface Cip100RationaleDocument {
  hashAlgorithm: 'blake2b-256';
  body: {
    rationale: string;
  };
}

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const buildCip100RationaleBytes = (rationale: string): Uint8Array => {
  const doc: Cip100RationaleDocument = {
    hashAlgorithm: 'blake2b-256',
    body: {
      rationale,
    },
  };
  return new TextEncoder().encode(JSON.stringify(doc));
};

export const hashGovernanceAnchorBytes = (bytes: Uint8Array): string =>
  bytesToHex(blake2b_256(bytes));
