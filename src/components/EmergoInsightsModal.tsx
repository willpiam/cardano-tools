import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  chartSlicesFromCounts,
  GovernancePie,
  type ChartSlice,
} from './governanceChartShared';
import {
  breakdownToCounts,
  DEFAULT_EMERGO_INSIGHTS_VISIBILITY,
  DELEGATION_BUCKET_META,
  type DelegationBreakdownLovelace,
  type EmergoInsightsVisibility,
} from '../functions/emergoInsights';
import { formatAdaCompact } from '../utils/formatAda';
import './IpfsLinkModal.css';

export interface EmergoInsightsModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  breakdown: DelegationBreakdownLovelace | null;
}

function DelegationLegend({ data }: { data: ChartSlice[] }) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.85rem' }}>
      {data.map(({ key, label, value, color }) => (
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
            {label}: <strong>{formatAdaCompact(value)}</strong>
            {total > 0 && (
              <span style={{ color: '#9ca3af' }}> ({Math.round((value / total) * 100)}%)</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EmergoInsightsModal({
  open,
  onClose,
  loading,
  error,
  breakdown,
}: EmergoInsightsModalProps) {
  const [visibility, setVisibility] = useState<EmergoInsightsVisibility>(
    DEFAULT_EMERGO_INSIGHTS_VISIBILITY
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setVisibility(DEFAULT_EMERGO_INSIGHTS_VISIBILITY);
    }
  }, [open]);

  const chartData = useMemo(() => {
    if (!breakdown) return [];
    const counts = breakdownToCounts(breakdown, visibility);
    return chartSlicesFromCounts(DELEGATION_BUCKET_META, counts);
  }, [breakdown, visibility]);

  if (!open) return null;

  const modal = (
    <div className="ipfs-link-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="ipfs-link-modal-panel voting-history-settings-panel"
        role="dialog"
        aria-labelledby="emergo-insights-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 'min(520px, 95vw)' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          <h2 id="emergo-insights-title" className="ipfs-link-modal-title">
            Emergo Insights
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ipfs-link-modal-close">
            ×
          </button>
        </div>

        <p className="ipfs-link-modal-muted" style={{ marginBottom: '1rem' }}>
          ADA voting stake breakdown. Toggle slices to focus on delegated voting power only.
        </p>

        {loading && <p>Loading delegation breakdown…</p>}

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#450a0a',
              border: '1px solid #7f1d1d',
              borderRadius: '4px',
              color: '#fca5a5',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && breakdown && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibility.includeUndelegated}
                  onChange={(e) =>
                    setVisibility((prev) => ({ ...prev, includeUndelegated: e.target.checked }))
                  }
                />
                Include undelegated stake
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibility.includeAutoAbstain}
                  onChange={(e) =>
                    setVisibility((prev) => ({ ...prev, includeAutoAbstain: e.target.checked }))
                  }
                />
                Include always abstain
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visibility.includeNoConfidence}
                  onChange={(e) =>
                    setVisibility((prev) => ({ ...prev, includeNoConfidence: e.target.checked }))
                  }
                />
                Include no confidence
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              {chartData.length > 0 ? (
                <>
                  <GovernancePie
                    data={chartData}
                    size={260}
                    valueFormatter={(value) => formatAdaCompact(value)}
                  />
                  <DelegationLegend data={chartData} />
                </>
              ) : (
                <p style={{ color: '#9ca3af', margin: 0 }}>No slices selected for the chart.</p>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center' }}>
              Active stake: {formatAdaCompact(breakdown.activeStake)} · Delegated to DReps:{' '}
              {formatAdaCompact(breakdown.totalDelegated)}
            </p>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
