import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConnectWallet from '../components/ConnectWallet';
import { Button } from '../components/Button';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import '../simple.css';
import {
  GOVERNANCE_TYPES,
  fetchAllPages,
  fetchLiveGovernanceActions,
  formatGovActionType,
  isVotableGovernanceAction,
  truncateHash,
  type GovernanceType,
  type LiveGovernanceAction,
} from '../functions/governanceActionsFetch';
import { fetchProtocolParametersSnapshot } from '../functions/blockfrostProtocolParams';
import {
  deriveDRepFromWallet,
  enableWalletWithCip95,
  resolveManualDRep,
  type ResolvedDRep,
} from '../functions/drepCredential';
import { buildAndSubmitBulkVotes, type BulkVoteAnchor, type BulkVoteEntry } from '../functions/bulkVote';
import { downloadJson } from '../functions/downloadJson';
import { buildCip100RationaleBytes, hashGovernanceAnchorBytes } from '../functions/cip100RationaleDocument';
import { uploadJsonToPinata } from '../functions/pinataUpload';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { setPinataConfig } from '../store/pinataSlice';
import {
  getBlockfrostApiKeyFromStorage,
  getBulkVoteConfigFromStorage,
  hasBlockfrostApiKeyInUrl,
  saveBulkVoteConfigToStorage,
} from '../utils/toolConfigStorage';
import { IpfsLinkModal } from '../components/IpfsLinkModal';
import '../components/IpfsLinkModal.css';
import { parseIpfsLink } from '../utils/ipfsGateways';

type UserVote = 'yes' | 'no' | 'abstain' | 'skip';

type SortOption = 'none' | 'amount_asc' | 'amount_desc';

interface BlockfrostDRepVote {
  tx_hash: string;
  cert_index: number;
  proposal_id: string;
  proposal_tx_hash: string;
  proposal_cert_index: number;
  vote: string;
}

function actionKey(a: { txHash: string; certIndex: number }): string {
  return `${a.txHash}#${a.certIndex}`;
}

function governanceStatusLabel(action: LiveGovernanceAction): string | null {
  if (action.enactedEpoch !== null) return 'Enacted';
  if (action.expiredEpoch !== null) return 'Expired';
  if (action.droppedEpoch !== null) return 'Dropped';
  if (action.ratifiedEpoch !== null) return 'Ratified';
  return null;
}

function typeColor(type: GovernanceType): { bg: string; fg: string } {
  switch (type) {
    case 'treasury_withdrawals':
      return { bg: '#022c22', fg: '#34d399' };
    case 'parameter_change':
      return { bg: '#1e1b4b', fg: '#a5b4fc' };
    case 'hard_fork_initiation':
      return { bg: '#3f1d2e', fg: '#f9a8d4' };
    case 'new_committee':
      return { bg: '#172554', fg: '#93c5fd' };
    case 'new_constitution':
      return { bg: '#3f2a00', fg: '#facc15' };
    case 'no_confidence':
      return { bg: '#450a0a', fg: '#fca5a5' };
    case 'info_action':
      return { bg: '#1f2937', fg: '#d1d5db' };
    default:
      return { bg: '#111827', fg: '#d1d5db' };
  }
}

interface BulkVoteReceipt {
  receiptType: 'cardano_drep_bulk_vote';
  submittedAt: string;
  network: 'cardano-mainnet';
  txHash: string;
  cardanoscan: string;
  drepIdBech32: string;
  drepSource: string;
  anchorAttached: boolean;
  anchorUrl: string | null;
  anchorHashHex: string | null;
  rationaleUploadedViaPinata: boolean;
  rationaleIpfsUrl: string | null;
  metadataAttached: boolean;
  metadata674: string[] | null;
  votes: BulkVoteEntry[];
}

const receiptFilename = (txHash: string) =>
  `drep_bulk_vote_receipt_${txHash.slice(0, 12)}_${Date.now()}.json`;

interface IpfsModalState {
  url: string;
  hashHex?: string;
  title: string;
}

const ipfsGatewayButtonStyle: React.CSSProperties = {
  color: '#7dd3fc',
  textDecoration: 'underline',
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontSize: 'inherit',
  fontWeight: 500,
};

const ANCHOR_ATTACH_PARAM = 'anchor';
const ANCHOR_URL_PARAM = 'anchorUrl';
const ANCHOR_HASH_PARAM = 'anchorHash';
const PINATA_JWT_PARAM = 'pinataJwt';

