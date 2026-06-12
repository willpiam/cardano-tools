import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ConnectWallet from './ConnectWallet';
import { Button } from './Button';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setPinataConfig } from '../store/pinataSlice';
import { deriveDRepFromWallet, enableWalletWithCip95, type ResolvedDRep } from '../functions/drepCredential';
import { buildAndSubmitBulkVotes, type BulkVoteAnchor } from '../functions/bulkVote';
import { fetchProtocolParametersSnapshot } from '../functions/blockfrostProtocolParams';
import { buildCip100RationaleBytes, hashGovernanceAnchorBytes } from '../functions/cip100RationaleDocument';
import { uploadJsonToPinata } from '../functions/pinataUpload';
import { formatGovActionType } from '../functions/governanceActionsFetch';
import { getBulkVoteConfigFromStorage, saveBulkVoteConfigToStorage } from '../utils/toolConfigStorage';
import './IpfsLinkModal.css';

export type CastVoteChoice = 'yes' | 'no' | 'abstain';

export interface CastVoteActionTarget {
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
  govActionType: string;
  cachedTitle?: string;
}

export interface CastVoteSubmittedResult {
  txHash: string;
  vote: CastVoteChoice;
}

export interface DRepCastVoteWizardModalProps {
  open: boolean;
  onClose: () => void;
  action: CastVoteActionTarget | null;
  viewedDrepId?: string | null;
  onVoteSubmitted?: (result: CastVoteSubmittedResult) => void;
}

type WizardStep = 'wallet' | 'vote' | 'metadata' | 'review' | 'done';

const voteOptionStyle = (selected: boolean, color: string): React.CSSProperties => ({
  flex: '1 1 6rem',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: selected ? `2px solid ${color}` : '2px solid #4b5563',
  backgroundColor: selected ? `${color}22` : '#1e293b',
  color: selected ? color : '#e5e7eb',
  fontWeight: 700,
  cursor: 'pointer',
});

function voteLabel(choice: CastVoteChoice): string {
  return choice.charAt(0).toUpperCase() + choice.slice(1);
}

