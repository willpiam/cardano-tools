import {
  formatBatchCooldownDescription,
  formatProposalBatchDescription,
  formatVoteCborBatchDescription,
  splitIntoBatches,
  BATCH_COOLDOWN_MS,
  PROPOSAL_BATCH_SIZE,
} from './drepVotingHistoryRecacheHelpers';

describe('splitIntoBatches', () => {
  it('returns empty array for empty input', () => {
    expect(splitIntoBatches([], 5)).toEqual([]);
  });

  it('splits items into fixed-size batches', () => {
    expect(splitIntoBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns single batch when batch size exceeds length', () => {
    expect(splitIntoBatches(['a', 'b'], 10)).toEqual([['a', 'b']]);
  });
});

describe('progress descriptions', () => {
  it('formats proposal batch label', () => {
    expect(formatProposalBatchDescription(2, 12)).toBe('Requesting batch 2 of 12');
  });

  it('formats vote CBOR batch label', () => {
    expect(formatVoteCborBatchDescription(1, 5)).toBe('Fetching vote CBOR batch 1 of 5');
  });

  it('formats cooldown between batches', () => {
    expect(formatBatchCooldownDescription(10, 3, 4)).toBe(
      'Waiting 10 seconds between batch 3 and 4'
    );
  });
});

describe('recache constants', () => {
  it('uses 10 second batch cooldown', () => {
    expect(BATCH_COOLDOWN_MS).toBe(10_000);
  });

  it('uses proposal batch size of 12', () => {
    expect(PROPOSAL_BATCH_SIZE).toBe(12);
  });
});
