import { DelegationInsightsModal } from './DelegationInsightsModal';
import type { DelegationBreakdownLovelace } from '../functions/emergoInsights';

export interface EmergoInsightsModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  breakdown: DelegationBreakdownLovelace | null;
}

export function EmergoInsightsModal({
  open,
  onClose,
  loading,
  error,
  breakdown,
}: EmergoInsightsModalProps) {
  return (
    <DelegationInsightsModal
      open={open}
      onClose={onClose}
      title="Emergo Insights"
      titleId="emergo-insights-title"
      description="ADA voting stake breakdown. Toggle slices to focus on delegated voting power only."
      featuredSetLabel="Emergo set"
      loading={loading}
      error={error}
      breakdown={breakdown}
    />
  );
}