function readAnchorFromUrl(): {
  attachAnchor: boolean;
  anchorUrl: string;
  anchorHashHex: string;
  hasAnchorParams: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  const anchorUrl = params.get(ANCHOR_URL_PARAM) ?? '';
  const anchorHashHex = params.get(ANCHOR_HASH_PARAM) ?? '';
  const attachAnchor =
    params.get(ANCHOR_ATTACH_PARAM) === '1' || Boolean(anchorUrl) || Boolean(anchorHashHex);
  const hasAnchorParams =
    params.has(ANCHOR_ATTACH_PARAM) || params.has(ANCHOR_URL_PARAM) || params.has(ANCHOR_HASH_PARAM);
  return { attachAnchor, anchorUrl, anchorHashHex, hasAnchorParams };
}

function syncAnchorToUrl(
  persist: boolean,
  attachAnchor: boolean,
  anchorUrl: string,
  anchorHashHex: string
): void {
  const url = new URL(window.location.href);
  if (!persist) {
    url.searchParams.delete(ANCHOR_ATTACH_PARAM);
    url.searchParams.delete(ANCHOR_URL_PARAM);
    url.searchParams.delete(ANCHOR_HASH_PARAM);
  } else {
    if (attachAnchor) url.searchParams.set(ANCHOR_ATTACH_PARAM, '1');
    else url.searchParams.delete(ANCHOR_ATTACH_PARAM);
    const u = anchorUrl.trim();
    if (u) url.searchParams.set(ANCHOR_URL_PARAM, u);
    else url.searchParams.delete(ANCHOR_URL_PARAM);
    const h = anchorHashHex.trim().replace(/^0x/i, '');
    if (h) url.searchParams.set(ANCHOR_HASH_PARAM, h);
    else url.searchParams.delete(ANCHOR_HASH_PARAM);
  }
  window.history.replaceState({}, '', url.toString());
}

const initialAnchorFromUrl = readAnchorFromUrl();
const initialUrlHadPinataJwt = new URLSearchParams(window.location.search).has(PINATA_JWT_PARAM);

