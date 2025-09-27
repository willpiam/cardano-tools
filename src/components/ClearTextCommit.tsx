import React, { useState } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';

/**
 * ClearTextCommit component
 * Allows user to write an arbitrary message which will be posted on-chain as transaction metadata.
 * The transaction simply sends 1 ADA back to the user's own payment address.
 */
const ClearTextCommit: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );

  const handleCommit = async () => {
    if (!isWalletConnected) return;
    if (!message.trim()) {
      alert('Please enter a message to commit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { _lucid, api } = await setupLucid(walletName);

      const txBuilder = _lucid
        .newTx()
        .pay.ToAddress(walletAddress!, { lovelace: BigInt(1_000_000) }) // send 1 ADA to self
        .attachMetadata(674, [message]);

      const tx = await txBuilder.complete();

      // ask browser to save a file describing the commitment
      const commitmentRecord = {
        message: message,
        txHash: tx.toHash(),
        cardanoscan: `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`
      }

      const blob = new Blob([JSON.stringify(commitmentRecord, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // include timestamp as unix time (seconds)
      a.download = `commitment_${Date.now()}.json`;
      a.click();

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
    <div className="clear-text-commit flex flex-col gap-4 w-full max-w-xl">
      <h2 className="text-xl font-semibold">Commit Plain Text To Chain</h2>
      <textarea
        className="w-full p-2 border rounded-md"
        rows={4}
        placeholder="Enter the message you want to put on-chain..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button disabled={isSubmitting} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit Text'}
      </Button>
    </div>
  );
};

export default ClearTextCommit;
