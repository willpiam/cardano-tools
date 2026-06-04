import { createPortal } from 'react-dom';
import './IpfsLinkModal.css';
import './ReloadingRecacheModal.css';

export interface ReloadingRecacheModalProps {
  open: boolean;
  title: string;
  description: string;
}

export function ReloadingRecacheModal({ open, title, description }: ReloadingRecacheModalProps) {
  if (!open) return null;

  const modal = (
    <div className="ipfs-link-modal-overlay" role="presentation">
      <div
        className="ipfs-link-modal-panel reloading-recache-panel"
        role="dialog"
        aria-labelledby="reloading-recache-title"
        aria-busy="true"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reloading-recache-title" className="ipfs-link-modal-title">
          {title}
        </h2>
        <div className="reloading-recache-spinner" aria-hidden="true" />
        <p className="reloading-recache-description">{description}</p>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
