import { governanceMetadataDownloadFilename } from './governanceMetadataDownload';

describe('governanceMetadataDownloadFilename', () => {
  it('uses title with spaces replaced by dashes and .json extension', () => {
    expect(governanceMetadataDownloadFilename('Cardano Governance Voting', 'abc123…def')).toBe(
      'Cardano-Governance-Voting.json',
    );
  });

  it('trims whitespace from title before building filename', () => {
    expect(governanceMetadataDownloadFilename('  My Action  ', 'abc123…def')).toBe('My-Action.json');
  });

  it('falls back to proposal label when title is missing', () => {
    expect(governanceMetadataDownloadFilename(null, 'abc123…def')).toBe('abc123…def.json');
    expect(governanceMetadataDownloadFilename('', 'abc123…def')).toBe('abc123…def.json');
    expect(governanceMetadataDownloadFilename('   ', 'abc123…def')).toBe('abc123…def.json');
  });
});
