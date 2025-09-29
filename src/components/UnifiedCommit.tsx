import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import { prepMessage } from '../functions/prepMessage';
import { encryptAES } from '../QuickAES';
import { sha256 } from '../functions/hashFunctions';
import VerifyHash from './VerifyHash';

export type CommitKind = 'plain' | 'hash' | 'aes' | 'filehash';

const UnifiedCommit: React.FC = () => {
  const lucid = useAppSelector((state) => state.wallet.lucid);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const [commitType, setCommitType] = useState<CommitKind>('plain');

  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [cipherText, setCipherText] = useState('');
  const [includeSalt, setIncludeSalt] = useState(false);
  const [salt, setSalt] = useState('');
  const [messageToUse, setMessageToUse] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');

  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);

  /* ---------- Token attachment state ---------- */
  const [attachToken, setAttachToken] = useState(false);
  const [tokens, setTokens] = useState<{ unit: string; name: string; quantity: bigint }[]>([]);
  const [selectedTokenUnit, setSelectedTokenUnit] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // helper to decode asset name from unit
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

  // fetch tokens when wallet connected and UI enabled
  useEffect(() => {
    const fetchTokens = async () => {
      if (!attachToken || !isWalletConnected || !lucid) return;
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
  }, [attachToken, isWalletConnected, lucid]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletName = useAppSelector(state => state.wallet.selectedWallet);
  const walletAddress = useAppSelector(state => state.wallet.address);
  // const isWalletConnected = useAppSelector(state => state.walletConnected.isWalletConnected);

  /* ---------- Derived / helper effects ---------- */
  // Salt generation
  useEffect(() => {
    if (includeSalt) {
      setSalt(`[salt:${Math.random().toString(16).substring(2, 15)}]`);
    } else {
      setSalt('');
    }
  }, [includeSalt]);

  // MessageToUse derivation
  useEffect(() => {
    setMessageToUse(includeSalt ? `${message} ${salt}` : message);
  }, [message, salt, includeSalt]);

  // CipherPreview derivation
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

  // File hash compute
  const computeHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileHash('');
      return;
    }
    setSelectedFile(file);
    const h = await computeHash(file);
    setFileHash(h);
  };

  /* ---------- Submit handler ---------- */
  const handleCommit = async () => {
    if (!isWalletConnected) return;
    try {
      setIsSubmitting(true);
      const { _lucid, api } = await setupLucid(walletName);

      // Build the primary output (always lovelace, optionally token)
      const primaryAssets: Record<string, bigint> = {
        lovelace: BigInt(1_000_000),
      };
      if (attachToken && selectedTokenUnit) {
        primaryAssets[selectedTokenUnit] = BigInt(1);
      }

      const txBuilder = _lucid.newTx().pay.ToAddress(walletAddress!, primaryAssets);

      let record: any = {
        tip: includeTip ? tipAmount : 'None',
        attachedToken: attachToken && selectedTokenUnit ? selectedTokenUnit : 'None',
      };

      switch (commitType) {
        case 'plain': {
          if (!message.trim()) {
            alert('Please enter a message.');
            return;
          }
          const prepared = prepMessage(message);
          txBuilder.attachMetadata(674, prepared);
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
          txBuilder.attachMetadata(674, [hash]);
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
          const ct = prepMessage(cipherText || (await encryptAES(message, password)));
          txBuilder.attachMetadata(674, ct);
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
          txBuilder.attachMetadata(674, [fileHash]);
          record = {
            ...record,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileType: selectedFile.type || 'unknown',
            hash: fileHash,
          };
          break;
        }
        default:
          return;
      }

      if (includeTip) {
        txBuilder.pay.ToAddress(williamDetails.paymentAddress, {
          lovelace: BigInt(tipAmount * 1_000_000),
        });
      }

      const tx = await txBuilder.complete();
      record.txHash = tx.toHash();
      record.cardanoscan = `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`;

      downloadJson(record, `${commitType}_commit_${Date.now()}.json`);
      await signAndSubmitTx(tx, api);
      alert('Transaction submitted!');

      // reset form
      setMessage('');
      setPassword('');
      setCipherText('');
      setSelectedFile(null);
      setFileHash('');
      setIncludeSalt(false);
    } catch (err) {
      console.error('Failed to submit transaction', err);
      alert('Failed to submit. See console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isWalletConnected) return null;

  return (
    <div className="unified-commit flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      <h2 className="text-xl font-semibold">Commit Data To Chain</h2>

      <div>
        <label htmlFor="commitType">Commit type:</label>{' '}
        <select
          id="commitType"
          value={commitType}
          onChange={e => setCommitType(e.target.value as CommitKind)}
        >
          <option value="plain">Plain text</option>
          <option value="hash">Hash of text</option>
          <option value="aes">AES-encrypted text</option>
          <option value="filehash">File hash</option>
        </select>
      </div>

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
            <code>{messageToUse}</code>
          </div>
          <VerifyHash message={messageToUse} />
         
        </>
      )}

      {commitType === 'aes' && (
        <>
          <div>
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
              <code className="break-all whitespace-pre-wrap">{cipherText}</code>
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
        </>
      )}

      {/* Attach token */}
      <div>
        <input
          type="checkbox"
          id="attachToken"
          checked={attachToken}
          onChange={() => setAttachToken(!attachToken)}
        />
        <label htmlFor="attachToken">Attach a token</label>
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

      {/* Optional tip */}
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

      <Button disabled={isSubmitting} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit'}
      </Button>
    </div>
  );
};

export default UnifiedCommit;
