import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import './IpfsLinkModal.css';

export interface ConchHistorySettingsModalProps {
  open: boolean;
  onClose: () => void;
  cachedTxCount: number;
  onClearCache: () => void;
  clearDisabled: boolean;
}

export function ConchHistorySettingsModal({
  open,
  onClose,
  cachedTxCount,
  onClearCache,
  clearDisabled,
}: ConchHistorySettingsModalProps) {
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
        aria-labelledby="conch-history-settings-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 id="conch-history-settings-title" className="ipfs-link-modal-title">
            Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ipfs-link-modal-close">
            ×
          </button>
        </div>

        <p className="ipfs-link-modal-muted" style={{ marginBottom: '1rem' }}>
          Manage locally cached Conch transaction metadata lookups.
        </p>

        <div className="voting-history-settings-stats">
          <div>
            Cached transactions: <strong>{cachedTxCount}</strong>
          </div>
        </div>

        <div className="voting-history-settings-actions">
          <Button
            onClick={() => {
              onClearCache();
              onClose();
            }}
            disabled={clearDisabled}
          >
            Clear {cachedTxCount} cached Conch transactions
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
