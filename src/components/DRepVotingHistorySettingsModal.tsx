import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import './IpfsLinkModal.css';

export interface DRepVotingHistorySettingsModalProps {
  open: boolean;
  onClose: () => void;
  cachedClosedCount: number;
  cachedMetadataDocCount: number;
  uncachedMetadataCount: number;
  cachedVoteRationaleDocCount: number;
  uncachedVoteRationaleCount: number;
  cachedDrepMetadataDocCount: number;
  onReloadClosedActions: () => void;
  onLoadUncachedMetadata: () => void;
  onClearMetadataDocs: () => void;
  onLoadUncachedVoteRationale: () => void;
  onClearVoteRationaleDocs: () => void;
  onClearDrepMetadataDocs: () => void;
  reloadDisabled: boolean;
  loadUncachedDisabled: boolean;
  clearMetadataDisabled: boolean;
  loadUncachedVoteRationaleDisabled: boolean;
  clearVoteRationaleDisabled: boolean;
  clearDrepMetadataDisabled: boolean;
}

export function DRepVotingHistorySettingsModal({
  open,
  onClose,
  cachedClosedCount,
  cachedMetadataDocCount,
  uncachedMetadataCount,
  cachedVoteRationaleDocCount,
  uncachedVoteRationaleCount,
  cachedDrepMetadataDocCount,
  onReloadClosedActions,
  onLoadUncachedMetadata,
  onClearMetadataDocs,
  onLoadUncachedVoteRationale,
  onClearVoteRationaleDocs,
  onClearDrepMetadataDocs,
  reloadDisabled,
  loadUncachedDisabled,
  clearMetadataDisabled,
  loadUncachedVoteRationaleDisabled,
  clearVoteRationaleDisabled,
  clearDrepMetadataDisabled,
}: DRepVotingHistorySettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div className="ipfs-link-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="ipfs-link-modal-panel voting-history-settings-panel"
        role="dialog"
        aria-labelledby="voting-history-settings-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 id="voting-history-settings-title" className="ipfs-link-modal-title">
            Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ipfs-link-modal-close">
            ×
          </button>
        </div>

        <p className="ipfs-link-modal-muted" style={{ marginBottom: '1rem' }}>
          Manage locally cached voting history, governance metadata (CIP-108), vote rationale
          documents (CIP-100), and DRep profile metadata (CIP-119).
        </p>

        <div className="voting-history-settings-stats">
          <div>
            Closed actions cached: <strong>{cachedClosedCount}</strong>
          </div>
          <div>
            Governance metadata documents cached: <strong>{cachedMetadataDocCount}</strong>
          </div>
          <div>
            Uncached governance metadata documents: <strong>{uncachedMetadataCount}</strong>
          </div>
          <div>
            Vote rationale documents cached: <strong>{cachedVoteRationaleDocCount}</strong>
          </div>
          <div>
            Uncached vote rationale documents: <strong>{uncachedVoteRationaleCount}</strong>
          </div>
          <div>
            DRep profile documents cached: <strong>{cachedDrepMetadataDocCount}</strong>
          </div>
        </div>

        <div className="voting-history-settings-actions">
          <Button
            onClick={() => {
              onReloadClosedActions();
              onClose();
            }}
            disabled={reloadDisabled}
          >
            Reload closed actions
          </Button>
          <Button
            onClick={() => {
              onLoadUncachedMetadata();
              onClose();
            }}
            disabled={loadUncachedDisabled}
          >
            Load {uncachedMetadataCount} uncached governance metadata documents
          </Button>
          <Button
            onClick={() => {
              onClearMetadataDocs();
              onClose();
            }}
            disabled={clearMetadataDisabled}
          >
            Clear {cachedMetadataDocCount} cached governance metadata documents
          </Button>
          <Button
            onClick={() => {
              onLoadUncachedVoteRationale();
              onClose();
            }}
            disabled={loadUncachedVoteRationaleDisabled}
          >
            Load {uncachedVoteRationaleCount} uncached vote rationale documents
          </Button>
          <Button
            onClick={() => {
              onClearVoteRationaleDocs();
              onClose();
            }}
            disabled={clearVoteRationaleDisabled}
          >
            Clear {cachedVoteRationaleDocCount} cached vote rationale documents
          </Button>
          <Button
            onClick={() => {
              onClearDrepMetadataDocs();
              onClose();
            }}
            disabled={clearDrepMetadataDisabled}
          >
            Clear {cachedDrepMetadataDocCount} cached DRep profile documents
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
