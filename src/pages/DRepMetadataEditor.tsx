import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import ConnectWallet from '../components/ConnectWallet';
import { Button } from '../components/Button';
import { DRepMetadataView } from '../components/DRepMetadataView';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import '../simple.css';
import '../components/IpfsLinkModal.css';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { setPinataConfig } from '../store/pinataSlice';
import {
  getBlockfrostApiKeyFromStorage,
  getBulkVoteConfigFromStorage,
  getDRepMetadataConfigFromStorage,
  hasBlockfrostApiKeyInUrl,
  saveBlockfrostApiKeyToStorage,
  saveDRepMetadataConfigToStorage,
} from '../utils/toolConfigStorage';
import {
  buildCip119MetadataBytes,
  drepMetadataToFormInput,
  formInputToDrepMetadata,
  hashGovernanceAnchorBytes,
  validateCip119Form,
  type DrepMetadataFormInput,
} from '../functions/cip119MetadataDocument';
import { uploadImageToPinata, uploadJsonToPinata, sha256HexFromBytes } from '../functions/pinataUpload';
import { fetchProtocolParametersSnapshot } from '../functions/blockfrostProtocolParams';
import {
  deriveDRepFromWallet,
  enableWalletWithCip95,
  type ResolvedDRep,
} from '../functions/drepCredential';
import {
  buildAndSubmitDrepMetadataTx,
} from '../functions/drepMetadataTx';
import {
  fetchDrepRegistrationStatus,
  resolveDrepMetadataTxMode,
  type DrepRegistrationStatus,
} from '../functions/drepRegistrationStatus';
import { drepMetadataDownloadFilename } from '../functions/drepMetadata';
import { ensureDrepMetadataDocCached } from '../utils/drepMetadataDocFetch';
import { downloadJson } from '../functions/downloadJson';
import type { DrepMetadataReference } from '../functions/drepMetadata';
import { IPFS_GATEWAYS, parseIpfsLink } from '../utils/ipfsGateways';

type WizardStep = 'connect' | 'profile' | 'preview' | 'publish' | 'submit';

const STEPS: WizardStep[] = ['connect', 'profile', 'preview', 'publish', 'submit'];

const STEP_LABELS: Record<WizardStep, string> = {
  connect: 'Connect',
  profile: 'Profile',
  preview: 'Preview',
  publish: 'Publish',
  submit: 'Submit',
};

const PINATA_JWT_PARAM = 'pinataJwt';

const emptyReference = (): DrepMetadataReference => ({ type: 'Link', label: '', uri: '' });

const defaultForm = (): DrepMetadataFormInput => ({
  givenName: '',
  references: [],
});

