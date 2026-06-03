import { useMemo, useState } from 'react';
import {
  isGovernanceActionFinalized,
  type GovernanceActionTimeStatus,
} from '../utils/governanceExpiration';
import {
  chartSlicesFromCounts,
  GovernanceChartModal,
  GovernanceChartThumbnail,
  type ChartVariant,
} from './governanceChartShared';

export interface VoteSummaryRow {
  vote: string | null;
  timeStatus: GovernanceActionTimeStatus;
}

export interface VoteSummaryCounts {
  yes: number;
  no: number;
  abstain: number;
  didNotVote: number;
  excluded: number;
  total: number;
  [key: string]: number;
}

const SLICE_META = [
  { key: 'yes' as const, label: 'Yes', color: '#22c55e' },
  { key: 'no' as const, label: 'No', color: '#ef4444' },
  { key: 'abstain' as const, label: 'Abstain', color: '#eab308' },
  { key: 'didNotVote' as const, label: 'Did Not Vote', color: '#6b7280' },
];

export function computeVoteSummary(
  rows: VoteSummaryRow[],
  excludeUnfinalized: boolean
): VoteSummaryCounts {
  const counts: VoteSummaryCounts = {
    yes: 0,
    no: 0,
    abstain: 0,
    didNotVote: 0,
    excluded: 0,
    total: 0,
  };

  for (const row of rows) {
    if (excludeUnfinalized && !isGovernanceActionFinalized(row.timeStatus)) {
      counts.excluded += 1;
      continue;
    }
    counts.total += 1;
    switch (row.vote) {
      case 'yes':
        counts.yes += 1;
        break;
      case 'no':
        counts.no += 1;
        break;
      case 'abstain':
        counts.abstain += 1;
        break;
      default:
        counts.didNotVote += 1;
        break;
    }
  }

  return counts;
}

interface DRepVoteSummaryChartProps {
  rows: VoteSummaryRow[];
}

export function DRepVoteSummaryChart({ rows }: DRepVoteSummaryChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [excludeUnfinalized, setExcludeUnfinalized] = useState(false);
  const [variant, setVariant] = useState<ChartVariant>('pie');

  const counts = useMemo(
    () => computeVoteSummary(rows, excludeUnfinalized),
    [rows, excludeUnfinalized]
  );

  const chartData = useMemo(
    () => chartSlicesFromCounts(SLICE_META, counts),
    [counts]
  );

  const countsRecord: Record<string, number> = {
    yes: counts.yes,
    no: counts.no,
    abstain: counts.abstain,
    didNotVote: counts.didNotVote,
  };

  return (
    <>
      <GovernanceChartThumbnail
        title="Vote summary"
        chartData={chartData}
        onClick={() => setModalOpen(true)}
      />

      <GovernanceChartModal
        open={modalOpen}
        titleId="vote-summary-title"
        title="Vote summary"
        onClose={() => setModalOpen(false)}
        excludeUnfinalized={excludeUnfinalized}
        onExcludeUnfinalizedChange={setExcludeUnfinalized}
        excludedCount={counts.excluded}
        totalCount={counts.total}
        variant={variant}
        onVariantChange={setVariant}
        chartData={chartData}
        meta={SLICE_META}
        counts={countsRecord}
      />
    </>
  );
}
