import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  isGovernanceActionFinalized,
  type GovernanceActionTimeStatus,
} from '../utils/governanceExpiration';

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

function chartData(counts: VoteSummaryCounts) {
  return SLICE_META.map(({ key, label, color }) => ({
    name: label,
    value: counts[key],
    color,
  })).filter((d) => d.value > 0);
}

function VoteSummaryPie({
  counts,
  size,
  showLabels,
}: {
  counts: VoteSummaryCounts;
  size: number;
  showLabels: boolean;
}) {
  const data = chartData(counts);

  if (data.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '0.85rem',
          textAlign: 'center',
          padding: '0.5rem',
        }}
      >
        No actions to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={size * 0.38}
          label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
          labelLine={showLabels}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value, 'Actions']} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function VoteSummaryLegend({ counts }: { counts: VoteSummaryCounts }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.85rem' }}>
      {SLICE_META.map(({ key, label, color }) => (
        <li key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <span>
            {label}: <strong>{counts[key]}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface DRepVoteSummaryChartProps {
  rows: VoteSummaryRow[];
}

export function DRepVoteSummaryChart({ rows }: DRepVoteSummaryChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [excludeUnfinalized, setExcludeUnfinalized] = useState(false);

  const counts = useMemo(
    () => computeVoteSummary(rows, excludeUnfinalized),
    [rows, excludeUnfinalized]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="Open vote summary chart"
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '0.75rem 1rem',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Vote summary</span>
        <VoteSummaryPie counts={counts} size={140} showLabels={false} />
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Click to expand</span>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-labelledby="vote-summary-title"
            aria-modal="true"
            className="rounded-lg border-2 border-[#ffa722] bg-[#111111] text-neutral-100"
            style={{ padding: '1.5rem', maxWidth: 'min(520px, 95vw)', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 id="vote-summary-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                Vote summary
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0 0.25rem',
                }}
              >
                ×
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <input
                type="checkbox"
                checked={excludeUnfinalized}
                onChange={(e) => setExcludeUnfinalized(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span>Exclude governance actions that have not yet finalized</span>
            </label>

            {excludeUnfinalized && counts.excluded > 0 && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                {counts.excluded} action{counts.excluded === 1 ? '' : 's'} still in voting excluded.
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
              <VoteSummaryPie counts={counts} size={280} showLabels />
              <VoteSummaryLegend counts={counts} />
            </div>

            <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center' }}>
              Based on {counts.total} governance action{counts.total === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