const DRepBulkVote: React.FC = () => {
  const dispatch = useAppDispatch();
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const { useBlockfrost, apiKey } = useAppSelector((state) => state.blockfrost);
  const { usePinata, jwt: pinataJwt } = useAppSelector((state) => state.pinata);

  const blockfrostReady = Boolean(useBlockfrost && apiKey);
  const pinataReady = Boolean(usePinata && pinataJwt);

  const [actions, setActions] = useState<LiveGovernanceAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<'all' | GovernanceType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('none');
  const [showOnlyChainUnvoted, setShowOnlyChainUnvoted] = useState(false);
  const [includeRecentRatified, setIncludeRecentRatified] = useState(false);

  const [userVotes, setUserVotes] = useState<Record<string, UserVote>>({});

  const [walletDerivedDrep, setWalletDerivedDrep] = useState<ResolvedDRep | null>(null);
  const [drepResolveError, setDrepResolveError] = useState<string | null>(null);
  const [overrideDrep, setOverrideDrep] = useState(false);
  const [manualDrepInput, setManualDrepInput] = useState('');

  const [chainVoteByKey, setChainVoteByKey] = useState<Record<string, string | null>>({});
  const [chainVotesLoading, setChainVotesLoading] = useState(false);

  const [attachAnchor, setAttachAnchor] = useState(initialAnchorFromUrl.attachAnchor);
  const [anchorUrl, setAnchorUrl] = useState(initialAnchorFromUrl.anchorUrl);
  const [anchorHashHex, setAnchorHashHex] = useState(initialAnchorFromUrl.anchorHashHex);
  const [persistAnchorInUrl, setPersistAnchorInUrl] = useState(initialAnchorFromUrl.hasAnchorParams);
  const [persistPinataInUrl, setPersistPinataInUrl] = useState(initialUrlHadPinataJwt);
  const [showLoadCachedSettings, setShowLoadCachedSettings] = useState(false);
  const [includeNote, setIncludeNote] = useState(false);
  const [noteText, setNoteText] = useState("casting drep votes - using $computerman bulk vote tool");
  const [localPinataJwt, setLocalPinataJwt] = useState(pinataJwt ?? '');
  const [rationaleText, setRationaleText] = useState('');
  const [rationaleUploading, setRationaleUploading] = useState(false);
  const [rationaleUploadError, setRationaleUploadError] = useState<string | null>(null);
  const [pinataUploadResult, setPinataUploadResult] = useState<{ url: string; hashHex: string } | null>(null);
  const [ipfsModal, setIpfsModal] = useState<IpfsModalState | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<BulkVoteReceipt | null>(null);

  const effectiveDrep: ResolvedDRep | null = useMemo(() => {
    if (overrideDrep && manualDrepInput.trim()) {
      try {
        return resolveManualDRep(manualDrepInput.trim());
      } catch {
        return null;
      }
    }
    return walletDerivedDrep;
  }, [overrideDrep, manualDrepInput, walletDerivedDrep]);

  const effectiveDrepId = effectiveDrep?.drepIdBech32 ?? null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPinataJwt = params.get(PINATA_JWT_PARAM);
    if (urlPinataJwt) {
      dispatch(setPinataConfig({ usePinata: true, jwt: urlPinataJwt }));
      setLocalPinataJwt(urlPinataJwt);
      saveBulkVoteConfigToStorage({ pinataJwt: urlPinataJwt });
    }
    if (initialAnchorFromUrl.hasAnchorParams) {
      saveBulkVoteConfigToStorage({
        anchor: {
          attachAnchor: initialAnchorFromUrl.attachAnchor,
          anchorUrl: initialAnchorFromUrl.anchorUrl,
          anchorHashHex: initialAnchorFromUrl.anchorHashHex,
        },
      });
    }
  }, [dispatch]);

  useEffect(() => {
    if (pinataJwt) setLocalPinataJwt(pinataJwt);
  }, [pinataJwt]);

  useEffect(() => {
    if (attachAnchor && (anchorUrl.trim() || anchorHashHex.trim())) {
      saveBulkVoteConfigToStorage({
        anchor: { attachAnchor, anchorUrl, anchorHashHex },
      });
    }
  }, [attachAnchor, anchorUrl, anchorHashHex]);

  useEffect(() => {
    syncAnchorToUrl(persistAnchorInUrl, attachAnchor, anchorUrl, anchorHashHex);
  }, [persistAnchorInUrl, attachAnchor, anchorUrl, anchorHashHex]);

  useEffect(() => {
    const cachedBlockfrost = getBlockfrostApiKeyFromStorage();
    const cachedBulk = getBulkVoteConfigFromStorage();
    const urlHadBlockfrost = hasBlockfrostApiKeyInUrl();
    const anchorActive =
      attachAnchor && Boolean(anchorUrl.trim() || anchorHashHex.trim());
    const canLoadBlockfrost = !blockfrostReady && Boolean(cachedBlockfrost) && !urlHadBlockfrost;
    const canLoadPinata =
      !pinataReady && Boolean(cachedBulk?.pinataJwt) && !initialUrlHadPinataJwt;
    const canLoadAnchor =
      Boolean(cachedBulk?.anchor) && !initialAnchorFromUrl.hasAnchorParams && !anchorActive;
    setShowLoadCachedSettings(canLoadBlockfrost || canLoadPinata || canLoadAnchor);
  }, [blockfrostReady, pinataReady, attachAnchor, anchorUrl, anchorHashHex]);

  useEffect(() => {
    if (!blockfrostReady || !apiKey) {
      setActions([]);
      setUserVotes({});
      return;
    }
    let cancelled = false;
    (async () => {
      setActionsLoading(true);
      setActionsError(null);
      try {
        const loaded = await fetchLiveGovernanceActions(apiKey, {
          includeRecentRatified,
          onPartial: (partial) => {
            if (!cancelled) setActions(partial);
          },
        });
        if (!cancelled) setActions(loaded);
      } catch (e: any) {
        if (!cancelled) setActionsError(e?.message || 'Failed to load governance actions');
      } finally {
        if (!cancelled) setActionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blockfrostReady, apiKey, includeRecentRatified]);

  useEffect(() => {
    setUserVotes((prev) => {
      const next = { ...prev };
      for (const a of actions) {
        const k = actionKey(a);
        if (next[k] === undefined) next[k] = 'skip';
      }
      return next;
    });
  }, [actions]);

  useEffect(() => {
    if (!isWalletConnected || !walletName) {
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
            'This wallet does not expose CIP-95 getPubDRepKey (extension may have been declined). Use manual DRep override or approve CIP-95 in a CIP-95-capable wallet (e.g. Eternl, Lace).'
          );
          return;
        }
        setWalletDerivedDrep(derived);
        setDrepResolveError(null);
      } catch (e: any) {
        if (!cancelled) {
          setWalletDerivedDrep(null);
          setDrepResolveError(e?.message || 'Failed to read DRep key from wallet');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isWalletConnected, walletName]);

  useEffect(() => {
    if (!blockfrostReady || !apiKey || !effectiveDrepId || effectiveDrep?.kind !== 'key') {
      setChainVoteByKey({});
      return;
    }
    let cancelled = false;
    (async () => {
      setChainVotesLoading(true);
      try {
        const rows = await fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${effectiveDrepId}/votes`, apiKey);
        if (cancelled) return;
        const m: Record<string, string | null> = {};
        for (const r of rows) {
          m[`${r.proposal_tx_hash}#${r.proposal_cert_index}`] = r.vote;
        }
        setChainVoteByKey(m);
      } catch (e) {
        console.warn('Could not load on-chain vote history', e);
        if (!cancelled) setChainVoteByKey({});
      } finally {
        if (!cancelled) setChainVotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blockfrostReady, apiKey, effectiveDrepId, effectiveDrep?.kind]);

  const filteredActions = useMemo(() => {
    let base =
      selectedType === 'all' ? [...actions] : actions.filter((a) => a.governanceType === selectedType);

    if (selectedType === 'treasury_withdrawals') {
      if (sortOption === 'amount_asc') {
        base.sort((a, b) => (a.treasuryWithdrawalTotalLovelace ?? 0) - (b.treasuryWithdrawalTotalLovelace ?? 0));
      } else if (sortOption === 'amount_desc') {
        base.sort((a, b) => (b.treasuryWithdrawalTotalLovelace ?? 0) - (a.treasuryWithdrawalTotalLovelace ?? 0));
      }
    }

    if (showOnlyChainUnvoted && effectiveDrep?.kind === 'key') {
      base = base.filter((a) => {
        const v = chainVoteByKey[actionKey(a)];
        return v === undefined || v === null;
      });
    }

    return base;
  }, [actions, selectedType, sortOption, showOnlyChainUnvoted, chainVoteByKey, effectiveDrep?.kind]);

  const votePayloadCount = useMemo(() => {
    return actions.reduce((n, a) => {
      if (!isVotableGovernanceAction(a)) return n;
      const v = userVotes[actionKey(a)] ?? 'skip';
      return v === 'skip' ? n : n + 1;
    }, 0);
  }, [actions, userVotes]);

  const setVote = useCallback((key: string, v: UserVote) => {
    setUserVotes((prev) => ({ ...prev, [key]: v }));
  }, []);

  const applyToAllVisible = useCallback(
    (v: UserVote) => {
      setUserVotes((prev) => {
        const next = { ...prev };
        for (const a of filteredActions) {
          if (!isVotableGovernanceAction(a)) continue;
          next[actionKey(a)] = v;
        }
        return next;
      });
    },
    [filteredActions]
  );

  const handleApplyPinataJwt = () => {
    const nextJwt = localPinataJwt.trim();
    dispatch(setPinataConfig({ usePinata: Boolean(nextJwt), jwt: nextJwt || null }));
    if (nextJwt) {
      saveBulkVoteConfigToStorage({ pinataJwt: nextJwt });
    }
    if (persistPinataInUrl) {
      const url = new URL(window.location.href);
      if (nextJwt) url.searchParams.set(PINATA_JWT_PARAM, nextJwt);
      else url.searchParams.delete(PINATA_JWT_PARAM);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleLoadCachedSettings = () => {
    const cachedBlockfrost = getBlockfrostApiKeyFromStorage();
    if (cachedBlockfrost && !blockfrostReady) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: cachedBlockfrost }));
    }
    const cachedBulk = getBulkVoteConfigFromStorage();
    if (cachedBulk?.pinataJwt && !pinataReady) {
      dispatch(setPinataConfig({ usePinata: true, jwt: cachedBulk.pinataJwt }));
      setLocalPinataJwt(cachedBulk.pinataJwt);
    }
    if (cachedBulk?.anchor) {
      setAttachAnchor(cachedBulk.anchor.attachAnchor);
      setAnchorUrl(cachedBulk.anchor.anchorUrl);
      setAnchorHashHex(cachedBulk.anchor.anchorHashHex);
    }
  };

  const handleUploadRationale = async () => {
    setRationaleUploadError(null);
    setPinataUploadResult(null);

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
      const uploaded = await uploadJsonToPinata(jwt, bytes, `drep-bulk-vote-rationale-${Date.now()}.json`);

      setAnchorUrl(uploaded.url);
      setAnchorHashHex(hashHex);
      setAttachAnchor(true);
      setPinataUploadResult({ url: uploaded.url, hashHex });
    } catch (e: any) {
      setRationaleUploadError(e?.message || String(e));
    } finally {
      setRationaleUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmittedTxHash(null);
    setReceipt(null);

    if (!walletName || !walletAddress) {
      setSubmitError('Connect a wallet with a payment address.');
      return;
    }
    if (!apiKey) {
      setSubmitError('Blockfrost API key is required.');
      return;
    }
    if (!effectiveDrep) {
      setSubmitError('Could not resolve a DRep identity. Enable wallet override and enter a valid drep1… id if needed.');
      return;
    }
    if (effectiveDrep.kind === 'script') {
      setSubmitError('Script-hash DReps are not supported in this version of the tool.');
      return;
    }

    const entries: BulkVoteEntry[] = [];
    for (const a of actions) {
      if (!isVotableGovernanceAction(a)) continue;
      const k = actionKey(a);
      const choice = userVotes[k] ?? 'skip';
      if (choice === 'skip') continue;
      entries.push({ txHash: a.txHash, certIndex: a.certIndex, vote: choice });
    }

    if (!entries.length) {
      setSubmitError('Select at least one Yes, No, or Abstain vote (Skip is ignored).');
      return;
    }

    if (attachAnchor) {
      const u = anchorUrl.trim();
      const h = anchorHashHex.trim().replace(/^0x/i, '');
      if (!u) {
        setSubmitError('Anchor URL is required when anchor is enabled.');
        return;
      }
      if (!/^[0-9a-fA-F]{64}$/.test(h)) {
        setSubmitError('Anchor hash must be exactly 64 hex characters.');
        return;
      }
    }

    let anchor: BulkVoteAnchor | undefined;
    if (attachAnchor) {
      anchor = { url: anchorUrl.trim(), hashHex: anchorHashHex.trim().replace(/^0x/i, '') };
    }
    const rationaleUploadedViaPinata = Boolean(
      anchor &&
      pinataUploadResult &&
      anchor.url === pinataUploadResult.url &&
      anchor.hashHex.toLowerCase() === pinataUploadResult.hashHex.toLowerCase()
    );
    const metadata: string[] | undefined =
      includeNote && noteText.trim().length > 0
        ? [noteText.trim(), `bulk vote: ${entries.length} action(s)`]
        : undefined;

    setSubmitting(true);
    try {
      const api = await enableWalletWithCip95(walletName);

      const params = await fetchProtocolParametersSnapshot(apiKey);
      const result = await buildAndSubmitBulkVotes({
        api,
        params,
        changeAddressBech32: walletAddress,
        drepKeyHashHex: effectiveDrep.keyHashHex,
        votes: entries,
        anchor,
        metadata,
      });

      const r: BulkVoteReceipt = {
        receiptType: 'cardano_drep_bulk_vote',
        submittedAt: new Date().toISOString(),
        network: 'cardano-mainnet',
        txHash: result.txHash,
        cardanoscan: `https://cardanoscan.io/transaction/${result.txHash}`,
        drepIdBech32: effectiveDrep.drepIdBech32,
        drepSource: effectiveDrep.source + (overrideDrep ? ' (override)' : ''),
        anchorAttached: Boolean(anchor),
        anchorUrl: anchor?.url ?? null,
        anchorHashHex: anchor?.hashHex ?? null,
        rationaleUploadedViaPinata,
        rationaleIpfsUrl: rationaleUploadedViaPinata ? pinataUploadResult?.url ?? null : null,
        metadataAttached: Boolean(metadata?.length),
        metadata674: metadata ?? null,
        votes: entries,
      };

      downloadJson(r, receiptFilename(result.txHash));
      setReceipt(r);
      setSubmittedTxHash(result.txHash);
    } catch (e: any) {
      console.error(e);
      setSubmitError(e?.info?.message || e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const renderBlockfrostGate = () => {
    if (blockfrostReady) return null;
    return (
      <div
        style={{
          border: '1px solid #d97706',
          backgroundColor: '#3a2a05',
          color: '#fde68a',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        <strong>Blockfrost is required.</strong>
        <p style={{ margin: '0.5rem 0 0' }}>
          Open the wallet connect dialog and enable <em>Use Blockfrost API Key</em>, then enter your project id from{' '}
          <a href="https://blockfrost.io" target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd' }}>
            blockfrost.io
          </a>
          .
        </p>
      </div>
    );
  };

  return (
    <div className="commit-page">
      <div className="commit-page-inner" style={{ alignItems: 'stretch', maxWidth: '980px', marginInline: 'auto' }}>
        <div
          className="main-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'flex-start',
            width: '100%',
            paddingBottom: '6rem',
          }}
        >
          <h1>DRep bulk voting</h1>
          <p style={{ color: '#d1d5db', maxWidth: '720px' }}>
            Review live governance actions, pick Yes / No / Abstain per action, and submit many votes in one
            transaction. Your wallet must sign with its DRep key (CIP-95). Script DReps are not supported yet.
          </p>

          {showLoadCachedSettings && (
            <div
              style={{
                border: '1px solid #4b5563',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#0f172a',
                width: '100%',
              }}
            >
              <p style={{ margin: '0 0 0.75rem', color: '#d1d5db', fontSize: '0.9rem' }}>
                Saved settings from a previous visit are available in this browser.
              </p>
              <Button onClick={handleLoadCachedSettings}>Load saved settings from this browser</Button>
            </div>
          )}

          {!isWalletConnected && (
            <div style={{ width: '100%' }}>
              <ConnectWallet />
            </div>
          )}

          {isWalletConnected && (
            <>
              <ConnectWallet />
              <code style={{ wordBreak: 'break-all' }}>Change address: {walletAddress}</code>
            </>
          )}

          {renderBlockfrostGate()}

          {blockfrostReady && (
            <>
              <div
                style={{
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#0f172a',
                  width: '100%',
                }}
              >
                <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>DRep identity</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input type="checkbox" checked={overrideDrep} onChange={() => setOverrideDrep(!overrideDrep)} />
                  <span>Manual override (paste drep1…)</span>
                </label>
                {overrideDrep ? (
                  <input
                    type="text"
                    placeholder="drep1…"
                    value={manualDrepInput}
                    onChange={(e) => setManualDrepInput(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '640px',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #4b5563',
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                    }}
                  />
                ) : (
                  <div style={{ color: '#e5e7eb' }}>
                    {walletDerivedDrep ? (
                      <code style={{ wordBreak: 'break-all' }}>{walletDerivedDrep.drepIdBech32}</code>
                    ) : (
                      <span style={{ color: '#fca5a5' }}>{drepResolveError || 'Deriving DRep…'}</span>
                    )}
                  </div>
                )}
                {effectiveDrep?.kind === 'script' && (
                  <p style={{ color: '#fca5a5', marginTop: '0.5rem' }}>
                    This is a script DRep — on-chain voting from this tool is not supported yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#0f172a',
                  width: '100%',
                }}
              >
                <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Publish rationale to IPFS</h2>
                <p style={{ margin: '0 0 0.75rem', color: '#d1d5db', fontSize: '0.9rem', maxWidth: '720px' }}>
                  Upload a CIP-100 JSON-LD document (your text in <code>body.comment</code>) with Pinata, then use the
                  returned IPFS CID and computed blake2b-256 hash as the shared vote anchor.
                </p>
                <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '640px' }}>
                  <label style={{ display: 'block', fontWeight: 600 }}>Pinata JWT</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Enter your Pinata JWT"
                      value={localPinataJwt}
                      onChange={(e) => setLocalPinataJwt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPinataJwt()}
                      style={{
                        flex: '1 1 320px',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #4b5563',
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                      }}
                    />
                    <Button onClick={handleApplyPinataJwt}>Set Key</Button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={persistPinataInUrl}
                      onChange={() => setPersistPinataInUrl(!persistPinataInUrl)}
                    />
                    <span>Save Pinata JWT to URL (survives refresh)</span>
                  </label>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
                    Get a JWT from{' '}
                    <a
                      href="https://app.pinata.cloud/developers/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#93c5fd' }}
                    >
                      Pinata developer API keys
                    </a>
                    .
                  </p>
                  {pinataReady && (
                    <div
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#3a2a05',
                        border: '1px solid #d97706',
                        borderRadius: '6px',
                        color: '#fde68a',
                        fontSize: '0.8rem',
                      }}
                    >
                      Security notice: your Pinata JWT is saved in this browser and may be stored in the URL if
                      enabled above. Be careful when screensharing or sharing links.
                    </div>
                  )}
                  <label style={{ display: 'block', fontWeight: 600, marginTop: '0.5rem' }}>Rationale text</label>
                  <textarea
                    value={rationaleText}
                    onChange={(e) => setRationaleText(e.target.value)}
                    rows={6}
                    placeholder="Explain why you are voting this way (markdown supported)."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #4b5563',
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                    }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    <Button
                      onClick={handleUploadRationale}
                      disabled={rationaleUploading || !pinataReady || !rationaleText.trim()}
                    >
                      {rationaleUploading ? 'Uploading…' : 'Upload to IPFS'}
                    </Button>
                    {!pinataReady && (
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                        Set a Pinata JWT before uploading.
                      </span>
                    )}
                  </div>
                  {rationaleUploadError && (
                    <div style={{ color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{rationaleUploadError}</div>
                  )}
                  {pinataUploadResult && (
                    <div style={{ color: '#bbf7d0', fontSize: '0.85rem', display: 'grid', gap: '0.25rem' }}>
                      <div>
                        Uploaded: <code style={{ wordBreak: 'break-all' }}>{pinataUploadResult.url}</code>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setIpfsModal({
                              url: pinataUploadResult.url,
                              hashHex: pinataUploadResult.hashHex,
                              title: 'Open uploaded vote rationale',
                            })
                          }
                          style={ipfsGatewayButtonStyle}
                        >
                          Open via IPFS gateways
                        </button>
                      </div>
                      <div style={{ wordBreak: 'break-all' }}>
                        Hash: <code>{pinataUploadResult.hashHex}</code>
                      </div>
                      <div>The shared CIP-100 anchor fields below were updated from this upload.</div>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#0f172a',
                  width: '100%',
                }}
              >
                <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Optional CIP-100 anchor (shared)</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={attachAnchor} onChange={() => setAttachAnchor(!attachAnchor)} />
                  <span>Attach the same rationale anchor to every vote</span>
                </label>
                {attachAnchor && (
                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem', maxWidth: '640px' }}>
                    <input
                      type="url"
                      placeholder="https://… (metadata URL)"
                      value={anchorUrl}
                      onChange={(e) => setAnchorUrl(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #4b5563',
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="64-char hex blake2b-256 hash of anchor document"
                      value={anchorHashHex}
                      onChange={(e) => setAnchorHashHex(e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #4b5563',
                        backgroundColor: '#1e293b',
                        color: '#e5e7eb',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                      }}
                    />
                    {parseIpfsLink(anchorUrl) && (
                      <button
                        type="button"
                        onClick={() =>
                          setIpfsModal({
                            url: anchorUrl,
                            hashHex: anchorHashHex.trim() || undefined,
                            title: 'Open vote rationale',
                          })
                        }
                        style={ipfsGatewayButtonStyle}
                      >
                        Open via IPFS gateways
                      </button>
                    )}
                  </div>
                )}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={persistAnchorInUrl}
                    onChange={() => setPersistAnchorInUrl(!persistAnchorInUrl)}
                  />
                  <span>Save anchor details to URL (survives refresh)</span>
                </label>
                {persistAnchorInUrl && (
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
                    Anchor URL and hash are stored in the page link. Treat shared URLs as sensitive.
                  </p>
                )}
              </div>

              <div
                style={{
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#0f172a',
                  width: '100%',
                }}
              >
                <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Optional CIP-20 message (label 674)</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={includeNote} onChange={() => setIncludeNote(!includeNote)} />
                  <span>Attach CIP-20 metadata note</span>
                </label>
                {includeNote && (
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      maxWidth: '640px',
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #4b5563',
                      backgroundColor: '#1e293b',
                      color: '#e5e7eb',
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  width: '100%',
                  backgroundColor: '#1a1103',
                }}
              >
                <div style={{ minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Filter type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as 'all' | GovernanceType)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px' }}
                  >
                    <option value="all">All</option>
                    {GOVERNANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatGovActionType(t)}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedType === 'treasury_withdrawals' && (
                  <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Sort treasury</label>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px' }}
                    >
                      <option value="none">None</option>
                      <option value="amount_asc">Amount ↑</option>
                      <option value="amount_desc">Amount ↓</option>
                    </select>
                  </div>
                )}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    alignSelf: 'flex-end',
                    cursor: effectiveDrep?.kind === 'key' ? 'pointer' : 'not-allowed',
                    opacity: effectiveDrep?.kind === 'key' ? 1 : 0.5,
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={effectiveDrep?.kind !== 'key'}
                    checked={showOnlyChainUnvoted}
                    onChange={() => setShowOnlyChainUnvoted(!showOnlyChainUnvoted)}
                  />
                  <span>Show only actions with no on-chain vote yet {chainVotesLoading ? '(loading…)' : ''}</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    alignSelf: 'flex-end',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeRecentRatified}
                    onChange={() => setIncludeRecentRatified(!includeRecentRatified)}
                  />
                  <span>Also load ratified actions from the past 2 months</span>
                </label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', marginRight: '0.5rem' }}>Apply to visible rows:</span>
                <Button onClick={() => applyToAllVisible('yes')}>All Yes</Button>
                <Button onClick={() => applyToAllVisible('no')}>All No</Button>
                <Button onClick={() => applyToAllVisible('abstain')}>All Abstain</Button>
                <Button onClick={() => applyToAllVisible('skip')}>Reset to Skip</Button>
              </div>

              {actionsLoading && <p>Loading governance actions…</p>}
              {actionsError && (
                <div style={{ color: '#fca5a5', padding: '0.75rem', border: '1px solid #7f1d1d', borderRadius: '8px' }}>
                  {actionsError}
                </div>
              )}

              {!actionsLoading && !actionsError && filteredActions.length === 0 && (
                <p style={{ color: '#9ca3af' }}>No actions match the current filters.</p>
              )}

              <div style={{ width: '100%', display: 'grid', gap: '0.75rem' }}>
                {filteredActions.map((action) => {
                  const k = actionKey(action);
                  const choice = userVotes[k] ?? 'skip';
                  const chain = chainVoteByKey[k];
                  const colors = typeColor(action.governanceType);
                  const displayTitle = action.metadata?.title ?? action.title;
                  const statusLabel = governanceStatusLabel(action);
                  const votable = isVotableGovernanceAction(action);
                  return (
                    <div
                      key={k}
                      style={{
                        border: '1px solid #4b5563',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        backgroundColor: '#1a1103',
                        display: 'grid',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <a
                          href={`https://cardanoscan.io/govAction/${action.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        >
                          {truncateHash(action.id)}
                        </a>
                        <span
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.fg,
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            borderRadius: '9999px',
                            padding: '0.2rem 0.55rem',
                          }}
                        >
                          {formatGovActionType(action.governanceType)}
                        </span>
                        {statusLabel && (
                          <span
                            style={{
                              backgroundColor: statusLabel === 'Ratified' ? '#1e3a5f' : '#374151',
                              color: statusLabel === 'Ratified' ? '#93c5fd' : '#d1d5db',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              borderRadius: '9999px',
                              padding: '0.2rem 0.55rem',
                            }}
                          >
                            {statusLabel}
                          </span>
                        )}
                      </div>
                      {displayTitle && <div style={{ fontWeight: 600, color: '#f8fafc' }}>{displayTitle}</div>}
                      <div style={{ color: '#d1d5db', fontSize: '0.9rem' }}>{action.summary}</div>
                      {chain && (
                        <div style={{ fontSize: '0.8rem', color: '#fcd34d' }}>
                          On-chain vote recorded: <strong>{chain}</strong>
                        </div>
                      )}
                      {!votable && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          Voting closed — this action has expired, been dropped, or been enacted.
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                        {(['yes', 'no', 'abstain', 'skip'] as const).map((opt) => (
                          <label
                            key={opt}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              cursor: votable ? 'pointer' : 'not-allowed',
                              opacity: votable ? 1 : 0.45,
                            }}
                          >
                            <input
                              type="radio"
                              name={k}
                              checked={choice === opt}
                              disabled={!votable}
                              onChange={() => setVote(k, opt)}
                            />
                            <span style={{ textTransform: 'capitalize' }}>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: '0.82rem', color: '#9ca3af', maxWidth: '720px' }}>
                If the wallet refuses to sign, ensure it supports CIP-95 DRep signing alongside payment keys. One invalid
                governance action id will fail the whole transaction — double-check selections before submitting.
              </p>
            </>
          )}
        </div>

        {blockfrostReady && isWalletConnected && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '0.75rem 1rem',
              background: 'linear-gradient(180deg, transparent, #0f172a 25%)',
              borderTop: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              zIndex: 20,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <Button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !effectiveDrep ||
                  effectiveDrep.kind !== 'key' ||
                  votePayloadCount === 0 ||
                  !walletAddress
                }
              >
                {submitting ? 'Signing…' : `Submit ${votePayloadCount} vote${votePayloadCount === 1 ? '' : 's'}`}
              </Button>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                ({votePayloadCount} vote{votePayloadCount === 1 ? '' : 's'} selected across all loaded actions)
              </span>
            </div>
            {submitError && <div style={{ color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{submitError}</div>}
            {submittedTxHash && (
              <div style={{ color: '#bbf7d0', fontSize: '0.9rem' }}>
                Submitted:{' '}
                <a href={`https://cardanoscan.io/transaction/${submittedTxHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd' }}>
                  {submittedTxHash}
                </a>
                {receipt && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button onClick={() => downloadJson(receipt, receiptFilename(receipt.txHash))}>Download receipt JSON</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bottom-area">
          <div className="bottom-area-item">
            <a href="https://github.com/willpiam/cardano-tools" target="_blank" rel="noopener noreferrer">
              Source Code
            </a>
          </div>
        </div>

        <IpfsLinkModal
          open={ipfsModal !== null}
          url={ipfsModal?.url ?? ''}
          hashHex={ipfsModal?.hashHex}
          title={ipfsModal?.title}
          onClose={() => setIpfsModal(null)}
        />
      </div>
    </div>
  );
};

export default DRepBulkVote;
