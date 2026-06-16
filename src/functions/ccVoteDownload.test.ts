import { buildCcVoteDownloadBundle, ccVoteDownloadFilename } from './ccVoteDownload';

describe('ccVoteDownloadFilename', () => {
  it('strips cc_hot1 prefix and uses proposal label', () => {
    expect(
      ccVoteDownloadFilename(
        'cc_hot1qf4xq9mlra5j68w8zjz2lvf3kc3rtsdtu98ka7zx4u6jvqyy39ww0',
        'abc123…def'
      )
    ).toBe('cc-vote-qf4xq9mlra5j-abc123…def.json');
  });

  it('falls back to member when voter id is empty', () => {
    expect(ccVoteDownloadFilename('', 'abc123…def')).toBe('cc-vote-member-abc123…def.json');
  });
});

describe('buildCcVoteDownloadBundle', () => {
  it('bundles on-chain vote and metadata', () => {
    const bundle = buildCcVoteDownloadBundle(
      {
        voteTxHash: 'vote1',
        voterHotId: 'cc_hot1abc',
        vote: 'yes',
        metadataUrl: 'https://example.com/meta.json',
        metadataHash: 'hash1',
        blockTime: 123,
      },
      {
        proposalId: 'gov_action1',
        proposalTxHash: 'proptx',
        proposalCertIndex: 0,
      },
      {
        metadata: { summary: 'Yes', rationaleStatement: null, precedentDiscussion: null, counterargumentDiscussion: null, conclusion: null, internalVote: null, comment: null },
        rawPayload: { body: { summary: 'Yes' } },
        anchorUrl: 'https://example.com/meta.json',
        cachedAtSec: 1,
      }
    );

    expect(bundle.onChain.vote).toBe('yes');
    expect(bundle.metadata?.summary).toBe('Yes');
    expect(bundle.rawMetadata).toEqual({ body: { summary: 'Yes' } });
    expect(bundle.metadataAnchor?.url).toBe('https://example.com/meta.json');
  });
});
