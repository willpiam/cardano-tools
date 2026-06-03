import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IPFS_GATEWAYS, parseIpfsLink } from '../utils/ipfsGateways';
import './IpfsLinkModal.css';

interface IpfsLinkModalProps {
  open: boolean;
  url: string;
  hashHex?: string;
  onClose: () => void;
}

export function IpfsLinkModal({ open, url, hashHex, onClose }: IpfsLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const parsed = parseIpfsLink(url);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const copyIpfsUri = () => {
    const text = parsed?.ipfsUri ?? url;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const modal = (
    <div className="ipfs-link-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="ipfs-link-modal-panel"
        role="dialog"
        aria-labelledby="ipfs-link-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 id="ipfs-link-title" className="ipfs-link-modal-title">
            Open vote rationale
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ipfs-link-modal-close">
            ×
          </button>
        </div>

        {parsed ? (
          <>
            <p className="ipfs-link-modal-muted">
              Choose a public gateway to view this IPFS document in your browser.
            </p>

            <div className="ipfs-link-modal-uri-box">
              <div className="ipfs-link-modal-uri-label">IPFS URI</div>
              <code className="ipfs-link-modal-code">{parsed.ipfsUri}</code>
              <div className="ipfs-link-modal-actions">
                <button type="button" className="ipfs-link-modal-copy-btn" onClick={copyIpfsUri}>
                  {copied ? 'Copied' : 'Copy ipfs:// URI'}
                </button>
                <a href={parsed.ipfsUri} className="ipfs-link-modal-text-link">
                  Open ipfs:// link
                </a>
              </div>
            </div>

            <ul className="ipfs-link-modal-gateways">
              {IPFS_GATEWAYS.map((gateway) => (
                <li key={gateway.name}>
                  <a
                    href={gateway.buildUrl(parsed)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ipfs-link-modal-gateway"
                  >
                    Open via {gateway.name}
                  </a>
                </li>
              ))}
            </ul>

            {hashHex && (
              <p className="ipfs-link-modal-hash" style={{ marginTop: '1rem' }}>
                Anchor hash: {hashHex}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="ipfs-link-modal-muted">
              This anchor is not an IPFS link. You can open or copy the original URL below.
            </p>
            <code className="ipfs-link-modal-code" style={{ marginBottom: '0.75rem' }}>
              {url}
            </code>
            <div className="ipfs-link-modal-actions">
              <button type="button" className="ipfs-link-modal-copy-btn" onClick={copyIpfsUri}>
                {copied ? 'Copied' : 'Copy URL'}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="ipfs-link-modal-text-link"
              >
                Open original URL
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
