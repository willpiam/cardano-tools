import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import './IpfsLinkModal.css';

export interface PopularDrepsSettingsModalProps {
  open: boolean;
  onClose: () => void;
  cachedPageCount: number;
  cachedDrepMetadataDocCount: number;
  onRefresh: () => void;
  onClearLeaderboardCache: () => void;
  refreshDisabled: boolean;
  clearDisabled: boolean;
}

export function PopularDrepsSettingsModal({
  open,
  onClose,
  cachedPageCount,
  cachedDrepMetadataDocCount,
  onRefresh,
  onClearLeaderboardCache,
  refreshDisabled,
  clearDisabled,
}: PopularDrepsSettingsModalProps) {
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
        aria-labelledby="popular-dreps-settings-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 id="popular-dreps-settings-title" className="ipfs-link-modal-title">
            Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ipfs-link-modal-close">
            ×
          </button>
        </div>

        <p className="ipfs-link-modal-muted" style={{ marginBottom: '1rem' }}>
          Manage locally cached popular DRep leaderboard pages and shared DRep profile metadata.
        </p>

        <div className="voting-history-settings-stats">
          <div>
            Cached leaderboard pages: <strong>{cachedPageCount}</strong>
          </div>
          <div>
            Shared DRep metadata docs: <strong>{cachedDrepMetadataDocCount}</strong>
          </div>
        </div>

        <div className="voting-history-settings-actions">
          <Button onClick={onRefresh} disabled={refreshDisabled}>
            Refresh from Blockfrost
          </Button>
          <Button
            onClick={() => {
              onClearLeaderboardCache();
              onClose();
            }}
            disabled={clearDisabled}
          >
            Clear {cachedPageCount} cached leaderboard pages
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
