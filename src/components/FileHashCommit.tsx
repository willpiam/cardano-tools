import React, { useState } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import '../simple.css';

/**
 * FileHashCommit component
 * Lets a user pick a file, shows its SHA-256 hash, and
 * publishes the hash as transaction metadata (label 674).
 */
const FileHashCommit: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);

  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);

  const computeHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

  const handleCommit = async () => {
    if (!isWalletConnected) return;
    if (!selectedFile || !fileHash) {
      alert('Please select a file first.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { _lucid, api } = await setupLucid(walletName);

      const txBuilder = _lucid
        .newTx()
        .pay.ToAddress(walletAddress!, { lovelace: BigInt(1_000_000) }) // 1 ADA to self
        .attachMetadata(674, [fileHash]);

      if (includeTip) {
        txBuilder.pay.ToAddress(williamDetails.paymentAddress, {
          lovelace: BigInt(tipAmount * 1_000_000),
        });
      }

      const tx = await txBuilder.complete();

      const commitmentRecord = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type || 'unknown',
        hash: fileHash,
        tip: includeTip ? tipAmount : 'None',
        txHash: tx.toHash(),
        cardanoscan: `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`,
      };

      downloadJson(commitmentRecord, `file_hash_commitment_${Date.now()}.json`);

      await signAndSubmitTx(tx, api);
      alert('Transaction submitted!');
      // reset inputs
      setSelectedFile(null);
      setFileHash('');
    } catch (err) {
      console.error('Failed to submit transaction', err);
      alert('Failed to submit transaction. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isWalletConnected) return null;

  return (
    <div className="file-hash-commit flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      <h2 className="text-xl font-semibold">Commit File Hash To Chain</h2>
      <p>
        Select a file to compute its SHA-256 hash and commit the hash to the Cardano blockchain.
        The file itself is never uploaded, only the hash is stored on-chain.
      </p>

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

      {/* Optional tip */}
      <div>
        <input
          type="checkbox"
          id="includeTipFile"
          checked={includeTip}
          onChange={() => setIncludeTip(!includeTip)}
        />
        <label htmlFor="includeTipFile">Include tip to $computerman</label>
      </div>
      {includeTip && (
        <div>
          <input
            type="number"
            id="tipAmountFile"
            value={tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      <Button disabled={isSubmitting || !fileHash} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit File Hash'}
      </Button>
    </div>
  );
};

export default FileHashCommit;
