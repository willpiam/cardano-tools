import { mergeCcVotesForProposal, type BlockfrostCommitteeVote, type BlockfrostProposalVote } from './ccVotesFetch';

describe('mergeCcVotesForProposal', () => {
  const proposalTx = 'b2a591ac219ce6dcca5847e0248015209c7cb0436aa6bd6863d0c1f152a60bc5';
  const certIndex = 0;

  it('merges proposal CC votes with committee vote metadata', () => {
    const proposalVotes: BlockfrostProposalVote[] = [
      {
        tx_hash: 'vote1abc',
        cert_index: 0,
        voter_role: 'constitutional_committee',
        voter: '53a42debdc7ffd90085ab7fd9800b63e6d1c9ac481ba6eb7b6a844e4',
        vote: 'yes',
      },
      {
        tx_hash: 'drepvote',
        cert_index: 1,
        voter_role: 'drep',
        voter: 'drep1abc',
        vote: 'no',
      },
    ];

    const committeeVotes: BlockfrostCommitteeVote[] = [
      {
        tx_hash: 'vote1abc',
        voter_hot_id: 'cc_hot1qf4xq9mlra5j68w8zjz2lvf3kc3rtsdtu98ka7zx4u6jvqyy39ww0',
        proposal_id: 'gov_action1abc',
        proposal_tx_hash: proposalTx,
        proposal_index: 0,
        governance_type: 'parameter_change',
        vote: 'yes',
        metadata_url: 'https://example.com/rationale.jsonld',
        metadata_hash: 'abc123',
        block_height: 100,
        block_time: 1746037200,
      },
      {
        tx_hash: 'other',
        voter_hot_id: 'cc_hot1other',
        proposal_id: 'gov_action1other',
        proposal_tx_hash: 'otherproposal',
        proposal_index: 0,
        governance_type: 'info_action',
        vote: 'no',
        metadata_url: null,
        metadata_hash: null,
        block_height: 99,
        block_time: 1746037100,
      },
    ];

    const result = mergeCcVotesForProposal(proposalVotes, committeeVotes, proposalTx, certIndex);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      voteTxHash: 'vote1abc',
      voterHotId: 'cc_hot1qf4xq9mlra5j68w8zjz2lvf3kc3rtsdtu98ka7zx4u6jvqyy39ww0',
      vote: 'yes',
      metadataUrl: 'https://example.com/rationale.jsonld',
      metadataHash: 'abc123',
      blockTime: 1746037200,
    });
  });

  it('includes committee-only votes for the proposal', () => {
    const committeeVotes: BlockfrostCommitteeVote[] = [
      {
        tx_hash: 'voteonly',
        voter_hot_id: 'cc_hot1only',
        proposal_id: 'gov_action1only',
        proposal_tx_hash: proposalTx,
        proposal_index: certIndex,
        governance_type: 'new_constitution',
        vote: 'abstain',
        metadata_url: null,
        metadata_hash: null,
        block_height: 101,
        block_time: 1746037300,
      },
    ];

    const result = mergeCcVotesForProposal([], committeeVotes, proposalTx, certIndex);

    expect(result).toHaveLength(1);
    expect(result[0].voteTxHash).toBe('voteonly');
    expect(result[0].vote).toBe('abstain');
  });

  it('sorts by block time descending then voter id', () => {
    const committeeVotes: BlockfrostCommitteeVote[] = [
      {
        tx_hash: 'voteA',
        voter_hot_id: 'cc_hot1bbb',
        proposal_id: 'gov_action1',
        proposal_tx_hash: proposalTx,
        proposal_index: certIndex,
        governance_type: 'info_action',
        vote: 'yes',
        metadata_url: null,
        metadata_hash: null,
        block_height: 1,
        block_time: 100,
      },
      {
        tx_hash: 'voteB',
        voter_hot_id: 'cc_hot1aaa',
        proposal_id: 'gov_action1',
        proposal_tx_hash: proposalTx,
        proposal_index: certIndex,
        governance_type: 'info_action',
        vote: 'no',
        metadata_url: null,
        metadata_hash: null,
        block_height: 2,
        block_time: 200,
      },
    ];

    const result = mergeCcVotesForProposal([], committeeVotes, proposalTx, certIndex);
    expect(result.map((v) => v.voteTxHash)).toEqual(['voteB', 'voteA']);
  });
});