export function DRepCastVoteWizardModal({
  open,
  onClose,
  action,
  viewedDrepId,
  onVoteSubmitted,
}: DRepCastVoteWizardModalProps) {
  const dispatch = useAppDispatch();
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const { useBlockfrost, apiKey } = useAppSelector((state) => state.blockfrost);
  const { jwt: pinataJwt } = useAppSelector((state) => state.pinata);

  const blockfrostReady = Boolean(useBlockfrost && apiKey);
  const pinataReady = Boolean(pinataJwt?.trim());

  const [currentStep, setCurrentStep] = useState<WizardStep>('vote');
  const [selectedVote, setSelectedVote] = useState<CastVoteChoice | null>(null);
  const [attachAnchor, setAttachAnchor] = useState(true);
  const [localPinataJwt, setLocalPinataJwt] = useState('');
  const [rationaleText, setRationaleText] = useState('');
  const [anchorUrl, setAnchorUrl] = useState('');
  const [anchorHashHex, setAnchorHashHex] = useState('');
  const [includeNote, setIncludeNote] = useState(false);
  const [noteText, setNoteText] = useState('casting drep vote via voting history');
  const [rationaleUploading, setRationaleUploading] = useState(false);
  const [rationaleUploadError, setRationaleUploadError] = useState<string | null>(null);
  const [walletDerivedDrep, setWalletDerivedDrep] = useState<ResolvedDRep | null>(null);
  const [drepResolveError, setDrepResolveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);

  const stepOrder = useMemo((): WizardStep[] => {
    const list: WizardStep[] = [];
    if (!isWalletConnected) list.push('wallet');
    list.push('vote', 'metadata', 'review');
    return list;
  }, [isWalletConnected]);

  const activeStep: WizardStep = submittedTxHash ? 'done' : currentStep;

  const resetWizard = useCallback(() => {
    setCurrentStep(isWalletConnected ? 'vote' : 'wallet');
    setSelectedVote(null);
    setAttachAnchor(true);
    setLocalPinataJwt(pinataJwt ?? '');
    setRationaleText('');
    setAnchorUrl('');
    setAnchorHashHex('');
    setIncludeNote(false);
    setNoteText('casting drep vote via voting history');
    setRationaleUploading(false);
    setRationaleUploadError(null);
    setWalletDerivedDrep(null);
    setDrepResolveError(null);
    setSubmitting(false);
    setSubmitError(null);
    setSubmittedTxHash(null);
  }, [pinataJwt, isWalletConnected]);

  useEffect(() => {
    if (currentStep === 'wallet' && isWalletConnected) {
      setCurrentStep('vote');
    }
  }, [currentStep, isWalletConnected]);

  useEffect(() => {
    if (!open) return;
    resetWizard();
    const cached = getBulkVoteConfigFromStorage();
    if (cached?.pinataJwt && !pinataJwt) {
      dispatch(setPinataConfig({ usePinata: true, jwt: cached.pinataJwt }));
      setLocalPinataJwt(cached.pinataJwt);
    }
  }, [open, resetWizard, dispatch, pinataJwt]);

  useEffect(() => {
    if (pinataJwt) setLocalPinataJwt(pinataJwt);
  }, [pinataJwt]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open || !isWalletConnected || !walletName) {
      setWalletDerivedDrep(null);
      setDrepResolveError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const api = await enableWalletWithCip95(walletName);
        const derived = await deriveDRepFromWallet(api);
        if (cancelled) return;
        if (!derived) {
          setWalletDerivedDrep(null);
          setDrepResolveError(
            'This wallet does not expose CIP-95 getPubDRepKey. Approve CIP-95 in a compatible wallet (e.g. Eternl, Lace).'
          );
          return;
        }
        setWalletDerivedDrep(derived);
        setDrepResolveError(null);
      } catch (e: unknown) {
        if (!cancelled) {
          setWalletDerivedDrep(null);
          setDrepResolveError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isWalletConnected, walletName]);

  const drepMismatch =
    viewedDrepId &&
    walletDerivedDrep?.drepIdBech32 &&
    viewedDrepId !== walletDerivedDrep.drepIdBech32;

  const handleApplyPinataJwt = () => {
    const nextJwt = localPinataJwt.trim();
    dispatch(setPinataConfig({ usePinata: Boolean(nextJwt), jwt: nextJwt || null }));
    if (nextJwt) saveBulkVoteConfigToStorage({ pinataJwt: nextJwt });
  };

  const handleLoadCachedPinata = () => {
    const cached = getBulkVoteConfigFromStorage();
    if (cached?.pinataJwt) {
      dispatch(setPinataConfig({ usePinata: true, jwt: cached.pinataJwt }));
      setLocalPinataJwt(cached.pinataJwt);
    }
  };

  const handleUploadRationale = async () => {
    setRationaleUploadError(null);
    const jwt = (pinataJwt || localPinataJwt).trim();
    const rationale = rationaleText.trim();
    if (!jwt) {
      setRationaleUploadError('Pinata JWT is required.');
      return;
    }
    if (!rationale) {
      setRationaleUploadError('Rationale text is required before uploading.');
      return;
    }

    setRationaleUploading(true);
    try {
      const bytes = buildCip100RationaleBytes(rationale);
      const hashHex = hashGovernanceAnchorBytes(bytes);
      const uploaded = await uploadJsonToPinata(jwt, bytes, `drep-vote-rationale-${Date.now()}.json`);
      setAnchorUrl(uploaded.url);
      setAnchorHashHex(hashHex);
      setAttachAnchor(true);
    } catch (e: unknown) {
      setRationaleUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setRationaleUploading(false);
    }
  };

  const canAdvanceFromVote = selectedVote !== null;

  const canAdvanceFromMetadata = useMemo(() => {
    if (!attachAnchor) return true;
    const u = anchorUrl.trim();
    const h = anchorHashHex.trim().replace(/^0x/i, '');
    return Boolean(u && /^[0-9a-fA-F]{64}$/.test(h));
  }, [attachAnchor, anchorUrl, anchorHashHex]);

  const canSubmit = useMemo(() => {
    if (!walletName || !walletAddress || !blockfrostReady || !apiKey) return false;
    if (!walletDerivedDrep || walletDerivedDrep.kind !== 'key') return false;
    if (!selectedVote || !action) return false;
    if (attachAnchor) {
      const u = anchorUrl.trim();
      const h = anchorHashHex.trim().replace(/^0x/i, '');
      if (!u || !/^[0-9a-fA-F]{64}$/.test(h)) return false;
    }
    return true;
  }, [
    walletName,
    walletAddress,
    blockfrostReady,
    apiKey,
    walletDerivedDrep,
    selectedVote,
    action,
    attachAnchor,
    anchorUrl,
    anchorHashHex,
  ]);

  const handleSubmit = async () => {
    if (!canSubmit || !selectedVote || !action || !walletName || !walletAddress || !apiKey) return;
    if (!walletDerivedDrep || walletDerivedDrep.kind !== 'key') return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      let anchor: BulkVoteAnchor | undefined;
      if (attachAnchor) {
        anchor = {
          url: anchorUrl.trim(),
          hashHex: anchorHashHex.trim().replace(/^0x/i, ''),
        };
      }
      const metadata =
        includeNote && noteText.trim().length > 0 ? [noteText.trim()] : undefined;

      const api = await enableWalletWithCip95(walletName);
      const params = await fetchProtocolParametersSnapshot(apiKey);
      const result = await buildAndSubmitBulkVotes({
        api,
        params,
        changeAddressBech32: walletAddress,
        drepKeyHashHex: walletDerivedDrep.keyHashHex,
        votes: [
          {
            txHash: action.proposalTxHash,
            certIndex: action.proposalCertIndex,
            vote: selectedVote,
          },
        ],
        anchor,
        metadata,
      });

      setSubmittedTxHash(result.txHash);
      onVoteSubmitted?.({ txHash: result.txHash, vote: selectedVote });
    } catch (e: unknown) {
      const err = e as { info?: { message?: string }; message?: string };
      setSubmitError(err?.info?.message || err?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (activeStep === 'wallet' && !isWalletConnected) return;
    if (activeStep === 'vote' && !canAdvanceFromVote) return;
    if (activeStep === 'metadata' && !canAdvanceFromMetadata) return;
    if (activeStep === 'review') return;
    const idx = stepOrder.indexOf(activeStep);
    if (idx >= 0 && idx < stepOrder.length - 1) {
      setCurrentStep(stepOrder[idx + 1]!);
    }
  };

  const goBack = () => {
    setSubmitError(null);
    const idx = stepOrder.indexOf(activeStep);
    if (idx > 0) setCurrentStep(stepOrder[idx - 1]!);
  };

  if (!open || !action) return null;

  const stepNumber =
    activeStep === 'done' ? stepOrder.length : stepOrder.indexOf(activeStep) + 1;

  const modal = (
    <div className="ipfs-link-modal-overlay" role="presentation" onClick={submitting ? undefined : onClose}>
      <div
        className="ipfs-link-modal-panel cast-vote-wizard-panel"
        role="dialog"
        aria-labelledby="cast-vote-wizard-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h2 id="cast-vote-wizard-title" className="ipfs-link-modal-title">
              {activeStep === 'done' ? 'Vote submitted' : 'Cast vote'}
            </h2>
            {activeStep !== 'done' && (
              <p className="ipfs-link-modal-muted" style={{ marginBottom: 0 }}>
                Step {stepNumber} of {stepOrder.length}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ipfs-link-modal-close"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="cast-vote-wizard-action-summary">
          <span className="cast-vote-wizard-action-type">{formatGovActionType(action.govActionType)}</span>
          {action.cachedTitle && (
            <span className="cast-vote-wizard-action-title">{action.cachedTitle}</span>
          )}
          <code className="cast-vote-wizard-action-id">{action.proposalId}</code>
        </div>

        {activeStep === 'wallet' && (
          <div className="cast-vote-wizard-step">
            <p className="ipfs-link-modal-muted">
              Connect a CIP-95 wallet to sign your DRep vote. Blockfrost is used for protocol parameters.
            </p>
            <ConnectWallet />
            {!blockfrostReady && isWalletConnected && (
              <p className="cast-vote-wizard-warning">
                Enable Blockfrost in the wallet connect dialog and enter your project id before continuing.
              </p>
            )}
          </div>
        )}

        {activeStep === 'vote' && (
          <div className="cast-vote-wizard-step">
            <p className="ipfs-link-modal-muted">How do you want to vote on this governance action?</p>
            <div className="cast-vote-wizard-vote-options">
              {(['yes', 'no', 'abstain'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  style={voteOptionStyle(
                    selectedVote === choice,
                    choice === 'yes' ? '#22c55e' : choice === 'no' ? '#ef4444' : '#eab308'
                  )}
                  onClick={() => setSelectedVote(choice)}
                >
                  {voteLabel(choice)}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeStep === 'metadata' && (
          <div className="cast-vote-wizard-step">
            <p className="ipfs-link-modal-muted">
              Optionally attach a CIP-100 rationale anchor and/or a CIP-20 transaction note.
            </p>

            {!pinataReady && (
              <div className="cast-vote-wizard-field-group">
                <label className="cast-vote-wizard-label">Pinata JWT</label>
                <p className="ipfs-link-modal-muted" style={{ marginTop: 0 }}>
                  Required to upload rationale to IPFS. Saved in this browser when set.
                </p>
                <div className="cast-vote-wizard-inline-row">
                  <input
                    type="text"
                    placeholder="Enter your Pinata JWT"
                    value={localPinataJwt}
                    onChange={(e) => setLocalPinataJwt(e.target.value)}
                    className="cast-vote-wizard-input"
                  />
                  <Button onClick={handleApplyPinataJwt}>Set key</Button>
                </div>
                {getBulkVoteConfigFromStorage()?.pinataJwt && !pinataReady && (
                  <button type="button" className="cast-vote-wizard-text-btn" onClick={handleLoadCachedPinata}>
                    Load Pinata JWT from browser cache
                  </button>
                )}
              </div>
            )}

            <label className="cast-vote-wizard-checkbox">
              <input
                type="checkbox"
                checked={attachAnchor}
                onChange={() => setAttachAnchor(!attachAnchor)}
              />
              <span>Attach CIP-100 rationale anchor</span>
            </label>

            {attachAnchor && (
              <div className="cast-vote-wizard-field-group">
                <label className="cast-vote-wizard-label">Rationale text</label>
                <textarea
                  value={rationaleText}
                  onChange={(e) => setRationaleText(e.target.value)}
                  rows={5}
                  placeholder="Explain why you are voting this way (markdown supported)."
                  className="cast-vote-wizard-textarea"
                />
                <div className="cast-vote-wizard-inline-row">
                  <Button
                    onClick={handleUploadRationale}
                    disabled={rationaleUploading || !pinataReady || !rationaleText.trim()}
                  >
                    {rationaleUploading ? 'Uploading…' : 'Upload to IPFS'}
                  </Button>
                </div>
                {rationaleUploadError && (
                  <p className="cast-vote-wizard-error">{rationaleUploadError}</p>
                )}
                {(anchorUrl || anchorHashHex) && (
                  <div className="cast-vote-wizard-anchor-preview">
                    <div>
                      URL: <code>{anchorUrl || '—'}</code>
                    </div>
                    <div>
                      Hash: <code>{anchorHashHex || '—'}</code>
                    </div>
                  </div>
                )}
                <p className="ipfs-link-modal-muted">
                  Or paste an existing anchor URL and blake2b-256 hash below.
                </p>
                <input
                  type="url"
                  placeholder="https://… (metadata URL)"
                  value={anchorUrl}
                  onChange={(e) => setAnchorUrl(e.target.value)}
                  className="cast-vote-wizard-input"
                />
                <input
                  type="text"
                  placeholder="64-char hex blake2b-256 hash"
                  value={anchorHashHex}
                  onChange={(e) => setAnchorHashHex(e.target.value)}
                  className="cast-vote-wizard-input cast-vote-wizard-input-mono"
                />
              </div>
            )}

            <label className="cast-vote-wizard-checkbox">
              <input type="checkbox" checked={includeNote} onChange={() => setIncludeNote(!includeNote)} />
              <span>Attach CIP-20 metadata note (label 674)</span>
            </label>
            {includeNote && (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                className="cast-vote-wizard-textarea"
              />
            )}
          </div>
        )}

        {activeStep === 'review' && (
          <div className="cast-vote-wizard-step">
            <dl className="cast-vote-wizard-review">
              <div>
                <dt>Vote</dt>
                <dd>{selectedVote ? voteLabel(selectedVote) : '—'}</dd>
              </div>
              <div>
                <dt>Wallet DRep</dt>
                <dd>
                  {walletDerivedDrep ? (
                    <code>{walletDerivedDrep.drepIdBech32}</code>
                  ) : (
                    drepResolveError || 'Resolving…'
                  )}
                </dd>
              </div>
              <div>
                <dt>CIP-100 anchor</dt>
                <dd>{attachAnchor ? 'Yes' : 'No'}</dd>
              </div>
              {attachAnchor && (
                <>
                  <div>
                    <dt>Anchor URL</dt>
                    <dd>
                      <code>{anchorUrl.trim() || '—'}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Anchor hash</dt>
                    <dd>
                      <code>{anchorHashHex.trim() || '—'}</code>
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>CIP-20 note</dt>
                <dd>{includeNote && noteText.trim() ? noteText.trim() : 'None'}</dd>
              </div>
            </dl>

            {drepMismatch && (
              <p className="cast-vote-wizard-warning">
                You are viewing voting history for <code>{viewedDrepId}</code>, but your connected wallet
                is <code>{walletDerivedDrep?.drepIdBech32}</code>. The vote will be cast as your wallet DRep.
              </p>
            )}
            {walletDerivedDrep?.kind === 'script' && (
              <p className="cast-vote-wizard-error">Script DReps are not supported in this tool.</p>
            )}
            {!blockfrostReady && (
              <p className="cast-vote-wizard-warning">Blockfrost API key is required to submit.</p>
            )}
            {submitError && <p className="cast-vote-wizard-error">{submitError}</p>}
          </div>
        )}

        {activeStep === 'done' && submittedTxHash && (
          <div className="cast-vote-wizard-step">
            <p className="ipfs-link-modal-muted">
              Your {selectedVote ? voteLabel(selectedVote) : ''} vote was submitted on-chain.
            </p>
            <a
              href={`https://cardanoscan.io/transaction/${submittedTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cast-vote-wizard-tx-link"
            >
              View transaction on Cardanoscan
            </a>
            <code className="cast-vote-wizard-action-id">{submittedTxHash}</code>
          </div>
        )}

        <div className="cast-vote-wizard-nav">
          {activeStep !== 'done' && activeStep !== 'wallet' && (
            <Button onClick={goBack} disabled={stepOrder.indexOf(activeStep) <= 0 || submitting}>
              Back
            </Button>
          )}
          {activeStep === 'wallet' && (
            <Button
              onClick={goNext}
              disabled={!isWalletConnected || !blockfrostReady || submitting}
            >
              Next
            </Button>
          )}
          {activeStep === 'vote' && (
            <Button onClick={goNext} disabled={!canAdvanceFromVote || submitting}>
              Next
            </Button>
          )}
          {activeStep === 'metadata' && (
            <Button onClick={goNext} disabled={!canAdvanceFromMetadata || submitting}>
              Review
            </Button>
          )}
          {activeStep === 'review' && (
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? 'Signing…' : 'Cast vote'}
            </Button>
          )}
          {activeStep === 'done' && <Button onClick={onClose}>Close</Button>}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
