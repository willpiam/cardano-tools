import { blake2b_256 } from '@harmoniclabs/crypto';

/** Inline CIP-100 JSON-LD @context (matches standard vote-comment anchors). */
const CIP100_INLINE_CONTEXT = {
  CIP100: 'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0100/README.md#',
  hashAlgorithm: 'CIP100:hashAlgorithm',
  body: {
    '@id': 'CIP100:body',
    '@context': {
      references: {
        '@id': 'CIP100:references',
        '@container': '@set',
        '@context': {
          GovernanceMetadata: 'CIP100:GovernanceMetadataReference',
          Other: 'CIP100:OtherReference',
          label: 'CIP100:reference-label',
          uri: 'CIP100:reference-uri',
          referenceHash: {
            '@id': 'CIP100:referenceHash',
            '@context': {
              hashDigest: 'CIP100:hashDigest',
              hashAlgorithm: 'CIP100:hashAlgorithm',
            },
          },
        },
      },
      comment: 'CIP100:comment',
      externalUpdates: {
        '@id': 'CIP100:externalUpdates',
        '@context': {
          title: 'CIP100:update-title',
          uri: 'CIP100:uri',
        },
      },
    },
  },
  authors: {
    '@id': 'CIP100:authors',
    '@container': '@set',
    '@context': {
      name: 'http://xmlns.com/foaf/0.1/name',
      witness: {
        '@id': 'CIP100:witness',
        '@context': {
          witnessAlgorithm: 'CIP100:witnessAlgorithm',
          publicKey: 'CIP100:publicKey',
          signature: 'CIP100:signature',
        },
      },
    },
  },
} as const;

interface Cip100RationaleDocument {
  '@context': typeof CIP100_INLINE_CONTEXT;
  authors: [];
  body: {
    comment: string;
  };
  hashAlgorithm: 'blake2b-256';
}

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const buildCip100RationaleBytes = (rationale: string): Uint8Array => {
  const doc: Cip100RationaleDocument = {
    '@context': CIP100_INLINE_CONTEXT,
    authors: [],
    body: {
      comment: rationale,
    },
    hashAlgorithm: 'blake2b-256',
  };
  return new TextEncoder().encode(JSON.stringify(doc, null, 2));
};

export const hashGovernanceAnchorBytes = (bytes: Uint8Array): string =>
  bytesToHex(blake2b_256(bytes));

/** Parse UTF-8 bytes as a CIP-100 vote-comment document (for tests). */
export const parseCip100RationaleBytes = (bytes: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(bytes));
