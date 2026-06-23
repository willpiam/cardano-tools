import { TextDecoder, TextEncoder } from 'util';
import {
  buildCip119MetadataBytes,
  hashGovernanceAnchorBytes,
  validateCip119Form,
} from './cip119MetadataDocument';
import { parseCip119Metadata } from './drepMetadata';

Object.assign(global, { TextEncoder, TextDecoder });

describe('validateCip119Form', () => {
  it('requires givenName', () => {
    const errors = validateCip119Form({ givenName: '' });
    expect(errors.some((e) => e.field === 'givenName')).toBe(true);
  });

  it('enforces givenName length limit', () => {
    const errors = validateCip119Form({ givenName: 'x'.repeat(81) });
    expect(errors.some((e) => e.field === 'givenName')).toBe(true);
  });

  it('enforces narrative length limits', () => {
    const errors = validateCip119Form({
      givenName: 'Test',
      objectives: 'x'.repeat(1001),
    });
    expect(errors.some((e) => e.field === 'objectives')).toBe(true);
  });

  it('requires both label and uri on references', () => {
    const errors = validateCip119Form({
      givenName: 'Test',
      references: [{ type: 'Link', label: 'Site', uri: '' }],
    });
    expect(errors.some((e) => e.field.startsWith('references'))).toBe(true);
  });
});

describe('buildCip119MetadataBytes', () => {
  it('builds a document that round-trips through parseCip119Metadata', () => {
    const fields = {
      givenName: 'Ryan Williams',
      objectives: 'Buy myself an island.',
      motivations: 'I really would like to own an island.',
      qualifications: 'I have my 100m swimming badge.',
      paymentAddress:
        'addr1q86dnpkva4mm859c8ur7tjxn57zgsu6vg8pdetkdve3fsacnq7twy06u2ev5759vutpjgzfryx0ud8hzedhzerava35qwh3x34',
      imageContentUrl: 'https://avatars.githubusercontent.com/u/44342099?v=4',
      imageSha256: '2a21e4f7b20c8c72f573707b068fb8fc6d8c64d5035c4e18ecae287947fe2b2e',
      references: [
        { type: 'Other', label: 'A cool island for Ryan', uri: 'https://example.com/island' },
        { type: 'Link', label: "Ryan's Twitter", uri: 'https://twitter.com/Ryun1_' },
      ],
    };

    const bytes = buildCip119MetadataBytes(fields);
    const json = JSON.parse(new TextDecoder().decode(bytes));

    expect(json.hashAlgorithm).toBe('blake2b-256');
    expect(json.authors).toEqual([]);
    expect(json['@context'].CIP119).toContain('CIP-0119');

    const parsed = parseCip119Metadata(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.givenName).toBe('Ryan Williams');
    expect(parsed!.objectives).toBe('Buy myself an island.');
    expect(parsed!.references).toHaveLength(2);
    expect(parsed!.image?.sha256).toBe(
      '2a21e4f7b20c8c72f573707b068fb8fc6d8c64d5035c4e18ecae287947fe2b2e'
    );
  });

  it('produces a stable blake2b-256 hash', () => {
    const bytes = buildCip119MetadataBytes({ givenName: 'Test DRep' });
    const hash = hashGovernanceAnchorBytes(bytes);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashGovernanceAnchorBytes(bytes)).toBe(hash);
  });
});
