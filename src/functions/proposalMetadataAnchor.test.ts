import { resolveProposalMetadataAnchorInfo } from './governanceActionsFetch';

describe('resolveProposalMetadataAnchorInfo', () => {
  it('prefers Blockfrost metadata endpoint over governance_description', () => {
    const resolved = resolveProposalMetadataAnchorInfo(
      { url: 'ipfs://bafyproposal', hashHex: 'abc123' },
      { constitution: { url: 'ipfs://bafyconstitution', data_hash: 'def456' } }
    );
    expect(resolved).toEqual({
      status: 'present',
      url: 'ipfs://bafyproposal',
      hashHex: 'abc123',
    });
  });

  it('falls back to constitution anchor in governance_description', () => {
    const resolved = resolveProposalMetadataAnchorInfo(null, {
      constitution: { url: 'ipfs://bafyconstitution', data_hash: 'def456' },
    });
    expect(resolved.status).toBe('present');
    expect(resolved.url).toBe('ipfs://bafyconstitution');
    expect(resolved.hashHex).toBe('def456');
  });

  it('returns absent when no anchor is found', () => {
    const resolved = resolveProposalMetadataAnchorInfo(null, { tag: 'InfoAction' });
    expect(resolved).toEqual({ status: 'absent' });
  });
});
