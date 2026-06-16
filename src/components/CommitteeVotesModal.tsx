import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildCcVoteDownloadBundle,
  ccVoteDownloadFilename,
  downloadAllCcVoteBundles,
} from '../functions/ccVoteDownload';
import { truncateHash } from '../functions/governanceActionsFetch';
import type { CcVoteMetadata } from '../functions/cip136VoteMetadata';
import type { MetadataError } from '../functions/governanceActionsFetch';
import { ensureCcVotesForProposalCached } from '../utils/ccVotesFetch';
import type { CcVoteForProposal } from '../utils/ccVotesByProposalCache';
import {
  ccVoteMetadataDocCacheKey,
  getCcVoteMetadataDocCache,
} from '../utils/ccVoteMetadataDocCache';
import {
  ensureCcVoteMetadataDocCached,
  prefetchCcVoteMetadataDocs,
} from '../utils/ccVoteMetadataDocFetch';
import { proposalCacheKey } from '../utils/drepVotingHistoryCache';
import { IPFS_GATEWAYS, parseIpfsLink } from '../utils/ipfsGateways';
import { CcVoteMetadataView } from './CcVoteMetadataView';
import './IpfsLinkModal.css';
import './ReloadingRecacheModal.css';

type ModalStatus = 'idle' | 'loading' | 'loaded' | 'error';
type ContentView = 'formatted' | 'json';

interface VoteMetadataState {
  status: 'idle' | 'loading' | 'loaded' | 'absent' | 'error';
  metadata: CcVoteMetadata | null;
  rawPayload: unknown | null;
  error: MetadataError | null;
}

interface CommitteeVotesModalProps {
  open: boolean;
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
  proposalLabel: string;
  apiKey: string;
  onClose: () => void;
  onCacheUpdated?: () => void;
}

function voteColor(vote: string): string {
  switch (vote) {
    case 'yes':
      return '#22c55e';
    case 'no':
      return '#ef4444';
    case 'abstain':
      return '#eab308';
    default:
      return '#6b7280';
  }
}

function voteLabel(vote: string): string {
  return vote.charAt(0).toUpperCase() + vote.slice(1);
}

