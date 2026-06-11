import { drepMetadataDownloadFilename, parseCip119Metadata } from './drepMetadata';

const blockfrostExample = {
  '@context': {
    CIP100: 'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0100/README.md#',
    CIP119: 'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0119/README.md#',
    hashAlgorithm: 'CIP100:hashAlgorithm',
    body: {
      '@id': 'CIP119:body',
      '@context': {
        references: {
          '@id': 'CIP119:references',
          '@container': '@set',
        },
        paymentAddress: 'CIP119:paymentAddress',
        givenName: 'CIP119:givenName',
        image: { '@id': 'CIP119:image' },
        objectives: 'CIP119:objectives',
        motivations: 'CIP119:motivations',
        qualifications: 'CIP119:qualifications',
      },
    },
  },
  hashAlgorithm: 'blake2b-256',
  body: {
    paymentAddress:
      'addr1q86dnpkva4mm859c8ur7tjxn57zgsu6vg8pdetkdve3fsacnq7twy06u2ev5759vutpjgzfryx0ud8hzedhzerava35qwh3x34',
    givenName: 'Ryan Williams',
    image: {
      '@type': 'ImageObject',
      contentUrl: 'https://avatars.githubusercontent.com/u/44342099?v=4',
      sha256: '2a21e4f7b20c8c72f573707b068fb8fc6d8c64d5035c4e18ecae287947fe2b2e',
    },
    objectives: 'Buy myself an island.',
    motivations: 'I really would like to own an island.',
    qualifications: 'I have my 100m swimming badge.',
    references: [
      { '@type': 'Other', label: 'A cool island for Ryan', uri: 'https://example.com/island' },
      { '@type': 'Link', label: "Ryan's Twitter", uri: 'https://twitter.com/Ryun1_' },
    ],
  },
};

describe('parseCip119Metadata', () => {
  it('parses Blockfrost OpenAPI example document', () => {
    const parsed = parseCip119Metadata(blockfrostExample);
    expect(parsed).not.toBeNull();
    expect(parsed!.givenName).toBe('Ryan Williams');
    expect(parsed!.objectives).toBe('Buy myself an island.');
    expect(parsed!.image?.contentUrl).toContain('avatars.githubusercontent.com');
    expect(parsed!.references).toHaveLength(2);
    expect(parsed!.references[1].type).toBe('Link');
  });

  it('parses references from @set container', () => {
    const parsed = parseCip119Metadata({
      body: {
        givenName: 'Test DRep',
        references: {
          '@set': [{ '@type': 'Identity', label: 'ID page', uri: 'https://example.com/id' }],
        },
      },
    });
    expect(parsed?.references).toEqual([
      { type: 'Identity', label: 'ID page', uri: 'https://example.com/id' },
    ]);
  });

  it('returns null when no recognizable CIP-119 content', () => {
    expect(parseCip119Metadata({ body: {} })).toBeNull();
    expect(parseCip119Metadata(null)).toBeNull();
  });

  it('accepts partial metadata without givenName', () => {
    const parsed = parseCip119Metadata({ body: { objectives: 'Serve the community' } });
    expect(parsed?.givenName).toBeNull();
    expect(parsed?.objectives).toBe('Serve the community');
  });

  it('unwraps JSON-LD @value wrappers on body fields and references', () => {
    const parsed = parseCip119Metadata({
      body: {
        doNotList: false,
        givenName: { '@value': 'William Doyle' },
        objectives: { '@value': 'Ensure Cardano is viable for generations to come' },
        motivations: {
          '@value':
            "Fatherhood: work towards ensuring Cardano's success in its mission.",
        },
        qualifications: { '@value': 'Blockchain domain expert' },
        paymentAddress: {
          '@value':
            'addr1qx52mlvjf93n77lsz79pn8kl80zw7pcmgqusfn747fe768g8y7a8ud59kv677q7metm2gwh9vkwnakyxwlwlkd5369xqtxleh7',
        },
        references: [
          {
            '@type': 'Link',
            label: { '@value': 'Personal Site' },
            uri: { '@value': 'https://projects.williamdoyle.ca/' },
          },
          {
            '@type': 'Link',
            label: { '@value': 'Twitter' },
            uri: { '@value': 'https://x.com/william00000010' },
          },
        ],
      },
    });

    expect(parsed?.givenName).toBe('William Doyle');
    expect(parsed?.objectives).toBe('Ensure Cardano is viable for generations to come');
    expect(parsed?.doNotList).toBe(false);
    expect(parsed?.references).toHaveLength(2);
    expect(parsed?.references[0]).toEqual({
      type: 'Link',
      label: 'Personal Site',
      uri: 'https://projects.williamdoyle.ca/',
    });
  });
});

describe('drepMetadataDownloadFilename', () => {
  it('uses givenName with spaces replaced by dashes', () => {
    expect(drepMetadataDownloadFilename('Ryan Williams', 'drep1abc')).toBe('Ryan-Williams.json');
  });

  it('falls back to drepId when givenName is missing', () => {
    expect(drepMetadataDownloadFilename(null, 'drep1abc')).toBe('drep1abc.json');
  });
});
