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

export type VoteAnchorStatus = 'none' | 'present' | 'absent' | 'unknown';

export interface VoteMetadataRow {
  vote: string | null;
  anchorStatus: VoteAnchorStatus;
  timeStatus: GovernanceActionTimeStatus;
}

export interface VoteMetadataCounts {
  didNotVote: number;
  votedWithAnchor: number;
  votedWithoutAnchor: number;
  unknown: number;
  excluded: number;
  total: number;
  [key: string]: number;
}

export interface VoteMetadataCrossTab {
  yes: { withAnchor: number; withoutAnchor: number };
  no: { withAnchor: number; withoutAnchor: number };
  abstain: { withAnchor: number; withoutAnchor: number };
}

const SLICE_META = [
  { key: 'didNotVote' as const, label: 'Did Not Vote', color: '#6b7280' },
  { key: 'votedWithoutAnchor' as const, label: 'Voted Without Anchor', color: '#f59e0b' },
  { key: 'votedWithAnchor' as const, label: 'Voted With Anchor', color: '#14b8a6' },
];

export function computeVoteMetadataSummary(
  rows: VoteMetadataRow[],
  excludeUnfinalized: boolean
): VoteMetadataCounts {
  const counts: VoteMetadataCounts = {
    didNotVote: 0,
    votedWithAnchor: 0,
    votedWithoutAnchor: 0,
    unknown: 0,
    excluded: 0,
    total: 0,
  };

  for (const row of rows) {
    if (excludeUnfinalized && !isGovernanceActionFinalized(row.timeStatus)) {
      counts.excluded += 1;
      continue;
    }
    counts.total += 1;

    if (row.vote === null || row.anchorStatus === 'none') {
      counts.didNotVote += 1;
      continue;
    }
    if (row.anchorStatus === 'unknown') {
      counts.unknown += 1;
      continue;
    }
    if (row.anchorStatus === 'present') {
      counts.votedWithAnchor += 1;
    } else {
      counts.votedWithoutAnchor += 1;
    }
  }

  return counts;
}

export function computeVoteMetadataCrossTab(rows: VoteMetadataRow[]): VoteMetadataCrossTab {
  const tab: VoteMetadataCrossTab = {
    yes: { withAnchor: 0, withoutAnchor: 0 },
    no: { withAnchor: 0, withoutAnchor: 0 },
    abstain: { withAnchor: 0, withoutAnchor: 0 },
  };

  for (const row of rows) {
    if (row.vote === null || row.anchorStatus === 'none' || row.anchorStatus === 'unknown') {
      continue;
    }
    const bucket = tab[row.vote as keyof VoteMetadataCrossTab];
    if (!bucket) continue;
    if (row.anchorStatus === 'present') {
      bucket.withAnchor += 1;
    } else {
      bucket.withoutAnchor += 1;
    }
  }

  return tab;
}

function CrossTabTable({ tab }: { tab: VoteMetadataCrossTab }) {
  const rows: { label: string; key: keyof VoteMetadataCrossTab }[] = [
    { label: 'Yes', key: 'yes' },
    { label: 'No', key: 'no' },
    { label: 'Abstain', key: 'abstain' },
  ];

  return (
    <table
      className="min-w-full text-left border-collapse"
      style={{ marginTop: '1rem', fontSize: '0.85rem' }}
    >
      <thead>
        <tr>
          <th className="px-3 py-2 border-b text-neutral-400">Vote</th>
          <th className="px-3 py-2 border-b text-neutral-400">With anchor</th>
          <th className="px-3 py-2 border-b text-neutral-400">Without anchor</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, key }) => (
          <tr key={key}>
            <td className="px-3 py-2 border-b">{label}</td>
            <td className="px-3 py-2 border-b">{tab[key].withAnchor}</td>
            <td className="px-3 py-2 border-b">{tab[key].withoutAnchor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface DRepVoteMetadataChartProps {
  rows: VoteMetadataRow[];
  anchorCheckFailedCount?: number;
  loading?: boolean;
}

export function DRepVoteMetadataChart({
  rows,
  anchorCheckFailedCount = 0,
  loading = false,
}: DRepVoteMetadataChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [excludeUnfinalized, setExcludeUnfinalized] = useState(false);
  const [variant, setVariant] = useState<ChartVariant>('pie');

  const counts = useMemo(
    () => computeVoteMetadataSummary(rows, excludeUnfinalized),
    [rows, excludeUnfinalized]
  );

  const chartData = useMemo(
    () => chartSlicesFromCounts(SLICE_META, counts),
    [counts]
  );

  const crossTab = useMemo(() => {
    const filtered = excludeUnfinalized
      ? rows.filter((r) => isGovernanceActionFinalized(r.timeStatus))
      : rows;
    return computeVoteMetadataCrossTab(filtered);
  }, [rows, excludeUnfinalized]);

  const countsRecord: Record<string, number> = {
    didNotVote: counts.didNotVote,
    votedWithoutAnchor: counts.votedWithoutAnchor,
    votedWithAnchor: counts.votedWithAnchor,
  };

  const votedDenom = counts.votedWithAnchor + counts.votedWithoutAnchor;

  return (
    <>
      {loading ? (
        <div
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            minWidth: 180,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '0.85rem',
          }}
        >
          <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#e5e5e5' }}>
            Vote rationale
          </span>
          Loading anchors…
        </div>
      ) : (
        <GovernanceChartThumbnail
          title="Vote rationale"
          chartData={chartData}
          onClick={() => setModalOpen(true)}
        />
      )}

      <GovernanceChartModal
        open={modalOpen}
        titleId="vote-metadata-title"
        title="Vote rationale (CIP-100)"
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
        footer={
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              Based on {counts.total} governance action{counts.total === 1 ? '' : 's'}
              {votedDenom > 0 && (
                <>
                  {' '}
                  · {counts.votedWithAnchor} of {votedDenom} voted actions include a CIP-100 anchor (
                  {Math.round((counts.votedWithAnchor / votedDenom) * 100)}%)
                </>
              )}
            </p>
            {counts.unknown > 0 && (
              <p style={{ margin: 0 }}>
                {counts.unknown} vote{counts.unknown === 1 ? '' : 's'} could not be checked for anchors.
              </p>
            )}
            {anchorCheckFailedCount > 0 && (
              <p style={{ margin: '0.5rem 0 0' }}>
                {anchorCheckFailedCount} vote transaction{anchorCheckFailedCount === 1 ? '' : 's'} failed to load.
              </p>
            )}
          </div>
        }
      >
        <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>
          CIP-100 vote rationale anchor (on-chain). Voted actions only:
        </p>
        <CrossTabTable tab={crossTab} />
      </GovernanceChartModal>
    </>
  );
}
