import { preprocessGovernanceMarkdown } from './governanceMarkdown';

describe('preprocessGovernanceMarkdown', () => {
  it('converts br tags to paragraph breaks', () => {
    expect(preprocessGovernanceMarkdown('Signed,<br/>William Doyle')).toBe(
      'Signed,\n\nWilliam Doyle'
    );
    expect(preprocessGovernanceMarkdown('Line one<br>Line two')).toBe(
      'Line one\n\nLine two'
    );
  });

  it('leaves standard markdown unchanged', () => {
    const md = '## Summary\n\n**Bold** and *italic*';
    expect(preprocessGovernanceMarkdown(md)).toBe(md);
  });
});
