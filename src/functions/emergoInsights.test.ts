import {
  breakdownToCounts,
  classifyDrepDelegation,
  collectTopNIdsFromRankedPages,
  computeDelegationBreakdown,
  DEFAULT_DELEGATION_INSIGHTS_VISIBILITY,
  EMERGO_INSIGHTS_DREP_IDS,
  normalizeDrepId,
  topDrepsFeaturedLabel,
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

const EMERGO_SET = new Set(EMERGO_INSIGHTS_DREP_IDS.map(normalizeDrepId));

describe('normalizeDrepId', () => {
  it('trims and lowercases', () => {
    expect(normalizeDrepId('  DRep1ABC  ')).toBe('drep1abc');
  });
});

describe('topDrepsFeaturedLabel', () => {
  it('formats label with clamped N', () => {
    expect(topDrepsFeaturedLabel(10)).toBe('Top 10 DReps');
    expect(topDrepsFeaturedLabel(200)).toBe('Top 100 DReps');
  });
});

describe('collectTopNIdsFromRankedPages', () => {
  it('excludes auto DReps and collects top N', () => {
    const ids = collectTopNIdsFromRankedPages(
      [
        drepItem('drep_always_abstain', '9000000'),
        drepItem('drep1aaa', '8000000'),
        drepItem('drep1bbb', '7000000'),
        drepItem('drep_always_no_confidence', '6000000'),
        drepItem('drep1ccc', '5000000'),
      ],
      2
    );

    expect(ids).toEqual(['drep1aaa', 'drep1bbb']);
  });

  it('deduplicates by normalized id', () => {
    const ids = collectTopNIdsFromRankedPages(
      [drepItem('DRep1AAA', '1'), drepItem('drep1aaa', '2')],
      2
    );
    expect(ids).toEqual(['DRep1AAA']);
  });
});

describe('classifyDrepDelegation', () => {
  it('classifies featured set DReps', () => {
    expect(classifyDrepDelegation(EMERGO_INSIGHTS_DREP_IDS[0], EMERGO_SET)).toBe('featuredSet');
  });

  it('classifies auto abstain and no confidence separately', () => {
    expect(classifyDrepDelegation('drep_always_abstain', EMERGO_SET)).toBe('autoAbstain');
    expect(classifyDrepDelegation('drep_always_no_confidence', EMERGO_SET)).toBe('noConfidence');
  });

  it('classifies other DReps', () => {
    expect(classifyDrepDelegation('drep1other', EMERGO_SET)).toBe('otherDrep');
  });
});

describe('computeDelegationBreakdown', () => {
  it('sums buckets and computes undelegated from active stake', () => {
    const topSet = new Set([normalizeDrepId('drep1top')]);
    const dreps: BlockfrostDrepListItem[] = [
      drepItem(EMERGO_INSIGHTS_DREP_IDS[0], '1000000'),
      drepItem(EMERGO_INSIGHTS_DREP_IDS[1], '2000000'),
      drepItem('drep1top', '2500000'),
      drepItem('drep_always_abstain', '3000000'),
      drepItem('drep_always_no_confidence', '1500000'),
      drepItem('drep1other', '4000000'),
    ];

    const emergoBreakdown = computeDelegationBreakdown(dreps, 20_000_000, EMERGO_SET);
    expect(emergoBreakdown.featuredSet).toBe(3_000_000);

    const topBreakdown = computeDelegationBreakdown(dreps, 20_000_000, topSet);
    expect(topBreakdown.featuredSet).toBe(2_500_000);
    expect(topBreakdown.autoAbstain).toBe(3_000_000);
    expect(topBreakdown.noConfidence).toBe(1_500_000);
    expect(topBreakdown.otherDrep).toBe(7_000_000);
    expect(topBreakdown.totalDelegated).toBe(14_000_000);
    expect(topBreakdown.undelegated).toBe(6_000_000);
  });

  it('does not produce negative undelegated when delegated exceeds active stake', () => {
    const featured = new Set([normalizeDrepId('drep1other')]);
    const dreps = [drepItem('drep1other', '5000000')];
    const breakdown = computeDelegationBreakdown(dreps, 1_000_000, featured);
    expect(breakdown.undelegated).toBe(0);
  });
});

describe('breakdownToCounts', () => {
  it('excludes unchecked buckets from chart counts', () => {
    const featured = new Set<string>();
    const breakdown = computeDelegationBreakdown(
      [
        drepItem('drep_always_abstain', '1000000'),
        drepItem('drep_always_no_confidence', '2000000'),
        drepItem('drep1other', '3000000'),
      ],
      10_000_000,
      featured
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
    const featured = new Set([normalizeDrepId('drep1other')]);
    const breakdown = computeDelegationBreakdown([drepItem('drep1other', '1000000')], 5_000_000, featured);
    const counts = breakdownToCounts(breakdown, DEFAULT_DELEGATION_INSIGHTS_VISIBILITY);
    expect(counts.undelegated).toBe(4_000_000);
    expect(counts.featuredSet).toBe(1_000_000);
  });
});
