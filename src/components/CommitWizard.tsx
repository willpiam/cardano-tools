import React, { ChangeEvent, useEffect, useState } from 'react';
import ConnectWallet from './ConnectWallet';
import DecryptAES from './DecryptAES';
import EthereumConnectWallet from './EthereumConnectWallet';
import FileHashViewer from './FileHashViewer';
import VerifyHash from './VerifyHash';
import ChainPicker, { CommitChain } from './ChainPicker';
import { Button } from './Button';
import { WrappedTextBlock } from './WrappedTextBlock';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import { prepMessage } from '../functions/prepMessage';
import { encryptAES } from '../QuickAES';
import { sha256 } from '../functions/hashFunctions';
import { setIsWalletConnected } from '../store/isWalletConnectedSlice';
import { resetWallet } from '../store/walletSlice';
import { resetEthWallet } from '../store/ethWalletSlice';
import {
  ETHEREUM_DEAD_ADDRESS,
  ensureMainnet,
  getEtherscanIdmUrl,
  getEtherscanTxUrl,
  sendIDM,
  toHexData,
} from '../functions/ethereum';

type WizardStep = 'home' | 'verify' | 'type' | 'inputs' | 'chain' | 'wallet' | 'finalize' | 'done';
export type CommitKind = 'plain' | 'hash' | 'aes' | 'filehash';

