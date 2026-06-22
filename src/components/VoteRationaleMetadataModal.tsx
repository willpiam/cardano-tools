import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MetadataError } from '../functions/governanceActionsFetch';
import type { VoteRationaleMetadata } from '../functions/cip100RationaleDocument';
import {
  ensureVoteRationaleDocCached,
  fetchVoteRationaleDocAtGatewayIndex,
} from '../utils/voteRationaleDocFetch';
import { putVoteRationaleDocCache } from '../utils/voteRationaleDocCache';
import { IPFS_GATEWAYS, parseIpfsLink } from '../utils/ipfsGateways';
import { VoteRationaleView } from './VoteRationaleView';
import './IpfsLinkModal.css';
import './ReloadingRecacheModal.css';

type ModalStatus = 'idle' | 'loading' | 'loaded' | 'error';
type ContentView = 'formatted' | 'json';

interface VoteRationaleMetadataModalProps {
  open: boolean;
  cacheKey: string;
  anchorUrl: string;
  hashHex?: string;
  proposalLabel: string;
  onClose: () => void;
  onCacheUpdated?: () => void;
}

export function VoteRationaleMetadataModal({
  open,
  cacheKey,
  anchorUrl,
  hashHex,
  proposalLabel,
  onClose,
  onCacheUpdated,
}: VoteRationaleMetadataModalProps) {
  const [status, setStatus] = useState<ModalStatus>('idle');
  const [metadata, setMetadata] = useState<VoteRationaleMetadata | null>(null);
  const [rawPayload, setRawPayload] = useState<unknown | null>(null);
  const [error, setError] = useState<MetadataError | null>(null);
  const [selectedGatewayIndex, setSelectedGatewayIndex] = useState(0);
  const [lastFetchUrl, setLastFetchUrl] = useState<string | null>(null);
  const [wideView, setWideView] = useState(false);
  const [contentView, setContentView] = useState<ContentView>('formatted');

  const onCacheUpdatedRef = useRef(onCacheUpdated);
  onCacheUpdatedRef.current = onCacheUpdated;

  const isIpfsAnchor = parseIpfsLink(anchorUrl) !== null;

  const fetchMetadata = useCallback(
    async (gatewayIndex: number) => {
      setStatus('loading');
      setError(null);
      setMetadata(null);
      setRawPayload(null);

      const result = await fetchVoteRationaleDocAtGatewayIndex(anchorUrl, gatewayIndex);
      setLastFetchUrl(result.fetchUrl);

      if (result.metadataError) {
        setError(result.metadataError);
        setRawPayload(result.rawPayload);
        setStatus('error');
        return;
      }

      if (result.metadata) {
        await putVoteRationaleDocCache(cacheKey, {
          metadata: result.metadata,
          rawPayload: result.rawPayload,
          anchorUrl,
          hashHex,
          cachedAtSec: Math.floor(Date.now() / 1000),
        });
        onCacheUpdatedRef.current?.();
      }

      setMetadata(result.metadata);
      setRawPayload(result.rawPayload);
      setStatus('loaded');
    },
    [anchorUrl, cacheKey, hashHex]
  );

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setMetadata(null);
      setRawPayload(null);
      setError(null);
      setSelectedGatewayIndex(0);
      setLastFetchUrl(null);
      setWideView(false);
      setContentView('formatted');
      return;
    }

    let cancelled = false;

    async function loadMetadata() {
      setStatus('loading');
      setError(null);
      setMetadata(null);
      setRawPayload(null);

      const result = await ensureVoteRationaleDocCached({
        cacheKey,
        anchorUrl,
        hashHex,
      });

      if (cancelled) return;

      if (result.outcome === 'cached' || result.outcome === 'fetched') {
        if (result.outcome === 'fetched') onCacheUpdatedRef.current?.();
        setMetadata(result.metadata);
        setRawPayload(result.rawPayload);
        setLastFetchUrl(result.fetchUrl);
        setStatus('loaded');
        return;
      }

      setError(result.metadataError);
      setRawPayload(result.rawPayload);
      setLastFetchUrl(result.fetchUrl);
      setStatus('error');
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [open, anchorUrl, cacheKey, hashHex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'loading') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, status]);

  if (!open) return null;

  const handleRetry = () => {
    void fetchMetadata(selectedGatewayIndex);
  };

  const panelClass = wideView
    ? 'ipfs-link-modal-panel governance-metadata-panel governance-metadata-panel-wide'
    : 'ipfs-link-modal-panel governance-metadata-panel';

  const jsonText = rawPayload !== null ? JSON.stringify(rawPayload, null, 2) : null;

  const modal = (
    <div
      className="ipfs-link-modal-overlay"
      role="presentation"
      onClick={status !== 'loading' ? onClose : undefined}
    >
      <div
        className={panelClass}
        role="dialog"
        aria-labelledby="vote-rationale-metadata-title"
        aria-modal="true"
        aria-busy={status === 'loading'}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          <h2 id="vote-rationale-metadata-title" className="ipfs-link-modal-title">
            Vote rationale
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ipfs-link-modal-close"
            disabled={status === 'loading'}
          >
            ×
          </button>
        </div>

        <p className="ipfs-link-modal-muted governance-metadata-body" style={{ marginBottom: '1rem' }}>
          Action:{' '}
          <code
            className="ipfs-link-modal-code"
            style={{ display: 'inline', padding: '0.15rem 0.35rem', margin: 0 }}
          >
            {proposalLabel}
          </code>
        </p>

        {status === 'loading' && (
          <>
            <div className="reloading-recache-spinner" aria-hidden="true" />
            <p className="reloading-recache-description">Loading vote rationale…</p>
          </>
        )}

        {status === 'loaded' && metadata && (
          <>
            <div className="governance-metadata-toolbar">
              <button
                type="button"
                className={`governance-metadata-toolbar-btn${wideView ? ' governance-metadata-toolbar-btn-active' : ''}`}
                onClick={() => setWideView((value) => !value)}
              >
                {wideView ? 'Standard width' : 'Wider view'}
              </button>
              <button
                type="button"
                className={`governance-metadata-toolbar-btn${contentView === 'formatted' ? ' governance-metadata-toolbar-btn-active' : ''}`}
                onClick={() => setContentView('formatted')}
              >
                Formatted
              </button>
              <button
                type="button"
                className={`governance-metadata-toolbar-btn${contentView === 'json' ? ' governance-metadata-toolbar-btn-active' : ''}`}
                onClick={() => setContentView('json')}
                disabled={jsonText === null}
              >
                View JSON
              </button>
            </div>

            {contentView === 'formatted' ? (
              <VoteRationaleView metadata={metadata} />
            ) : (
              <pre className="governance-metadata-json">{jsonText}</pre>
            )}

            {hashHex && (
              <p
                className="ipfs-link-modal-hash governance-metadata-body"
                style={{ marginTop: '1rem' }}
              >
                Anchor hash: {hashHex}
              </p>
            )}
          </>
        )}

        {status === 'error' && error && (
          <div
            style={{
              border: '1px solid #7f1d1d',
              borderRadius: '6px',
              padding: '0.75rem',
              background: '#1c0a0a',
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <div style={{ color: '#fca5a5' }}>{error.message}</div>
            <div
              className="governance-metadata-body"
              style={{ fontSize: '0.78rem', color: '#fca5a5' }}
            >
              Code: {error.code}
              {error.statusCode !== undefined ? ` · HTTP ${error.statusCode}` : ''}
              {error.details ? ` · ${error.details}` : ''}
            </div>
            {lastFetchUrl && (
              <div
                className="governance-metadata-body"
                style={{ fontSize: '0.75rem', color: '#d1d5db' }}
              >
                Fetch URL: {lastFetchUrl}
              </div>
            )}

            {jsonText && (
              <>
                <div className="governance-metadata-toolbar">
                  <button
                    type="button"
                    className={`governance-metadata-toolbar-btn${contentView === 'json' ? ' governance-metadata-toolbar-btn-active' : ''}`}
                    onClick={() => setContentView(contentView === 'json' ? 'formatted' : 'json')}
                  >
                    {contentView === 'json' ? 'Hide JSON' : 'View JSON'}
                  </button>
                </div>
                {contentView === 'json' && <pre className="governance-metadata-json">{jsonText}</pre>}
              </>
            )}

            {isIpfsAnchor && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <label htmlFor="vote-rationale-gateway-select" style={{ fontSize: '0.85rem', color: '#d1d5db' }}>
                  Gateway:
                </label>
                <select
                  id="vote-rationale-gateway-select"
                  value={selectedGatewayIndex}
                  onChange={(e) => setSelectedGatewayIndex(Number(e.target.value))}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#1a1a1a',
                    color: '#f5f5f5',
                    fontSize: '0.85rem',
                  }}
                >
                  {IPFS_GATEWAYS.map((gateway, idx) => (
                    <option key={gateway.name} value={idx}>
                      {gateway.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="ipfs-link-modal-copy-btn" onClick={handleRetry}>
                  Try again
                </button>
              </div>
            )}

            {!isIpfsAnchor && (
              <button type="button" className="ipfs-link-modal-copy-btn" onClick={handleRetry}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
