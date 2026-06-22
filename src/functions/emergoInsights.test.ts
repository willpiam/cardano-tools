import {
  breakdownToCounts,
  classifyDrepDelegation,
  computeDelegationBreakdown,
  DEFAULT_EMERGO_INSIGHTS_VISIBILITY,
  EMERGO_INSIGHTS_DREP_IDS,
  normalizeDrepId,
} from './emergoInsights';
import type { BlockfrostDrepListItem } from './popularDrepsFetch';

function drepItem(drepId: string, amount: string): BlockfrostDrepListItem {
  return {
    drep_id: drepId,
    hex: 'abc',
    amount,
    has_script: false,
    retired: false,
    expired: false,
    last_active_epoch: 1,
  };
}

describe('normalizeDrepId', () => {
  it('trims and lowercases', () => {
    expect(normalizeDrepId('  DRep1ABC  ')).toBe('drep1abc');
  });
});

describe('classifyDrepDelegation', () => {
  it('classifies Emergo set DReps', () => {
    expect(classifyDrepDelegation(EMERGO_INSIGHTS_DREP_IDS[0])).toBe('emergoSet');
  });

  it('classifies auto abstain and no confidence separately', () => {
    expect(classifyDrepDelegation('drep_always_abstain')).toBe('autoAbstain');
    expect(classifyDrepDelegation('drep_always_no_confidence')).toBe('noConfidence');
  });

  it('classifies other DReps', () => {
    expect(classifyDrepDelegation('drep1other')).toBe('otherDrep');
  });
});

describe('computeDelegationBreakdown', () => {
  it('sums buckets and computes undelegated from active stake', () => {
    const dreps: BlockfrostDrepListItem[] = [
      drepItem(EMERGO_INSIGHTS_DREP_IDS[0], '1000000'),
      drepItem(EMERGO_INSIGHTS_DREP_IDS[1], '2000000'),
      drepItem('drep_always_abstain', '3000000'),
      drepItem('drep_always_no_confidence', '1500000'),
      drepItem('drep1other', '4000000'),
    ];

    const breakdown = computeDelegationBreakdown(dreps, 20_000_000);

    expect(breakdown.emergoSet).toBe(3_000_000);
    expect(breakdown.autoAbstain).toBe(3_000_000);
    expect(breakdown.noConfidence).toBe(1_500_000);
    expect(breakdown.otherDrep).toBe(4_000_000);
    expect(breakdown.totalDelegated).toBe(11_500_000);
    expect(breakdown.undelegated).toBe(8_500_000);
    expect(breakdown.activeStake).toBe(20_000_000);
  });

  it('does not produce negative undelegated when delegated exceeds active stake', () => {
    const dreps = [drepItem('drep1other', '5000000')];
    const breakdown = computeDelegationBreakdown(dreps, 1_000_000);
    expect(breakdown.undelegated).toBe(0);
  });
});

describe('breakdownToCounts', () => {
  it('excludes unchecked buckets from chart counts', () => {
    const breakdown = computeDelegationBreakdown(
      [
        drepItem('drep_always_abstain', '1000000'),
        drepItem('drep_always_no_confidence', '2000000'),
        drepItem('drep1other', '3000000'),
      ],
      10_000_000
    );

    const counts = breakdownToCounts(breakdown, {
      includeUndelegated: false,
      includeAutoAbstain: false,
      includeNoConfidence: true,
    });

    expect(counts.undelegated).toBe(0);
    expect(counts.autoAbstain).toBe(0);
    expect(counts.noConfidence).toBe(2_000_000);
    expect(counts.otherDrep).toBe(3_000_000);
  });

  it('includes all buckets by default', () => {
    const breakdown = computeDelegationBreakdown([drepItem('drep1other', '1000000')], 5_000_000);
    const counts = breakdownToCounts(breakdown, DEFAULT_EMERGO_INSIGHTS_VISIBILITY);
    expect(counts.undelegated).toBe(4_000_000);
    expect(counts.otherDrep).toBe(1_000_000);
  });
});
