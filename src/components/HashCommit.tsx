import React, { useState } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import '../simple.css';
import VerifyHash from './VerifyHash';
import { sha256 } from '../functions/hashFunctions';


/**
 * HashCommit component
 * Allows a user to write a message, posts ONLY the SHA-256 hash of the message
 * as transaction metadata (label 674) and downloads a record containing both
 * the original message and its hash so the user can later prove authorship.
 */
const HashCommit: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);

  const handleCommit = async () => {
    if (!isWalletConnected) return;
    if (!message.trim()) {
      alert('Please enter a message to commit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const hash = await sha256(message.trim());

      const { _lucid, api } = await setupLucid(walletName);

      const txBuilder = _lucid
        .newTx()
        .pay.ToAddress(walletAddress!, { lovelace: BigInt(1_000_000) }) // 1 ADA to self
        .attachMetadata(674, [hash]);

      if (includeTip) {
        txBuilder.pay.ToAddress(williamDetails.paymentAddress, {
          lovelace: BigInt(tipAmount * 1_000_000),
        });
      }

      const tx = await txBuilder.complete();

      // Prepare JSON record for download
      const commitmentRecord = {
        message: message,
        hash: hash,
        tip: includeTip ? tipAmount : 'None',
        txHash: tx.toHash(),
        cardanoscan: `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`,
      };

      downloadJson(commitmentRecord, `hash_commitment_${Date.now()}.json`);

      await signAndSubmitTx(tx, api);
      alert('Transaction submitted!');
      setMessage('');
    } catch (error) {
      console.error('Failed to submit transaction', error);
      alert('Failed to submit transaction. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isWalletConnected) {
    return null;
  }

  return (
    <div className="hash-commit flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      <h2 className="text-xl font-semibold">Commit Hashed Text To Chain</h2>
      <textarea
        className="w-full p-2 border rounded-md"
        rows={4}
        placeholder="Enter the message you want to hash & put on-chain..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {/* Hash preview */}
      {message && <VerifyHash message={message} />}
      <Button disabled={isSubmitting} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit Hash'}
      </Button>

      {/* Optional tip */}
      <div>
        <input
          type="checkbox"
          id="includeTipHash"
          checked={includeTip}
          onChange={() => setIncludeTip(!includeTip)}
        />
        <label htmlFor="includeTipHash">Include tip to $computerman</label>
      </div>
      {includeTip && (
        <div>
          <input
            type="number"
            id="tipAmountHash"
            value={tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}
    </div>
  );
};

export default HashCommit;