function truncateExcerpt(text: string, maxLen = 80): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen).trimEnd()}…`;
}

function formatMemberId(voterHotId: string): string {
  if (voterHotId.startsWith('cc_hot1')) {
    return `${voterHotId.slice(0, 14)}…`;
  }
  return truncateHash(voterHotId);
}

export function CommitteeVotesModal({
  open,
  proposalId,
  proposalTxHash,
  proposalCertIndex,
  proposalLabel,
  apiKey,
  onClose,
  onCacheUpdated,
}: CommitteeVotesModalProps) {
  const proposalKey = proposalCacheKey(proposalTxHash, proposalCertIndex);

  const [status, setStatus] = useState<ModalStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [votes, setVotes] = useState<CcVoteForProposal[]>([]);
  const [metadataByKey, setMetadataByKey] = useState<Map<string, VoteMetadataState>>(new Map());
  const [expandedVoteTx, setExpandedVoteTx] = useState<string | null>(null);
  const [expandedContentView, setExpandedContentView] = useState<ContentView>('formatted');
  const [selectedGatewayIndex, setSelectedGatewayIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const updateMetadataState = useCallback((cacheKey: string, patch: VoteMetadataState) => {
    setMetadataByKey((prev) => {
      const next = new Map(prev);
      next.set(cacheKey, patch);
      return next;
    });
  }, []);

  const loadVotes = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    setVotes([]);
    setMetadataByKey(new Map());
    setExpandedVoteTx(null);

    try {
      const result = await ensureCcVotesForProposalCached({
        apiKey,
        proposalTxHash,
        proposalCertIndex,
      });

      if (result.outcome === 'fetched') {
        onCacheUpdated?.();
      }

      setVotes(result.votes);
      setStatus('loaded');

      const prefetchItems = result.votes
        .filter((v) => v.metadataUrl)
        .map((v) => ({
          cacheKey: ccVoteMetadataDocCacheKey(proposalKey, v.voteTxHash),
          anchorUrl: v.metadataUrl!,
          hashHex: v.metadataHash ?? undefined,
        }));

      for (const item of prefetchItems) {
        updateMetadataState(item.cacheKey, {
          status: 'loading',
          metadata: null,
          rawPayload: null,
          error: null,
        });
      }

      await prefetchCcVoteMetadataDocs(prefetchItems, {
        onItemComplete: (cacheKey, prefetchResult) => {
          if (prefetchResult.outcome === 'fetched') onCacheUpdated?.();
          if (prefetchResult.outcome === 'cached' || prefetchResult.outcome === 'fetched') {
            updateMetadataState(cacheKey, {
              status: prefetchResult.metadata ? 'loaded' : 'absent',
              metadata: prefetchResult.metadata,
              rawPayload: prefetchResult.rawPayload,
              error: null,
            });
          } else if (prefetchResult.outcome === 'absent') {
            updateMetadataState(cacheKey, {
              status: 'absent',
              metadata: null,
              rawPayload: prefetchResult.rawPayload,
              error: null,
            });
          } else {
            updateMetadataState(cacheKey, {
              status: 'error',
              metadata: null,
              rawPayload: prefetchResult.rawPayload,
              error: prefetchResult.metadataError,
            });
          }
        },
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load constitutional committee votes'
      );
      setStatus('error');
    }
  }, [apiKey, onCacheUpdated, proposalCertIndex, proposalKey, proposalTxHash, updateMetadataState]);

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setLoadError(null);
      setVotes([]);
      setMetadataByKey(new Map());
      setExpandedVoteTx(null);
      setExpandedContentView('formatted');
      setSelectedGatewayIndex(0);
      setDownloading(false);
      return;
    }

    void loadVotes();
  }, [open, proposalTxHash, proposalCertIndex, apiKey, loadVotes]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'loading') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, status]);

  const handleRetryMetadata = async (vote: CcVoteForProposal) => {
    if (!vote.metadataUrl) return;
    const cacheKey = ccVoteMetadataDocCacheKey(proposalKey, vote.voteTxHash);
    updateMetadataState(cacheKey, { status: 'loading', metadata: null, rawPayload: null, error: null });

    const result = await ensureCcVoteMetadataDocCached({
      cacheKey,
      anchorUrl: vote.metadataUrl,
      hashHex: vote.metadataHash ?? undefined,
      gatewayIndex: selectedGatewayIndex,
    });

    if (result.outcome === 'fetched') onCacheUpdated?.();

    if (result.outcome === 'failed') {
      updateMetadataState(cacheKey, {
        status: 'error',
        metadata: null,
        rawPayload: result.rawPayload,
        error: result.metadataError,
      });
      return;
    }

    updateMetadataState(cacheKey, {
      status: result.metadata ? 'loaded' : 'absent',
      metadata: result.metadata,
      rawPayload: result.rawPayload,
      error: null,
    });
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const bundles = await Promise.all(
        votes.map(async (vote) => {
          const cacheKey = ccVoteMetadataDocCacheKey(proposalKey, vote.voteTxHash);
          const metadataEntry = vote.metadataUrl
            ? await getCcVoteMetadataDocCache(cacheKey)
            : null;

          return {
            bundle: buildCcVoteDownloadBundle(
              vote,
              { proposalId, proposalTxHash, proposalCertIndex },
              metadataEntry
            ),
            filename: ccVoteDownloadFilename(vote.voterHotId, proposalLabel),
          };
        })
      );

      await downloadAllCcVoteBundles(bundles);
    } finally {
      setDownloading(false);
    }
  };

  const expandedVote = useMemo(
    () => votes.find((v) => v.voteTxHash === expandedVoteTx) ?? null,
    [votes, expandedVoteTx]
  );

  const expandedMetadataState = expandedVote
    ? metadataByKey.get(ccVoteMetadataDocCacheKey(proposalKey, expandedVote.voteTxHash))
    : undefined;

  if (!open) return null;

  const modal = (
    <div
      className="ipfs-link-modal-overlay"
      role="presentation"
      onClick={status !== 'loading' ? onClose : undefined}
    >
      <div
        className="ipfs-link-modal-panel governance-metadata-panel governance-metadata-panel-wide"
        role="dialog"
        aria-labelledby="committee-votes-title"
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
          <div>
            <h2 id="committee-votes-title" className="ipfs-link-modal-title">
              Constitutional committee votes
            </h2>
            <p className="ipfs-link-modal-muted" style={{ marginTop: '0.25rem' }}>
              {proposalLabel}
            </p>
          </div>
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

        {status === 'loading' && (
          <div className="recache-modal-body">
            <div className="recache-modal-spinner" aria-hidden />
            <p>Loading constitutional committee votes…</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="governance-metadata-error">{loadError}</p>
            <button type="button" className="btn text-xs py-1 px-2" onClick={() => void loadVotes()}>
              Retry
            </button>
          </div>
        )}

        {status === 'loaded' && (
          <>
            <div className="governance-metadata-toolbar" style={{ marginBottom: '1rem' }}>
              <span className="ipfs-link-modal-muted">
                {votes.length} vote{votes.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className="governance-metadata-toolbar-btn"
                onClick={() => void handleDownloadAll()}
                disabled={votes.length === 0 || downloading}
              >
                {downloading ? 'Downloading…' : 'Download all'}
              </button>
            </div>

            {votes.length === 0 ? (
              <p className="ipfs-link-modal-muted">No constitutional committee votes for this action.</p>
            ) : (
              <div className="drep-voting-history-table-wrap overflow-x-auto">
                <table className="drep-voting-history-table text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b py-2 pr-3">Member</th>
                      <th className="border-b py-2 pr-3">Vote</th>
                      <th className="border-b py-2 pr-3">Vote tx</th>
                      <th className="border-b py-2 pr-3">Metadata</th>
                      <th className="border-b py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votes.map((vote) => {
                      const cacheKey = ccVoteMetadataDocCacheKey(proposalKey, vote.voteTxHash);
                      const meta = metadataByKey.get(cacheKey);
                      const excerpt =
                        meta?.metadata?.summary ??
                        meta?.metadata?.comment ??
                        meta?.metadata?.rationaleStatement;

                      return (
                        <tr key={vote.voteTxHash}>
                          <td className="border-b py-2 pr-3 font-mono text-sm">
                            {formatMemberId(vote.voterHotId)}
                          </td>
                          <td className="border-b py-2 pr-3">
                            <span
                              style={{
                                color: voteColor(vote.vote),
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: `${voteColor(vote.vote)}20`,
                              }}
                            >
                              {voteLabel(vote.vote)}
                            </span>
                          </td>
                          <td className="border-b py-2 pr-3">
                            <a
                              href={`https://cardanoscan.io/transaction/${vote.voteTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="drep-voting-history-row-details-link font-mono text-sm"
                            >
                              {truncateHash(vote.voteTxHash)}
                            </a>
                          </td>
                          <td className="border-b py-2 pr-3 text-sm">
                            {!vote.metadataUrl ? (
                              <span className="drep-voting-history-row-details-muted">—</span>
                            ) : meta?.status === 'loading' ? (
                              <span className="drep-voting-history-row-details-unknown">…</span>
                            ) : meta?.status === 'error' ? (
                              <span className="governance-metadata-error" title={meta.error?.message}>
                                Error
                              </span>
                            ) : meta?.status === 'absent' || !excerpt ? (
                              <span className="drep-voting-history-row-details-muted">—</span>
                            ) : (
                              <span title={excerpt}>{truncateExcerpt(excerpt)}</span>
                            )}
                          </td>
                          <td className="border-b py-2">
                            {vote.metadataUrl ? (
                              <button
                                type="button"
                                className="btn text-xs py-1 px-2"
                                onClick={() => {
                                  setExpandedVoteTx(vote.voteTxHash);
                                  setExpandedContentView('formatted');
                                }}
                              >
                                View
                              </button>
                            ) : (
                              <span className="drep-voting-history-row-details-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {expandedVote && expandedVote.metadataUrl && (
              <div
                className="governance-metadata-detail-panel"
                style={{ marginTop: '1.5rem', borderTop: '1px solid #374151', paddingTop: '1rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <h3 className="governance-metadata-section-title" style={{ margin: 0 }}>
                    {formatMemberId(expandedVote.voterHotId)}
                  </h3>
                  <div className="governance-metadata-toolbar">
                    <button
                      type="button"
                      className={`governance-metadata-toolbar-btn${expandedContentView === 'formatted' ? ' governance-metadata-toolbar-btn--active' : ''}`}
                      onClick={() => setExpandedContentView('formatted')}
                    >
                      Formatted
                    </button>
                    <button
                      type="button"
                      className={`governance-metadata-toolbar-btn${expandedContentView === 'json' ? ' governance-metadata-toolbar-btn--active' : ''}`}
                      onClick={() => setExpandedContentView('json')}
                    >
                      View JSON
                    </button>
                    <button
                      type="button"
                      className="governance-metadata-toolbar-btn"
                      onClick={() => setExpandedVoteTx(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {expandedMetadataState?.status === 'loading' && (
                  <p className="ipfs-link-modal-muted">Loading metadata…</p>
                )}

                {expandedMetadataState?.status === 'error' && (
                  <div>
                    <p className="governance-metadata-error">
                      {expandedMetadataState.error?.message ?? 'Failed to load metadata'}
                    </p>
                    {parseIpfsLink(expandedVote.metadataUrl) && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <label className="ipfs-link-modal-muted" htmlFor="cc-vote-gateway">
                          IPFS gateway
                        </label>
                        <select
                          id="cc-vote-gateway"
                          value={selectedGatewayIndex}
                          onChange={(e) => setSelectedGatewayIndex(Number(e.target.value))}
                          className="ipfs-link-modal-select"
                          style={{ marginLeft: '0.5rem' }}
                        >
                          {IPFS_GATEWAYS.map((gateway, i) => (
                            <option key={gateway.name} value={i}>
                              {gateway.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn text-xs py-1 px-2"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => void handleRetryMetadata(expandedVote)}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {expandedMetadataState?.status === 'loaded' && expandedMetadataState.metadata && (
                  expandedContentView === 'formatted' ? (
                    <CcVoteMetadataView metadata={expandedMetadataState.metadata} />
                  ) : (
                    <pre className="governance-metadata-json">
                      {JSON.stringify(expandedMetadataState.rawPayload, null, 2)}
                    </pre>
                  )
                )}

                {expandedMetadataState?.status === 'absent' && (
                  <p className="ipfs-link-modal-muted">No metadata document at anchor.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