function statusLabel(status: DrepRegistrationStatus | null): string {
  switch (status) {
    case 'unregistered':
      return 'Not registered';
    case 'active':
      return 'Active';
    case 'retired':
      return 'Retired';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

function statusColor(status: DrepRegistrationStatus | null): { bg: string; fg: string } {
  switch (status) {
    case 'active':
      return { bg: '#052e16', fg: '#86efac' };
    case 'unregistered':
      return { bg: '#1e293b', fg: '#cbd5e1' };
    case 'retired':
    case 'expired':
      return { bg: '#450a0a', fg: '#fca5a5' };
    default:
      return { bg: '#1f2937', fg: '#d1d5db' };
  }
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.65rem',
  borderRadius: '6px',
  border: '1px solid #4b5563',
  background: '#111827',
  color: '#f3f4f6',
  fontSize: '0.95rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.35rem',
  fontSize: '0.88rem',
  color: '#d1d5db',
};

const sectionStyle: React.CSSProperties = {
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1rem',
  background: '#0f172a',
};

async function sha256HexFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  return sha256HexFromBytes(new Uint8Array(await res.arrayBuffer()));
}

function profileImagePreviewUrl(
  contentUrl: string | undefined,
  localPreviewUrl: string | null
): string | null {
  if (localPreviewUrl) return localPreviewUrl;
  const url = contentUrl?.trim();
  if (!url) return null;
  const parsed = parseIpfsLink(url);
  if (parsed) return IPFS_GATEWAYS[0].buildUrl(parsed);
  return url;
}

const DRepMetadataEditor: React.FC = () => {
  const dispatch = useAppDispatch();
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const { useBlockfrost, apiKey } = useAppSelector((state) => state.blockfrost);
  const { jwt: pinataJwt } = useAppSelector((state) => state.pinata);

  const blockfrostReady = Boolean(useBlockfrost && apiKey);
  const pinataReady = Boolean(pinataJwt?.trim());

  const [step, setStep] = useState<WizardStep>('connect');
  const [localApiKey, setLocalApiKey] = useState(apiKey ?? '');
  const [localPinataJwt, setLocalPinataJwt] = useState(pinataJwt ?? '');

  const [walletDerivedDrep, setWalletDerivedDrep] = useState<ResolvedDRep | null>(null);
  const [drepResolveError, setDrepResolveError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<DrepRegistrationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [form, setForm] = useState<DrepMetadataFormInput>(defaultForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [loadExistingLoading, setLoadExistingLoading] = useState(false);
  const [loadExistingError, setLoadExistingError] = useState<string | null>(null);
  const [imageHashLoading, setImageHashLoading] = useState(false);
  const [imageHashError, setImageHashError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageLocalPreviewUrl, setImageLocalPreviewUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const [showRawJson, setShowRawJson] = useState(false);
  const [metadataBytes, setMetadataBytes] = useState<Uint8Array | null>(null);

  const [anchorUrl, setAnchorUrl] = useState('');
  const [anchorHashHex, setAnchorHashHex] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [keyDepositLovelace, setKeyDepositLovelace] = useState<bigint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('blockfrostApiKey');
    if (urlKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: urlKey }));
      setLocalApiKey(urlKey);
      saveBlockfrostApiKeyToStorage(urlKey);
    } else {
      const cached = getBlockfrostApiKeyFromStorage();
      if (cached && !apiKey) {
        dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: cached }));
        setLocalApiKey(cached);
      }
    }

    const urlPinata = params.get(PINATA_JWT_PARAM);
    if (urlPinata) {
      dispatch(setPinataConfig({ usePinata: true, jwt: urlPinata }));
      setLocalPinataJwt(urlPinata);
      saveDRepMetadataConfigToStorage({ pinataJwt: urlPinata });
    } else {
      const cachedMeta = getDRepMetadataConfigFromStorage();
      const cachedBulk = getBulkVoteConfigFromStorage();
      const jwt = cachedMeta?.pinataJwt ?? cachedBulk?.pinataJwt;
      if (jwt && !pinataJwt) {
        dispatch(setPinataConfig({ usePinata: true, jwt }));
        setLocalPinataJwt(jwt);
      }
    }
  }, [dispatch, apiKey, pinataJwt]);

  useEffect(() => {
    if (apiKey) setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (pinataJwt) setLocalPinataJwt(pinataJwt);
  }, [pinataJwt]);

  useEffect(() => {
    return () => {
      if (imageLocalPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imageLocalPreviewUrl);
      }
    };
  }, [imageLocalPreviewUrl]);

  const setLocalImagePreview = (file: File | null) => {
    setImageFile(file);
    setImageLocalPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setImageUploadError(null);
  };

  const resolveWalletDrep = useCallback(async () => {
    if (!isWalletConnected || !walletName) {
      setWalletDerivedDrep(null);
      setDrepResolveError(null);
      return;
    }
    setDrepResolveError(null);
    try {
      const api = await enableWalletWithCip95(walletName);
      const resolved = await deriveDRepFromWallet(api);
      if (!resolved || resolved.kind !== 'key') {
        setWalletDerivedDrep(null);
        setDrepResolveError(
          'Could not derive a key-based DRep ID from this wallet. Ensure CIP-95 is enabled.'
        );
        return;
      }
      setWalletDerivedDrep(resolved);
    } catch (err: unknown) {
      setWalletDerivedDrep(null);
      setDrepResolveError(err instanceof Error ? err.message : 'Failed to resolve DRep from wallet');
    }
  }, [isWalletConnected, walletName]);

  useEffect(() => {
    void resolveWalletDrep();
  }, [resolveWalletDrep]);

  const refreshRegistrationStatus = useCallback(async () => {
    if (!blockfrostReady || !apiKey || !walletDerivedDrep) {
      setRegistrationStatus(null);
      return;
    }
    setStatusLoading(true);
    setStatusError(null);
    try {
      const result = await fetchDrepRegistrationStatus(apiKey, walletDerivedDrep.drepIdBech32);
      setRegistrationStatus(result.status);
    } catch (err: unknown) {
      setRegistrationStatus(null);
      setStatusError(err instanceof Error ? err.message : 'Failed to check registration status');
    } finally {
      setStatusLoading(false);
    }
  }, [blockfrostReady, apiKey, walletDerivedDrep]);

  useEffect(() => {
    void refreshRegistrationStatus();
  }, [refreshRegistrationStatus]);

  const txMode = registrationStatus ? resolveDrepMetadataTxMode(registrationStatus) : null;

  const previewMetadata = useMemo(() => formInputToDrepMetadata(form), [form]);

  const profilePreviewSrc = useMemo(
    () => profileImagePreviewUrl(form.imageContentUrl, imageLocalPreviewUrl),
    [form.imageContentUrl, imageLocalPreviewUrl]
  );

  const rawJsonPreview = useMemo(() => {
    try {
      const bytes = buildCip119MetadataBytes(form);
      return new TextDecoder().decode(bytes);
    } catch {
      return null;
    }
  }, [form]);

  const handleApplyBlockfrostKey = () => {
    const key = localApiKey.trim();
    if (!key) return;
    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: key }));
    saveBlockfrostApiKeyToStorage(key);
    if (!hasBlockfrostApiKeyInUrl()) {
      const url = new URL(window.location.href);
      url.searchParams.set('blockfrostApiKey', key);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleApplyPinataJwt = () => {
    const jwt = localPinataJwt.trim();
    dispatch(setPinataConfig({ usePinata: Boolean(jwt), jwt: jwt || null }));
    if (jwt) saveDRepMetadataConfigToStorage({ pinataJwt: jwt });
  };

  const handleLoadCachedPinata = () => {
    const cached =
      getDRepMetadataConfigFromStorage()?.pinataJwt ?? getBulkVoteConfigFromStorage()?.pinataJwt;
    if (cached) {
      dispatch(setPinataConfig({ usePinata: true, jwt: cached }));
      setLocalPinataJwt(cached);
    }
  };

  const updateForm = (partial: Partial<DrepMetadataFormInput>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleLoadExisting = async () => {
    if (!blockfrostReady || !apiKey || !walletDerivedDrep) return;
    setLoadExistingLoading(true);
    setLoadExistingError(null);
    try {
      const result = await ensureDrepMetadataDocCached({
        drepId: walletDerivedDrep.drepIdBech32,
        apiKey,
      });
      if (result.metadata) {
        setForm(drepMetadataToFormInput(result.metadata));
      } else {
        setLoadExistingError('No existing metadata found for this DRep.');
      }
    } catch (err: unknown) {
      setLoadExistingError(err instanceof Error ? err.message : 'Failed to load existing metadata');
    } finally {
      setLoadExistingLoading(false);
    }
  };

  const handleComputeImageHash = async () => {
    const url = form.imageContentUrl?.trim();
    if (!url) return;
    setImageHashLoading(true);
    setImageHashError(null);
    try {
      const hash = await sha256HexFromUrl(url);
      updateForm({ imageSha256: hash });
    } catch (err: unknown) {
      setImageHashError(
        err instanceof Error
          ? `${err.message} — enter sha256 manually or use a CORS-accessible image URL.`
          : 'Could not compute image hash'
      );
    } finally {
      setImageHashLoading(false);
    }
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLocalImagePreview(file);
    event.target.value = '';
  };

  const handleUploadImageToPinata = async () => {
    const jwt = (pinataJwt || localPinataJwt).trim();
    if (!jwt) {
      setImageUploadError('Pinata JWT is required. Set it on the Connect step.');
      return;
    }
    if (!imageFile) {
      setImageUploadError('Choose an image file first.');
      return;
    }

    setImageUploading(true);
    setImageUploadError(null);
    try {
      const uploaded = await uploadImageToPinata(jwt, imageFile);
      updateForm({
        imageContentUrl: uploaded.url,
        imageSha256: uploaded.sha256Hex,
      });
      setLocalImagePreview(null);
      setImageFile(null);
    } catch (err: unknown) {
      setImageUploadError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const goToPreview = () => {
    const errors = validateCip119Form(form);
    setFormErrors(errors.map((e) => e.message));
    if (errors.length > 0) return;
    try {
      const bytes = buildCip119MetadataBytes(form);
      setMetadataBytes(bytes);
      setStep('preview');
    } catch (err: unknown) {
      setFormErrors([err instanceof Error ? err.message : 'Invalid form']);
    }
  };

  const goToPublish = () => {
    if (!metadataBytes) {
      try {
        setMetadataBytes(buildCip119MetadataBytes(form));
      } catch {
        return;
      }
    }
    setStep('publish');
  };

  const handleUploadToPinata = async () => {
    const jwt = (pinataJwt || localPinataJwt).trim();
    if (!jwt) {
      setUploadError('Pinata JWT is required.');
      return;
    }
    let bytes = metadataBytes;
    if (!bytes) {
      try {
        bytes = buildCip119MetadataBytes(form);
        setMetadataBytes(bytes);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : 'Invalid metadata');
        return;
      }
    }
    setUploading(true);
    setUploadError(null);
    try {
      const filename = drepMetadataDownloadFilename(form.givenName, walletDerivedDrep?.drepIdBech32 ?? 'drep');
      const uploaded = await uploadJsonToPinata(jwt, bytes, filename);
      const hashHex = hashGovernanceAnchorBytes(bytes);
      setAnchorUrl(uploaded.url);
      setAnchorHashHex(hashHex);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRecomputeHash = () => {
    let bytes = metadataBytes;
    if (!bytes) {
      try {
        bytes = buildCip119MetadataBytes(form);
        setMetadataBytes(bytes);
      } catch {
        return;
      }
    }
    setAnchorHashHex(hashGovernanceAnchorBytes(bytes));
  };

  const goToSubmit = async () => {
    const url = anchorUrl.trim();
    const hash = anchorHashHex.trim().replace(/^0x/i, '');
    if (!url || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      setUploadError('Set a valid anchor URL and 64-character hash before submitting.');
      return;
    }
    setUploadError(null);
    if (blockfrostReady && apiKey) {
      try {
        const params = await fetchProtocolParametersSnapshot(apiKey);
        setKeyDepositLovelace(params.keyDeposit);
      } catch {
        setKeyDepositLovelace(BigInt(2_000_000));
      }
    }
    setStep('submit');
  };

  const handleSubmit = async () => {
    if (!walletName || !walletAddress || !walletDerivedDrep || walletDerivedDrep.kind !== 'key') {
      setSubmitError('Connect a CIP-95 wallet with a key-based DRep.');
      return;
    }
    if (!blockfrostReady || !apiKey) {
      setSubmitError('Blockfrost API key is required.');
      return;
    }
    if (!txMode) {
      setSubmitError('Could not determine registration mode.');
      return;
    }
    const url = anchorUrl.trim();
    const hash = anchorHashHex.trim().replace(/^0x/i, '');
    if (!url || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      setSubmitError('Anchor URL and hash are required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const api = await enableWalletWithCip95(walletName);
      const params = await fetchProtocolParametersSnapshot(apiKey);
      setKeyDepositLovelace(params.keyDeposit);

      const result = await buildAndSubmitDrepMetadataTx({
        api,
        params,
        changeAddressBech32: walletAddress,
        drepKeyHashHex: walletDerivedDrep.keyHashHex,
        mode: txMode,
        anchor: { url, hashHex: hash },
      });

      setSubmittedTxHash(result.txHash);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const statusColors = statusColor(registrationStatus);

  return (
    <div className="min-h-screen" style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>DRep Metadata Setter</h1>
      <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
        Author CIP-119 profile metadata, publish to IPFS via Pinata, and register or update your DRep on mainnet.
      </p>

      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {STEPS.map((s, i) => (
          <span
            key={s}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              background: i <= stepIndex ? '#1e3a5f' : '#1f2937',
              color: i <= stepIndex ? '#93c5fd' : '#6b7280',
              border: i === stepIndex ? '1px solid #3b82f6' : '1px solid #374151',
            }}
          >
            {i + 1}. {STEP_LABELS[s]}
          </span>
        ))}
      </nav>

      {step === 'connect' && (
        <div>
          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Blockfrost API key</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              Used for protocol parameters and registration status.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="Blockfrost project_id"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                style={{ ...fieldStyle, flex: '1 1 240px' }}
              />
              <Button onClick={handleApplyBlockfrostKey}>Set key</Button>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Pinata JWT</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              Used to upload metadata JSON to IPFS (stored in this browser when set).
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="Pinata JWT"
                value={localPinataJwt}
                onChange={(e) => setLocalPinataJwt(e.target.value)}
                style={{ ...fieldStyle, flex: '1 1 240px' }}
              />
              <Button onClick={handleApplyPinataJwt}>Set JWT</Button>
            </div>
            {!pinataReady && (getDRepMetadataConfigFromStorage()?.pinataJwt || getBulkVoteConfigFromStorage()?.pinataJwt) && (
              <button
                type="button"
                onClick={handleLoadCachedPinata}
                style={{
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#7dd3fc',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Load cached Pinata JWT
              </button>
            )}
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Wallet (CIP-95)</h2>
            <ConnectWallet />
            {drepResolveError && (
              <p style={{ color: '#fca5a5', marginTop: '0.75rem' }}>{drepResolveError}</p>
            )}
            {walletDerivedDrep && (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                  DRep ID:{' '}
                  <code style={{ color: '#93c5fd', wordBreak: 'break-all' }}>
                    {walletDerivedDrep.drepIdBech32}
                  </code>
                </p>
                {statusLoading && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Checking registration…</p>}
                {statusError && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{statusError}</p>}
                {registrationStatus && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '0.35rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      background: statusColors.bg,
                      color: statusColors.fg,
                    }}
                  >
                    {statusLabel(registrationStatus)}
                    {txMode === 'register' && registrationStatus !== 'unregistered' && ' — re-registration'}
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => setStep('profile')}
            disabled={!blockfrostReady || !isWalletConnected || !walletDerivedDrep}
          >
            Continue to profile
          </Button>
        </div>
      )}

      {step === 'profile' && (
        <div>
          {registrationStatus === 'active' && blockfrostReady && (
            <div style={{ marginBottom: '1rem' }}>
              <Button onClick={() => void handleLoadExisting()} disabled={loadExistingLoading}>
                {loadExistingLoading ? 'Loading…' : 'Load existing metadata'}
              </Button>
              {loadExistingError && (
                <p style={{ color: '#fca5a5', marginTop: '0.5rem', fontSize: '0.9rem' }}>{loadExistingError}</p>
              )}
            </div>
          )}

          <div style={sectionStyle}>
            <label style={labelStyle}>
              Given name <span style={{ color: '#f87171' }}>*</span> (max 80 chars)
            </label>
            <input
              value={form.givenName}
              onChange={(e) => updateForm({ givenName: e.target.value })}
              style={fieldStyle}
              maxLength={80}
            />
          </div>

          {(['objectives', 'motivations', 'qualifications'] as const).map((field) => (
            <div key={field} style={sectionStyle}>
              <label style={labelStyle}>
                {field.charAt(0).toUpperCase() + field.slice(1)} (max 1000 chars)
              </label>
              <textarea
                value={form[field] ?? ''}
                onChange={(e) => updateForm({ [field]: e.target.value })}
                rows={4}
                maxLength={1000}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>
          ))}

          <div style={sectionStyle}>
            <label style={labelStyle}>Payment address (optional Bech32)</label>
            <input
              value={form.paymentAddress ?? ''}
              onChange={(e) => updateForm({ paymentAddress: e.target.value })}
              style={fieldStyle}
            />
          </div>

          <div style={sectionStyle}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.doNotList === true}
                onChange={(e) => updateForm({ doNotList: e.target.checked })}
              />
              doNotList — opt out of campaign/directory listing
            </label>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Profile image</h3>

            {profilePreviewSrc && (
              <img
                src={profilePreviewSrc}
                alt="Profile preview"
                style={{
                  display: 'block',
                  maxWidth: '120px',
                  maxHeight: '120px',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  objectFit: 'cover',
                  border: '1px solid #374151',
                }}
              />
            )}

            <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: 0 }}>
              Upload an avatar to IPFS (JPEG, PNG, WebP, or GIF, max 5 MB). sha256 is computed automatically.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'inline-block',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #4b5563',
                  background: '#1f2937',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Choose image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              {imageFile && (
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                  {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
                </span>
              )}
              <Button
                onClick={() => void handleUploadImageToPinata()}
                disabled={imageUploading || !imageFile}
              >
                {imageUploading ? 'Uploading…' : 'Upload to IPFS via Pinata'}
              </Button>
            </div>
            {imageUploadError && (
              <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 0 }}>{imageUploadError}</p>
            )}
            {!pinataReady && imageFile && (
              <p style={{ color: '#fcd34d', fontSize: '0.85rem' }}>
                Set a Pinata JWT on the Connect step before uploading.
              </p>
            )}

            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '1rem 0 0.5rem' }}>
              Or enter a URL manually
            </p>
            <label style={labelStyle}>Image URL</label>
            <input
              value={form.imageContentUrl ?? ''}
              onChange={(e) => {
                updateForm({ imageContentUrl: e.target.value });
                setImageUploadError(null);
              }}
              style={fieldStyle}
              placeholder="https://… or ipfs://…"
            />
            <label style={{ ...labelStyle, marginTop: '0.75rem' }}>sha256 (recommended for remote URLs)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                value={form.imageSha256 ?? ''}
                onChange={(e) => updateForm({ imageSha256: e.target.value })}
                style={{ ...fieldStyle, flex: '1 1 280px' }}
                placeholder="64-char hex"
              />
              <Button
                onClick={() => void handleComputeImageHash()}
                disabled={imageHashLoading || !form.imageContentUrl?.trim()}
              >
                {imageHashLoading ? 'Computing…' : 'Compute from URL'}
              </Button>
            </div>
            {imageHashError && <p style={{ color: '#fcd34d', fontSize: '0.85rem', marginTop: '0.5rem' }}>{imageHashError}</p>}
            {form.imageContentUrl?.trim() && !form.imageSha256?.trim() && (
              <p style={{ color: '#fcd34d', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                CIP-119 recommends sha256 for remote image URLs.
              </p>
            )}
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>References</h3>
            {(form.references ?? []).map((ref, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #374151',
                }}
              >
                <select
                  value={ref.type}
                  onChange={(e) => {
                    const refs = [...(form.references ?? [])];
                    refs[idx] = { ...refs[idx], type: e.target.value };
                    updateForm({ references: refs });
                  }}
                  style={fieldStyle}
                >
                  <option value="Link">Link</option>
                  <option value="Identity">Identity</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  placeholder="Label"
                  value={ref.label}
                  onChange={(e) => {
                    const refs = [...(form.references ?? [])];
                    refs[idx] = { ...refs[idx], label: e.target.value };
                    updateForm({ references: refs });
                  }}
                  style={fieldStyle}
                />
                <input
                  placeholder="URI"
                  value={ref.uri}
                  onChange={(e) => {
                    const refs = [...(form.references ?? [])];
                    refs[idx] = { ...refs[idx], uri: e.target.value };
                    updateForm({ references: refs });
                  }}
                  style={fieldStyle}
                />
                <button
                  type="button"
                  onClick={() => {
                    const refs = (form.references ?? []).filter((_, i) => i !== idx);
                    updateForm({ references: refs });
                  }}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textAlign: 'left' }}
                >
                  Remove
                </button>
              </div>
            ))}
            <Button
              onClick={() => updateForm({ references: [...(form.references ?? []), emptyReference()] })}
            >
              Add reference
            </Button>
          </div>

          {formErrors.length > 0 && (
            <ul style={{ color: '#fca5a5', marginBottom: '1rem' }}>
              {formErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button onClick={() => setStep('connect')}>Back</Button>
            <Button onClick={goToPreview}>Preview</Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#d1d5db' }}>
            <input type="checkbox" checked={showRawJson} onChange={(e) => setShowRawJson(e.target.checked)} />
            Show raw JSON
          </label>

          {showRawJson && rawJsonPreview ? (
            <pre
              style={{
                background: '#111827',
                padding: '1rem',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '0.8rem',
                maxHeight: '480px',
              }}
            >
              {rawJsonPreview}
            </pre>
          ) : (
            <div style={sectionStyle}>
              <DRepMetadataView metadata={previewMetadata} />
            </div>
          )}

          {metadataBytes && (
            <Button
              style={{ marginTop: '0.75rem' }}
              onClick={() =>
                downloadJson(
                  JSON.parse(new TextDecoder().decode(metadataBytes)),
                  drepMetadataDownloadFilename(form.givenName, walletDerivedDrep?.drepIdBech32 ?? 'drep')
                )
              }
            >
              Download JSON
            </Button>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Button onClick={() => setStep('profile')}>Back</Button>
            <Button onClick={goToPublish}>Publish to IPFS</Button>
          </div>
        </div>
      )}

      {step === 'publish' && (
        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Upload metadata</h3>
            {!pinataReady && (
              <p style={{ color: '#fcd34d', fontSize: '0.9rem' }}>
                Set a Pinata JWT on the Connect step, or enter anchor details manually below.
              </p>
            )}
            <Button onClick={() => void handleUploadToPinata()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload to IPFS via Pinata'}
            </Button>
            {uploadError && <p style={{ color: '#fca5a5', marginTop: '0.5rem' }}>{uploadError}</p>}
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Anchor URL</label>
            <input value={anchorUrl} onChange={(e) => setAnchorUrl(e.target.value)} style={fieldStyle} />
            <label style={{ ...labelStyle, marginTop: '0.75rem' }}>Anchor hash (blake2b-256, 64 hex)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                value={anchorHashHex}
                onChange={(e) => setAnchorHashHex(e.target.value)}
                style={{ ...fieldStyle, flex: '1 1 280px' }}
              />
              <Button onClick={handleRecomputeHash}>Recompute hash</Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button onClick={() => setStep('preview')}>Back</Button>
            <Button onClick={() => void goToSubmit()}>Continue to submit</Button>
          </div>
        </div>
      )}

      {step === 'submit' && (
        <div>
          {submittedTxHash ? (
            <div style={{ ...sectionStyle, borderColor: '#166534' }}>
              <h3 style={{ marginTop: 0, color: '#86efac' }}>Transaction submitted</h3>
              <p>
                Tx hash:{' '}
                <a
                  href={`https://cardanoscan.io/transaction/${submittedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#7dd3fc' }}
                >
                  {submittedTxHash}
                </a>
              </p>
              {walletDerivedDrep && (
                <p>
                  <Link to={`/drephistory/${encodeURIComponent(walletDerivedDrep.drepIdBech32)}`} style={{ color: '#93c5fd' }}>
                    View DRep voting history
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <>
              <div style={sectionStyle}>
                <h3 style={{ marginTop: 0 }}>Confirm on-chain submission</h3>
                <p style={{ color: '#d1d5db', fontSize: '0.95rem' }}>
                  Mode:{' '}
                  <strong>{txMode === 'register' ? 'Register DRep' : 'Update metadata'}</strong>
                </p>
                {txMode === 'register' && (
                  <p style={{ color: '#fcd34d', fontSize: '0.9rem' }}>
                    Registration requires a key deposit of approximately{' '}
                    {keyDepositLovelace !== null
                      ? `${Number(keyDepositLovelace) / 1_000_000} ADA`
                      : '2 ADA'}{' '}
                    plus transaction fees.
                  </p>
                )}
                {(registrationStatus === 'retired' || registrationStatus === 'expired') && (
                  <p style={{ color: '#fcd34d', fontSize: '0.9rem' }}>
                    Your DRep is {registrationStatus}. This transaction will re-register with new metadata.
                  </p>
                )}
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', wordBreak: 'break-all' }}>
                  Anchor: {anchorUrl}
                  <br />
                  Hash: {anchorHashHex}
                </p>
              </div>

              {submitError && <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{submitError}</p>}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button onClick={() => setStep('publish')}>Back</Button>
                <Button onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting ? 'Signing…' : 'Sign and submit'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DRepMetadataEditor;
