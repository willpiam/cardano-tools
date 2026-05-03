import { ChangeEvent, useEffect, useState } from 'react';
import ConnectWallet from './ConnectWallet';
import DecryptAES from './DecryptAES';
import EthereumConnectWallet from './EthereumConnectWallet';
import FileHashViewer from './FileHashViewer';
import VerifyHash from './VerifyHash';
import ChainPicker, { CommitChain } from './ChainPicker';
import { AddressDisplay } from './AddressDisplay';
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

const commitTypeLabels: Record<CommitKind, string> = {
  plain: 'Plain text',
  hash: 'Hash of text',
  aes: 'AES-encrypted text',
  filehash: 'File hash',
};

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

  const [detailsOpen, setDetailsOpen] = useState(true);
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
    setDetailsOpen(true);
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

  const renderWizardNav = (next?: { label: string; onClick: () => void; disabled?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem' }}>
      <Button onClick={handleBack}>Back</Button>
      {next && (
        <Button disabled={next.disabled} onClick={next.onClick}>
          {next.label}
        </Button>
      )}
    </div>
  );

  const renderCommitTypeDescription = () => (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
        onClick={() => setDetailsOpen(!detailsOpen)}
        aria-expanded={detailsOpen}
        aria-controls="commit-type-details"
      >
        <span className="text-sm text-gray-700">
          {detailsOpen ? 'Hide description' : 'Show description'} <span aria-hidden="true">{detailsOpen ? '▾' : '▸'}</span>
        </span>
      </button>
      {detailsOpen && (
        <div id="commit-type-details" className="p-3 text-sm text-gray-800">
          {commitType === 'plain' && (
            <p>
              This flow allows you to post a message directly to the selected blockchain. It will be easily
              visible on a block explorer. Everyone will be able to see your text and verify that
              it was created by your wallet at this time. You will be prompted to download a JSON file with the
              relevant details for your records.
            </p>
          )}

          {commitType === 'hash' && (
            <p>
              This flow allows you to post only the SHA-256 hash of a message on the selected blockchain. People with
              your message will be able to recompute its hash and verify it against the hash you commit to the blockchain.
              Without your message people will see that you have committed to <i>something</i> but will not know what unless they correctly
              guess the exact message. To prevent guessing you can opt to include a salt with your message. Verifiers will need the original
              message and your salt (should you include one) to verify the hash. Verifiers with the message and the salt will
              be able to verify that the message was committed to from your wallet at this time. You will be prompted to download a JSON file with the
              relevant details for your records. This file will include the original message and the salt (if you included one). The "off-chain tools"
              section below includes an interface to compute the hash of a given string of text and can be used to verify your on-chain commitments.
            </p>
          )}

          {commitType === 'aes' && (
            <p>
              This flow allows you to post an AES-encrypted message on the selected blockchain. People with
              the correct password will be able to decrypt the message and verify that it was created by your wallet at this time.
              Everyone else will see that you have committed to <i>some message</i> and they will know approximately how long it is.
              You will be prompted to download a JSON file with the relevant details for your records. This file will include the
              raw unencrypted message and the password. Make sure to choose a strong password which cannot easily be guessed.
              The "off-chain tools" section below includes an interface to decrypt your AES-encrypted messages.
            </p>
          )}

            {commitType === 'filehash' && (
              <p>
                This flow allows you to post the SHA-256 hash of a file on the selected blockchain. Everyone will see that your
                wallet has committed to something but they will not know what. Anyone with the exact same file will be able to
                recompute the hash and verify it against the hash you committed to the blockchain. You will be prompted to download
                a JSON file with the relevant details for your records. The "off-chain tools" section below includes an interface to
                compute the hash of a given file and can be used to verify your on-chain commitments.
                You can optionally append a short note after the hash; on chain it is stored as the 64-character hex hash, a newline, then your note (UTF-8).
              </p>
            )}
        </div>
      )}
    </div>
  );

  const renderInputs = () => (
    <>
      {(commitType === 'plain' || commitType === 'hash' || commitType === 'aes') && (
        <textarea
          className="w-full p-2 border rounded-md"
          rows={4}
          placeholder="Enter your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      )}

      {commitType === 'hash' && (
        <>
          <div>
            <input
              type="checkbox"
              id="includeSalt"
              checked={includeSalt}
              onChange={() => setIncludeSalt(!includeSalt)}
            />
            <label htmlFor="includeSalt">Include salt</label>
          </div>
          <div>
            <h3 className="font-medium">Message to use:</h3>
            <WrappedTextBlock
              text={messageToUse}
              width={300} />
          </div>
          <VerifyHash message={messageToUse} />
        </>
      )}

      {commitType === 'aes' && (
        <>
          <div className="password-input-section">
            <label htmlFor="password" className="block text-sm font-medium mb-2">Enter Password</label>
            <input
              type="password"
              className="w-full p-2 border rounded-md"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {cipherText && (
            <div>
              <h3 className="font-medium">Cipher text preview:</h3>
              <WrappedTextBlock
                text={cipherText}
                width={300}
              />
            </div>
          )}
        </>
      )}

      {commitType === 'filehash' && (
        <>
          <input type="file" onChange={onFileChange} />
          {selectedFile && (
            <div className="text-sm">
              <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
          {fileHash && (
            <div className="break-all border p-2 bg-gray-50 rounded-md font-mono text-sm">
              {fileHash}
            </div>
          )}
          <div>
            <input
              type="checkbox"
              id="fileHashAppend"
              checked={fileHashAppendEnabled}
              onChange={() => setFileHashAppendEnabled(!fileHashAppendEnabled)}
            />
            <label htmlFor="fileHashAppend">Append additional text after the hash</label>
          </div>
          {fileHashAppendEnabled && (
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Optional note or label (committed after the hash, separated by a newline)..."
              value={fileHashAppendText}
              onChange={e => setFileHashAppendText(e.target.value)}
            />
          )}
        </>
      )}
    </>
  );

  const renderCardanoExtras = () => (
    <>
      <div>
        <input
          type="checkbox"
          id="attachToken"
          checked={attachToken}
          onChange={() => setAttachToken(!attachToken)}
        />
        <label htmlFor="attachToken">Attach a token</label>
        <p className="text-sm text-gray-700">
          Send one token back to yourself as a pointer token, making related commitments easier to find later.
        </p>
      </div>
      {attachToken && (
        <div>
          {tokenLoading && <p>Loading tokens...</p>}
          {tokenError && <p className="text-red-500">{tokenError}</p>}
          {!tokenLoading && tokens.length === 0 && <p>No tokens found.</p>}
          {tokens.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="tokenSelect" className="font-medium">Pointer (Conch) token:</label>
              <select
                id="tokenSelect"
                value={selectedTokenUnit}
                onChange={e => setSelectedTokenUnit(e.target.value)}
                className="w-full p-2 border rounded-md"
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

      <div>
        <input
          type="checkbox"
          id="includeTipUnified"
          checked={includeTip}
          onChange={() => setIncludeTip(!includeTip)}
        />
        <label htmlFor="includeTipUnified">Include tip to $computerman</label>
      </div>
      {includeTip && (
        <div>
          <input
            type="number"
            id="tipAmountUnified"
            value={tipAmount}
            onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}
    </>
  );

  const renderConnectedWallet = () => {
    if (!isActiveWalletConnected) return null;
    if (chain === 'cardano') {
      return (
        <div className="connection-info">
          <h3>Connected to</h3>
          <AddressDisplay
            address={walletAddress || ''}
            width={256}
            style={{
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        </div>
      );
    }

    return (
      <div className="connection-info">
        <h3>Connected to</h3>
        <div className="font-mono" style={{ wordBreak: 'break-all', maxWidth: '256px', marginLeft: 'auto', marginRight: 'auto' }}>
          {ethAddress}
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'home':
        return (
          <>
            <h2 className="text-xl font-semibold">What would you like to do?</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="wallet-select-button"
                onClick={() => setStep('type')}
              >
                Make a commitment
              </button>
              <button
                type="button"
                className="wallet-select-button"
                onClick={() => setStep('verify')}
              >
                Verification tools
              </button>
            </div>
          </>
        );
      case 'verify':
        return (
          <>
            <h2 className="text-xl font-semibold">Off-chain verification tools</h2>
            <DecryptAES />
            <VerifyHash />
            <FileHashViewer />
            {renderWizardNav()}
          </>
        );
      case 'type':
        return (
          <>
            <h2 className="text-xl font-semibold">What kind of commitment?</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(Object.keys(commitTypeLabels) as CommitKind[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onMouseEnter={() => setCommitType(type)}
                  onFocus={() => setCommitType(type)}
                  onClick={() => {
                    setCommitType(type);
                    setStep('inputs');
                  }}
                  className={commitType === type ? 'wallet-select-button selected' : 'wallet-select-button'}
                >
                  {commitTypeLabels[type]}
                </button>
              ))}
            </div>
            <h3 className="text-lg font-semibold" style={{ marginTop: '0.75rem' }}>
              Selected: {commitTypeLabels[commitType]}
            </h3>
            {renderCommitTypeDescription()}
            {renderWizardNav()}
          </>
        );
      case 'inputs':
        return (
          <>
            <h2 className="text-xl font-semibold">{commitTypeLabels[commitType]} inputs</h2>
            {renderInputs()}
            {renderWizardNav({
              label: 'Next',
              onClick: () => setStep('chain'),
              disabled: !inputStepReady,
            })}
          </>
        );
      case 'chain':
        return (
          <>
            <ChainPicker chain={chain} onChange={handleChainChange} />
            {renderWizardNav({
              label: 'Next',
              onClick: () => setStep('wallet'),
            })}
          </>
        );
      case 'wallet':
        return (
          <>
            {chain === 'cardano' && (
              <div className="connect-to-wallet-container">
                <div>
                  <h2>Connect With A Cardano Wallet To Continue</h2>
                  <p>
                    You will need a Cardano wallet to use this tool. Lace and Eternl are two great options. You will also need a small amount of ADA to cover transaction fees.
                    Ada can be purchased from most exchanges such as Coinbase, Binance, Kraken, etc.
                  </p>
                </div>
                <ConnectWallet />
              </div>
            )}
            {chain === 'ethereum' && (
              <div className="connect-to-wallet-container">
                <div>
                  <h2>Connect With An Ethereum Wallet To Continue</h2>
                  <p>
                    You will need an Ethereum wallet such as MetaMask or Rabby, and a small amount of ETH on mainnet to cover gas. The commitment transaction sends zero ETH to {ETHEREUM_DEAD_ADDRESS} and writes your data in the transaction input.
                  </p>
                </div>
                <EthereumConnectWallet />
              </div>
            )}
            {renderWizardNav()}
          </>
        );
      case 'finalize':
        return (
          <>
            <h2 className="text-xl font-semibold">Review and post</h2>
            {renderConnectedWallet()}
            <div className="border rounded-md p-3 text-sm">
              <p><strong>Commitment:</strong> {commitTypeLabels[commitType]}</p>
              <p><strong>Chain:</strong> {chain === 'ethereum' ? 'Ethereum' : 'Cardano'}</p>
              {commitType === 'filehash' && fileHash && (
                <p>
                  <strong>File hash:</strong> {truncateHash(fileHash)}
                  {fileHashAppendEnabled && fileHashAppendText.trim() && (
                    <span>
                      {' '}
                      <strong>Note after hash:</strong>{' '}
                      {fileHashAppendText.trim().slice(0, 80)}
                      {fileHashAppendText.trim().length > 80 ? '...' : ''}
                    </span>
                  )}
                </p>
              )}
              {commitType === 'hash' && messageToUse && <p><strong>Message to hash:</strong> {messageToUse.slice(0, 80)}{messageToUse.length > 80 ? '...' : ''}</p>}
              {(commitType === 'plain' || commitType === 'aes') && message && <p><strong>Message:</strong> {message.slice(0, 80)}{message.length > 80 ? '...' : ''}</p>}
            </div>
            {chain === 'cardano' ? (
              renderCardanoExtras()
            ) : (
              <p className="text-sm text-yellow-700">
                No optional extras on Ethereum. This will submit a zero-value mainnet transaction to {ETHEREUM_DEAD_ADDRESS}.
              </p>
            )}
            <Button disabled={isSubmitting} onClick={handleCommit}>
              {isSubmitting ? 'Submitting...' : `Commit on ${chain === 'ethereum' ? 'Ethereum' : 'Cardano'}`}
            </Button>
            {renderWizardNav()}
          </>
        );
      case 'done':
        return (
          <>
            <h2 className="text-xl font-semibold">Commitment submitted</h2>
            {submitMessage && <p>{submitMessage}</p>}
            {downloadedRecord?.cardanoscan && (
              <p>
                <a
                  href={downloadedRecord.cardanoscan}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  View transaction on Cardanoscan
                </a>
              </p>
            )}
            {downloadedRecord?.etherscanIdm && (
              <p>
                <a
                  href={downloadedRecord.etherscanIdm}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  View committed message on Etherscan (IDM)
                </a>
              </p>
            )}
            {downloadedRecord?.etherscan && !downloadedRecord?.cardanoscan && (
              <p>
                <a
                  href={downloadedRecord.etherscan}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  View transaction on Etherscan
                </a>
              </p>
            )}
            {downloadedRecord && (
              <div className="copy-record-button">
                <p>
                  In some cases (such as on mobile devices), the commitment data may not be downloaded automatically. In this case you can copy the commitment data with the button below.
                </p>
                <Button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(downloadedRecord, null, 2))}
                >
                  Copy commitment record to clipboard
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                resetCommitForm();
                setStep('home');
              }}
            >
              Make another commitment
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="unified-commit flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      {renderStep()}
    </div>
  );
};

export default CommitWizard;