interface CommitInfo {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface CommitTypeMeta {
  label: string;
  glyph: string;
  theme: 'pink' | 'mint' | 'lemon' | 'apricot';
  tagline: string;
  description: string;
}

const commitTypeMeta: Record<CommitKind, CommitTypeMeta> = {
  plain: {
    label: 'Plain text',
    glyph: 'Aa',
    theme: 'pink',
    tagline: 'Anyone can read it on the explorer.',
    description:
      'Post a readable message directly on chain. Everyone will be able to see your text and verify that your wallet committed it at this time.',
  },
  hash: {
    label: 'Hash of text',
    glyph: '#',
    theme: 'mint',
    tagline: 'Hide the words, prove the timing.',
    description:
      'Commit only the SHA-256 hash of a message. Anyone with the original message can verify it; everyone else just sees that you committed to something. An optional salt blocks brute-force guesses.',
  },
  aes: {
    label: 'AES encrypted',
    glyph: '⚿',
    theme: 'lemon',
    tagline: 'Only password holders can decrypt.',
    description:
      'Encrypt a message with a password, then commit the ciphertext. Anyone with the password can later decrypt and verify. Choose a strong password — it is the only key.',
  },
  filehash: {
    label: 'File hash',
    glyph: '⬢',
    theme: 'apricot',
    tagline: 'Timestamp a file without revealing it.',
    description:
      'Commit the SHA-256 hash of a file. Anyone with the exact same file can re-hash and verify. Optionally append a short note after the hash for context.',
  },
};

const chainMeta: Record<CommitChain, { label: string; theme: 'cardano' | 'ethereum'; tagline: string }> = {
  cardano:  { label: 'Cardano',  theme: 'cardano',  tagline: 'Low fees · metadata label 674' },
  ethereum: { label: 'Ethereum', theme: 'ethereum', tagline: 'Mainnet · zero-value tx with input data' },
};

const wizardSteps: { id: WizardStep; label: string }[] = [
  { id: 'type',     label: 'Type' },
  { id: 'inputs',   label: 'Details' },
  { id: 'chain',    label: 'Chain' },
  { id: 'wallet',   label: 'Wallet' },
  { id: 'finalize', label: 'Review' },
  { id: 'done',     label: 'Done' },
];

const decodeAssetName = (unit: string): string => {
  if (unit.length <= 56) return '';
  const hex = unit.slice(56);
  if (!hex) return '';
  try {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    return hex;
  }
};

const truncateHash = (hash: string): string => {
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
};

const truncateAddress = (address: string): string => {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const CommitWizard = () => {
  const dispatch = useAppDispatch();
  const lucid = useAppSelector((state) => state.wallet.lucid);
  const walletName = useAppSelector(state => state.wallet.selectedWallet);
  const walletAddress = useAppSelector(state => state.wallet.address);
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const { useBlockfrost, apiKey } = useAppSelector((state) => state.blockfrost);
  const ethAddress = useAppSelector((state) => state.ethWallet.address);
  const ethProviderRdns = useAppSelector((state) => state.ethWallet.providerRdns);

  const [step, setStep] = useState<WizardStep>('home');
  const [chain, setChain] = useState<CommitChain>('cardano');
  const [commitType, setCommitType] = useState<CommitKind>('plain');

  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [cipherText, setCipherText] = useState('');
  const [includeSalt, setIncludeSalt] = useState(false);
  const [salt, setSalt] = useState('');
  const [messageToUse, setMessageToUse] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [fileHashAppendEnabled, setFileHashAppendEnabled] = useState(false);
  const [fileHashAppendText, setFileHashAppendText] = useState('');

  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);

  const [attachToken, setAttachToken] = useState(false);
  const [tokens, setTokens] = useState<{ unit: string; name: string; quantity: bigint }[]>([]);
  const [selectedTokenUnit, setSelectedTokenUnit] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [gitInfo, setGitInfo] = useState<CommitInfo | null>(null);
  const [gitInfoLoaded, setGitInfoLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadedRecord, setDownloadedRecord] = useState<any>(null);
  const [submitMessage, setSubmitMessage] = useState('');

  const isActiveWalletConnected = chain === 'cardano'
    ? isWalletConnected && Boolean(walletAddress)
    : isWalletConnected && Boolean(ethAddress);

  useEffect(() => {
    const fetchLatestCommit = async () => {
      if (gitInfoLoaded) return;

      try {
        const response = await fetch('https://api.github.com/repos/willpiam/cardano-tools/commits/master');

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const commit: CommitInfo = await response.json();
        setGitInfo(commit);
      } catch (err) {
        console.error('Failed to fetch commit information', err);
        setGitInfo({
          sha: 'FAILED_TO_LOAD',
          commit: {
            message: 'FAILED_TO_LOAD',
            author: {
              name: 'FAILED_TO_LOAD',
              date: new Date().toISOString()
            }
          },
          html_url: 'https://github.com/willpiam/cardano-tools'
        });
      } finally {
        setGitInfoLoaded(true);
      }
    };

    fetchLatestCommit();
  }, [gitInfoLoaded]);

  useEffect(() => {
    if (chain === 'ethereum') {
      setAttachToken(false);
      setIncludeTip(false);
    }
  }, [chain]);

  useEffect(() => {
    const fetchTokens = async () => {
      if (chain !== 'cardano' || !attachToken || !isWalletConnected || !lucid) return;
      setTokenLoading(true);
      setTokenError(null);
      try {
        const utxos = await lucid.wallet().getUtxos();
        const aggregate: Record<string, bigint> = {};
        for (const utxo of utxos) {
          for (const [unit, quantity] of Object.entries(utxo.assets)) {
            if (unit === 'lovelace') continue;
            aggregate[unit] = (aggregate[unit] || BigInt(0)) + BigInt(quantity as any);
          }
        }
        const list = Object.entries(aggregate)
          .map(([unit, quantity]) => ({
            unit,
            quantity,
            name: decodeAssetName(unit),
          }))
          .sort((a, b) => (a.name || a.unit).localeCompare(b.name || b.unit));
        setTokens(list);
        if (list.length > 0) setSelectedTokenUnit(list[0].unit);
      } catch (err) {
        console.error('Failed to fetch tokens', err);
        setTokenError('Failed to fetch tokens');
      } finally {
        setTokenLoading(false);
      }
    };
    fetchTokens();
  }, [attachToken, chain, isWalletConnected, lucid]);

  useEffect(() => {
    if (includeSalt) {
      setSalt(`[salt:${Math.random().toString(16).substring(2, 15)}]`);
    } else {
      setSalt('');
    }
  }, [includeSalt]);

  useEffect(() => {
    setMessageToUse(includeSalt ? `${message} ${salt}` : message);
  }, [message, salt, includeSalt]);

  useEffect(() => {
    const makeCipher = async () => {
      if (commitType !== 'aes') return;
      if (!message || !password) {
        setCipherText('');
        return;
      }
      try {
        const ct = await encryptAES(message, password);
        setCipherText(ct);
      } catch (err) {
        console.error('encryption failed', err);
        setCipherText('');
      }
    };
    makeCipher();
  }, [commitType, message, password]);

  useEffect(() => {
    if (step === 'wallet' && isActiveWalletConnected) {
      setStep('finalize');
    }
  }, [isActiveWalletConnected, step]);

  const resetCommitForm = () => {
    setMessage('');
    setPassword('');
    setCipherText('');
    setIncludeSalt(false);
    setSelectedFile(null);
    setFileHash('');
    setFileHashAppendEnabled(false);
    setFileHashAppendText('');
    setIncludeTip(false);
    setAttachToken(false);
    setSelectedTokenUnit('');
    setTokens([]);
    setDownloadedRecord(null);
    setSubmitMessage('');
  };

  const handleChainChange = (nextChain: CommitChain) => {
    if (nextChain === chain) return;
    setChain(nextChain);
    dispatch(setIsWalletConnected(false));
    dispatch(resetWallet());
    dispatch(resetEthWallet());
  };

  const computeHashOfFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileHash('');
      return;
    }
    setSelectedFile(file);
    const h = await computeHashOfFile(file);
    setFileHash(h);
  };

  const handleCommit = async () => {
    if (!isWalletConnected) return;
    try {
      setIsSubmitting(true);

      const currentTime = new Date().toISOString();
      const codeVersion = {
        shortHash: gitInfo?.sha ? gitInfo.sha.substring(0, 7) : 'FAILED_TO_LOAD',
        fullHash: gitInfo?.sha || 'FAILED_TO_LOAD',
        commitDate: gitInfo?.commit.author.date || currentTime,
        currentTime: currentTime,
        commitLink: gitInfo?.sha ? `https://github.com/willpiam/cardano-tools/tree/${gitInfo.sha}` : 'https://github.com/willpiam/cardano-tools',
        masterBranchLink: 'https://github.com/willpiam/cardano-tools'
      };

      let record: any = {
        tip: includeTip ? tipAmount : 'None',
        attachedToken: attachToken && selectedTokenUnit ? selectedTokenUnit : 'None',
        codeVersion: codeVersion,
      };
      let cardanoMetadata: string[] = [];
      let ethereumDataText = '';

      switch (commitType) {
        case 'plain': {
          if (!message.trim()) {
            alert('Please enter a message.');
            return;
          }
          const prepared = prepMessage(message);
          cardanoMetadata = prepared;
          ethereumDataText = message;
          record = {
            ...record,
            message,
            preparedMessage: prepared,
          };
          break;
        }
        case 'hash': {
          if (!messageToUse.trim()) {
            alert('Please enter a message.');
            return;
          }
          const hash = await sha256(messageToUse.trim());
          cardanoMetadata = [hash];
          ethereumDataText = hash;
          record = {
            ...record,
            message,
            messageToUse,
            salt: includeSalt ? salt : 'None',
            hash,
          };
          break;
        }
        case 'aes': {
          if (!message.trim() || !password.trim()) {
            alert('Provide message and password.');
            return;
          }
          const encryptedMessage = cipherText || (await encryptAES(message, password));
          const ct = prepMessage(encryptedMessage);
          cardanoMetadata = ct;
          ethereumDataText = encryptedMessage;
          record = {
            ...record,
            message,
            cipherText: ct,
            password,
          };
          break;
        }
        case 'filehash': {
          if (!selectedFile || !fileHash) {
            alert('Select a file first.');
            return;
          }
          if (fileHashAppendEnabled && !fileHashAppendText.trim()) {
            alert('Enter additional text to append after the hash, or turn off that option.');
            return;
          }
          const appended = fileHashAppendEnabled ? fileHashAppendText.trim() : '';
          const fileHashPayload = appended ? `${fileHash}\n${appended}` : fileHash;
          cardanoMetadata = prepMessage(fileHashPayload);
          ethereumDataText = fileHashPayload;
          record = {
            ...record,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileType: selectedFile.type || 'unknown',
            hash: fileHash,
            appendedTextAfterHash: appended || 'None',
            committedPayloadFormat: appended
              ? 'sha256_hex_64chars_then_newline_then_utf8_note'
              : 'sha256_hex_only',
          };
          break;
        }
        default:
          return;
      }

      if (chain === 'ethereum') {
        if (!ethAddress || !ethProviderRdns) {
          alert('Connect an Ethereum wallet first.');
          return;
        }
        const dataHex = toHexData(ethereumDataText);
        await ensureMainnet(ethProviderRdns);
        const txHash = await sendIDM({
          from: ethAddress,
          dataHex,
          providerRdns: ethProviderRdns,
        });
        record = {
          ...record,
          chain: 'ethereum',
          to: ETHEREUM_DEAD_ADDRESS,
          value: '0x0',
          dataHex,
          txHash,
          etherscan: getEtherscanTxUrl(txHash),
          etherscanIdm: getEtherscanIdmUrl(txHash),
        };
        downloadJson(record, `${commitType}_ethereum_commit_${Date.now()}.json`);
        setDownloadedRecord(record);
        setSubmitMessage(`Ethereum transaction submitted: ${txHash}`);
        setStep('done');
        return;
      }

      const { api } = await setupLucid(walletName, useBlockfrost, apiKey);
      const primaryAssets: Record<string, bigint> = {
        lovelace: BigInt(1_000_000),
      };
      if (attachToken && selectedTokenUnit) {
        primaryAssets[selectedTokenUnit] = BigInt(1);
      }
      const txBuilder = lucid.newTx().pay.ToAddress(walletAddress!, primaryAssets);
      txBuilder.attachMetadata(674, cardanoMetadata);

      if (includeTip) {
        txBuilder.pay.ToAddress(williamDetails.paymentAddress, {
          lovelace: BigInt(tipAmount * 1_000_000),
        });
      }
      if (useBlockfrost && apiKey) {
        txBuilder.validTo(Date.now() + (20 * 60 * 1000));
      }
      const tx = await txBuilder.complete();
      record.txHash = tx.toHash();
      record.cardanoscan = `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`;
      downloadJson(record, `${commitType}_commit_${Date.now()}.json`);
      setDownloadedRecord(record);
      await signAndSubmitTx(tx, api);
      setSubmitMessage('Cardano transaction submitted!');
      setStep('done');
    } catch (err) {
      console.error('Failed to submit transaction', err);
      alert('Failed to submit. See console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'verify') setStep('home');
    if (step === 'type') {
      resetCommitForm();
      setStep('home');
    }
    if (step === 'inputs') setStep('type');
    if (step === 'chain') setStep('inputs');
    if (step === 'wallet') setStep('chain');
    if (step === 'finalize') setStep('wallet');
  };

  const inputStepReady =
    (commitType === 'plain' && Boolean(message.trim())) ||
    (commitType === 'hash' && Boolean(messageToUse.trim())) ||
    (commitType === 'aes' && Boolean(message.trim()) && Boolean(password.trim())) ||
    (commitType === 'filehash' &&
      Boolean(selectedFile) &&
      Boolean(fileHash) &&
      (!fileHashAppendEnabled || Boolean(fileHashAppendText.trim())));

  const meta = commitTypeMeta[commitType];
  const themeClass = `theme-${meta.theme}`;

  const renderStepper = () => {
    if (step === 'home' || step === 'verify') return null;
    const currentIdx = wizardSteps.findIndex(s => s.id === step);
    const currentPastel = `var(--pastel-${meta.theme})`;
    return (
      <div className="wizard-stepper" aria-label="Progress">
        {wizardSteps.map((s, idx) => {
          const isCurrent = idx === currentIdx;
          const isDone = idx < currentIdx;
          const stateClass = isCurrent ? 'is-current' : isDone ? 'is-done' : '';
          const dotStyle = isCurrent
            ? ({ ['--pastel-current' as any]: currentPastel } as React.CSSProperties)
            : undefined;
          return (
            <React.Fragment key={s.id}>
              <div
                className={`wizard-step ${stateClass}`}
                style={dotStyle}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="wizard-step-dot">{idx + 1}</div>
                <div className="wizard-step-label">{s.label}</div>
              </div>
              {idx < wizardSteps.length - 1 && (
                <div className={`wizard-connector ${isDone ? 'is-done' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderWizardNav = (next?: { label: string; onClick: () => void; disabled?: boolean }) => (
    <div className="wizard-nav">
      <button type="button" className="btn btn-ghost" onClick={handleBack}>
        ← Back
      </button>
      {next && (
        <Button disabled={next.disabled} onClick={next.onClick}>
          {next.label} →
        </Button>
      )}
    </div>
  );

  const renderInputs = () => (
    <div className={`themed-surface ${themeClass}`}>
      <div className="pw-row">
        <span className={`pastel-badge theme-${meta.theme}`}>
          <span aria-hidden="true">{meta.glyph}</span>
          {meta.label}
        </span>
        <span className="pw-muted">{meta.tagline}</span>
      </div>

      {(commitType === 'plain' || commitType === 'hash' || commitType === 'aes') && (
        <textarea
          rows={4}
          placeholder="Enter your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      )}

      {commitType === 'hash' && (
        <>
          <label className="pw-row">
            <input
              type="checkbox"
              id="includeSalt"
              checked={includeSalt}
              onChange={() => setIncludeSalt(!includeSalt)}
            />
            <span>Include random salt (recommended for short messages)</span>
          </label>
          {messageToUse && (
            <div>
              <div className="pw-label">Message that will be hashed</div>
              <WrappedTextBlock text={messageToUse} width="100%" />
            </div>
          )}
          <VerifyHash message={messageToUse} />
        </>
      )}

      {commitType === 'aes' && (
        <>
          <div>
            <label htmlFor="aes-password" className="pw-label">
              Encryption password
            </label>
            <input
              id="aes-password"
              type="password"
              placeholder="Choose a strong password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {cipherText && (
            <div>
              <div className="pw-label">Cipher text preview</div>
              <WrappedTextBlock text={cipherText} width="100%" />
            </div>
          )}
        </>
      )}

      {commitType === 'filehash' && (
        <>
          <div>
            <label className="pw-label">Choose a file to hash</label>
            <input type="file" onChange={onFileChange} />
          </div>
          {selectedFile && (
            <div className="pw-muted">
              <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
          {fileHash && (
            <div>
              <div className="pw-label">SHA-256</div>
              <WrappedTextBlock text={fileHash} width="100%" />
            </div>
          )}
          <label className="pw-row">
            <input
              type="checkbox"
              id="fileHashAppend"
              checked={fileHashAppendEnabled}
              onChange={() => setFileHashAppendEnabled(!fileHashAppendEnabled)}
            />
            <span>Append a short note after the hash</span>
          </label>
          {fileHashAppendEnabled && (
            <textarea
              rows={3}
              placeholder="Optional note (committed after the hash, separated by a newline)..."
              value={fileHashAppendText}
              onChange={e => setFileHashAppendText(e.target.value)}
            />
          )}
        </>
      )}

      <p className="pw-muted">{meta.description}</p>
    </div>
  );

  const renderCardanoExtras = () => (
    <div className="themed-surface theme-cream">
      <div className="pw-label" style={{ marginBottom: 0 }}>Optional extras</div>

      <label className="pw-row-start">
        <input
          type="checkbox"
          id="attachToken"
          checked={attachToken}
          onChange={() => setAttachToken(!attachToken)}
          style={{ marginTop: 4 }}
        />
        <span>
          <strong>Attach a pointer token.</strong>
          <span style={{ display: 'block', color: 'var(--ink-soft)' }}>
            Sends one of your tokens back to yourself so related commitments are easy to find later.
          </span>
        </span>
      </label>
      {attachToken && (
        <div>
          {tokenLoading && <p className="pw-muted">Loading tokens…</p>}
          {tokenError && <p style={{ color: '#b91c1c', margin: 0 }}>{tokenError}</p>}
          {!tokenLoading && tokens.length === 0 && <p className="pw-muted">No tokens found in your wallet.</p>}
          {tokens.length > 0 && (
            <div className="pw-col">
              <label htmlFor="tokenSelect" className="pw-label">Pointer token</label>
              <select
                id="tokenSelect"
                value={selectedTokenUnit}
                onChange={e => setSelectedTokenUnit(e.target.value)}
              >
                {tokens.map(t => (
                  <option key={t.unit} value={t.unit}>
                    {t.name || '(no name)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <label className="pw-row-start">
        <input
          type="checkbox"
          id="includeTipUnified"
          checked={includeTip}
          onChange={() => setIncludeTip(!includeTip)}
          style={{ marginTop: 4 }}
        />
        <span>
          <strong>Tip $computerman.</strong>
          <span style={{ display: 'block', color: 'var(--ink-soft)' }}>
            Optional. Helps fund continued development of this tool.
          </span>
        </span>
      </label>
      {includeTip && (
        <div className="pw-row">
          <label htmlFor="tipAmountUnified" className="pw-muted" style={{ margin: 0 }}>Amount (ADA):</label>
          <input
            type="number"
            id="tipAmountUnified"
            value={tipAmount}
            onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
            style={{ maxWidth: 120 }}
          />
        </div>
      )}
    </div>
  );

  const renderConnectedWallet = () => {
    if (!isActiveWalletConnected) return null;
    if (chain === 'cardano') {
      return (
        <span className="pastel-badge theme-cardano" title={walletAddress || ''}>
          <span aria-hidden="true">●</span>
          {truncateAddress(walletAddress || '')}
        </span>
      );
    }
    return (
      <span className="pastel-badge theme-ethereum" title={ethAddress || ''}>
        <span aria-hidden="true">●</span>
        {truncateAddress(ethAddress || '')}
      </span>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'home':
        return (
          <>
            <div className="wizard-heading">
              <h2>What would you like to do?</h2>
              <p>Carve something into the chain — or use the off-chain tools to verify an existing commitment.</p>
            </div>
            <div className="choice-grid">
              <button
                type="button"
                className="choice-card theme-cream"
                onClick={() => setStep('type')}
              >
                <div className="choice-card-title">
                  <span className="choice-glyph" aria-hidden="true">＋</span>
                  Make a commitment
                </div>
                <div className="choice-card-desc">
                  Anchor text, a hash, an encrypted message, or a file directly on Cardano or Ethereum.
                </div>
              </button>
              <button
                type="button"
                className="choice-card theme-lavender"
                onClick={() => setStep('verify')}
              >
                <div className="choice-card-title">
                  <span className="choice-glyph" aria-hidden="true">✓</span>
                  Verification tools
                </div>
                <div className="choice-card-desc">
                  Recompute a hash, decrypt an AES message, or hash a file — all locally in your browser.
                </div>
              </button>
            </div>
          </>
        );
      case 'verify':
        return (
          <>
            <div className="wizard-heading">
              <h2>Off-chain verification tools</h2>
              <p>Everything below runs locally in your browser — nothing is sent anywhere.</p>
            </div>
            <DecryptAES />
            <VerifyHash />
            <FileHashViewer />
            {renderWizardNav()}
          </>
        );
      case 'type':
        return (
          <>
            <div className="wizard-heading">
              <h2>What are you committing?</h2>
              <p>Pick the kind of commitment that fits what you want to prove.</p>
            </div>
            <div className="choice-grid">
              {(Object.keys(commitTypeMeta) as CommitKind[]).map(type => {
                const m = commitTypeMeta[type];
                const isSelected = commitType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCommitType(type);
                      setStep('inputs');
                    }}
                    className={`choice-card theme-${m.theme}${isSelected ? ' is-selected' : ''}`}
                  >
                    <div className="choice-card-title">
                      <span className="choice-glyph" aria-hidden="true">{m.glyph}</span>
                      {m.label}
                    </div>
                    <div className="choice-card-desc">{m.description}</div>
                  </button>
                );
              })}
            </div>
            {renderWizardNav()}
          </>
        );
      case 'inputs':
        return (
          <>
            <div className="wizard-heading">
              <h2>Fill in the details</h2>
              <p>{meta.tagline}</p>
            </div>
            {renderInputs()}
            {renderWizardNav({
              label: 'Choose chain',
              onClick: () => setStep('chain'),
              disabled: !inputStepReady,
            })}
          </>
        );
      case 'chain':
        return (
          <>
            <div className="wizard-heading">
              <h2>Where should this be committed?</h2>
              <p>Both chains store your commitment forever. Pick the one that suits your audience and budget.</p>
            </div>
            <ChainPicker chain={chain} onChange={handleChainChange} />
            {renderWizardNav({
              label: 'Connect wallet',
              onClick: () => setStep('wallet'),
            })}
          </>
        );
      case 'wallet':
        return (
          <>
            <div className="wizard-heading">
              <h2>Connect your {chainMeta[chain].label} wallet</h2>
              <p>{chainMeta[chain].tagline}</p>
            </div>
            {chain === 'cardano' && (
              <div className="connect-to-wallet-container">
                <p className="pw-muted" style={{ margin: 0, textAlign: 'center' }}>
                  You will need a Cardano wallet (Lace and Eternl are great choices) and a small amount of ADA to cover transaction fees.
                </p>
                <ConnectWallet />
              </div>
            )}
            {chain === 'ethereum' && (
              <div className="connect-to-wallet-container">
                <p className="pw-muted" style={{ margin: 0, textAlign: 'center' }}>
                  Connect MetaMask, Rabby, or another Ethereum wallet with a small amount of ETH on mainnet for gas. The transaction sends zero ETH to {ETHEREUM_DEAD_ADDRESS} and writes your data in the input.
                </p>
                <EthereumConnectWallet />
              </div>
            )}
            {renderWizardNav()}
          </>
        );
      case 'finalize': {
        const chainTheme = chainMeta[chain].theme;
        return (
          <>
            <div className="wizard-heading">
              <h2>Ready to commit?</h2>
              <p>This is the last chance to back out. Once submitted, the commitment is permanent.</p>
            </div>
            <dl className="review-list">
              <div className="review-row">
                <dt>Type</dt>
                <dd>
                  <span className={`pastel-badge theme-${meta.theme}`}>
                    <span aria-hidden="true">{meta.glyph}</span>
                    {meta.label}
                  </span>
                </dd>
              </div>
              <div className="review-row">
                <dt>Chain</dt>
                <dd><span className={`pastel-badge theme-${chainTheme}`}>{chainMeta[chain].label}</span></dd>
              </div>
              {commitType === 'filehash' && fileHash && (
                <div className="review-row">
                  <dt>File hash</dt>
                  <dd>
                    <code>{truncateHash(fileHash)}</code>
                    {fileHashAppendEnabled && fileHashAppendText.trim() && (
                      <div style={{ marginTop: 4 }}>
                        <strong>Note:</strong>{' '}
                        {fileHashAppendText.trim().slice(0, 80)}
                        {fileHashAppendText.trim().length > 80 ? '…' : ''}
                      </div>
                    )}
                  </dd>
                </div>
              )}
              {commitType === 'hash' && messageToUse && (
                <div className="review-row">
                  <dt>To hash</dt>
                  <dd>{messageToUse.slice(0, 120)}{messageToUse.length > 120 ? '…' : ''}</dd>
                </div>
              )}
              {(commitType === 'plain' || commitType === 'aes') && message && (
                <div className="review-row">
                  <dt>Message</dt>
                  <dd>{message.slice(0, 120)}{message.length > 120 ? '…' : ''}</dd>
                </div>
              )}
              <div className="review-row">
                <dt>Wallet</dt>
                <dd>{renderConnectedWallet()}</dd>
              </div>
            </dl>

            {chain === 'cardano' ? (
              renderCardanoExtras()
            ) : (
              <p className="pw-muted">
                No optional extras on Ethereum. This will submit a zero-value mainnet transaction to {ETHEREUM_DEAD_ADDRESS}.
              </p>
            )}

            <Button disabled={isSubmitting} onClick={handleCommit}>
              {isSubmitting ? 'Submitting…' : `Commit on ${chainMeta[chain].label}`}
            </Button>
            {renderWizardNav()}
          </>
        );
      }
      case 'done':
        return (
          <>
            <div className="commit-success">
              <div className="commit-success-eyebrow">Submitted</div>
              <div className="commit-success-title">Written in stone.</div>
              {submitMessage && (
                <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{submitMessage}</p>
              )}
              <div className="pw-col">
                {downloadedRecord?.cardanoscan && (
                  <a
                    href={downloadedRecord.cardanoscan}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View transaction on Cardanoscan →
                  </a>
                )}
                {downloadedRecord?.etherscanIdm && (
                  <a
                    href={downloadedRecord.etherscanIdm}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View committed message on Etherscan (IDM) →
                  </a>
                )}
                {downloadedRecord?.etherscan && !downloadedRecord?.cardanoscan && (
                  <a
                    href={downloadedRecord.etherscan}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View transaction on Etherscan →
                  </a>
                )}
              </div>
            </div>

            {downloadedRecord && (
              <div className="themed-surface theme-cream">
                <p className="pw-muted">
                  In some cases (such as on mobile devices) the receipt JSON may not download automatically. You can copy it instead.
                </p>
                <Button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(downloadedRecord, null, 2))}
                >
                  Copy receipt to clipboard
                </Button>
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                resetCommitForm();
                setStep('home');
              }}
            >
              Make another commitment
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="wizard-card" data-step={step}>
      {renderStepper()}
      {renderStep()}
    </div>
  );
};

export default CommitWizard;
