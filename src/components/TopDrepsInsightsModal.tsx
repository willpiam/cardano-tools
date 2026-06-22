import { useEffect, useState } from 'react';
import { Button } from './Button';
import { DelegationInsightsModal } from './DelegationInsightsModal';
import {
  clampTopDrepsInsightsN,
  DEFAULT_TOP_DREPS_INSIGHTS_N,
  MAX_TOP_DREPS_INSIGHTS_N,
  MIN_TOP_DREPS_INSIGHTS_N,
  topDrepsFeaturedLabel,
  type DelegationBreakdownLovelace,
} from '../functions/emergoInsights';

export interface TopDrepsInsightsModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  breakdown: DelegationBreakdownLovelace | null;
  topDrepIds: string[];
  appliedN: number;
  onApplyN: (n: number) => void;
}

export function TopDrepsInsightsModal({
  open,
  onClose,
  loading,
  error,
  breakdown,
  topDrepIds,
  appliedN,
  onApplyN,
}: TopDrepsInsightsModalProps) {
  const [nInput, setNInput] = useState(String(DEFAULT_TOP_DREPS_INSIGHTS_N));

  useEffect(() => {
    if (open) {
      setNInput(String(appliedN));
    }
  }, [open, appliedN]);

  const parsedN = clampTopDrepsInsightsN(Number(nInput));
  const featuredSetLabel = topDrepsFeaturedLabel(appliedN);

  const controls = (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        marginBottom: '1rem',
      }}
    >
      <div style={{ minWidth: '120px' }}>
        <label
          htmlFor="top-dreps-insights-n"
          style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}
        >
          Top N DReps
        </label>
        <input
          id="top-dreps-insights-n"
          type="number"
          min={MIN_TOP_DREPS_INSIGHTS_N}
          max={MAX_TOP_DREPS_INSIGHTS_N}
          value={nInput}
          onChange={(e) => setNInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onApplyN(parsedN);
          }}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>
      <Button onClick={() => onApplyN(parsedN)} disabled={loading}>
        Apply
      </Button>
    </div>
  );

  const footnote =
    breakdown && topDrepIds.length < appliedN ? (
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center' }}>
        Only {topDrepIds.length} active non-system DRep{topDrepIds.length === 1 ? '' : 's'} found on-chain.
      </p>
    ) : null;

  return (
    <DelegationInsightsModal
      open={open}
      onClose={onClose}
      title="Top DReps Insights"
      titleId="top-dreps-insights-title"
      description="ADA voting stake breakdown for the top-ranked active DReps by voting power."
      featuredSetLabel={featuredSetLabel}
      loading={loading}
      error={error}
      breakdown={breakdown}
      controls={controls}
      footnote={footnote}
    />
  );
}
