import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import './IpfsLinkModal.css';

export interface DRepVotingHistorySettingsModalProps {
  open: boolean;
  onClose: () => void;
  cachedClosedCount: number;
  cachedMetadataDocCount: number;
  onReloadClosedActions: () => void;
  onClearMetadataDocs: () => void;
  reloadDisabled: boolean;
  clearMetadataDisabled: boolean;
}

export function DRepVotingHistorySettingsModal({
  open,
  onClose,
  cachedClosedCount,
  cachedMetadataDocCount,
  onReloadClosedActions,
  onClearMetadataDocs,
  reloadDisabled,
  clearMetadataDisabled,
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
          Manage locally cached voting history and governance metadata documents.
        </p>

        <div className="voting-history-settings-stats">
          <div>
            Closed actions cached: <strong>{cachedClosedCount}</strong>
          </div>
          <div>
            Governance metadata documents cached: <strong>{cachedMetadataDocCount}</strong>
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
              onClearMetadataDocs();
              onClose();
            }}
            disabled={clearMetadataDisabled}
          >
            Clear {cachedMetadataDocCount} cached governance metadata documents
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
