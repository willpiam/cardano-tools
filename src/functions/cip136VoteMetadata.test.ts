import { parseCip136VoteMetadata } from './cip136VoteMetadata';

const CIP169_EXAMPLE = {
  '@context': 'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0169/cip-0169.common.jsonld',
  hashAlgorithm: 'blake2b-256',
  body: {
    summary: 'Voting NO on the treasury withdrawal: unconstitutional use of funds.',
    rationaleStatement:
      'The Cardano treasury is not meant to be used for personal gain; it should be for the benefit of the community.',
    precedentDiscussion: 'No precedent for treasury withdrawals of this nature.',
    counterargumentDiscussion:
      'It would be pretty cool, but coolness is not a constitutional criterion.',
    conclusion: 'Spending treasury funds to benefit a single individual is unconstitutional.',
    internalVote: {
      constitutional: 0,
      unconstitutional: 1,
      abstain: 0,
      didNotVote: 0,
    },
  },
  authors: [],
};

describe('parseCip136VoteMetadata', () => {
  it('parses CIP-169 committee vote example', () => {
    const result = parseCip136VoteMetadata(CIP169_EXAMPLE);
    expect(result).not.toBeNull();
    expect(result?.summary).toBe(
      'Voting NO on the treasury withdrawal: unconstitutional use of funds.'
    );
    expect(result?.rationaleStatement).toContain('Cardano treasury');
    expect(result?.internalVote).toEqual({
      constitutional: 0,
      unconstitutional: 1,
      abstain: 0,
      didNotVote: 0,
    });
  });

  it('accepts CIP-100 comment-only fallback', () => {
    const result = parseCip136VoteMetadata({
      body: { comment: 'Simple rationale text.' },
    });
    expect(result?.comment).toBe('Simple rationale text.');
  });

  it('returns null for empty payload', () => {
    expect(parseCip136VoteMetadata(null)).toBeNull();
    expect(parseCip136VoteMetadata({ body: {} })).toBeNull();
  });
});
