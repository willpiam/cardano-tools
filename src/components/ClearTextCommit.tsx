import React, { useState } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import { prepMessage } from '../functions/prepMessage';
import '../simple.css';

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
  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
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
      const preparedMessage = prepMessage(message);
      console.log("preparedMessage", preparedMessage);
      // for each element in preparedMessage, print the length of the string
      for (const element of preparedMessage) {
        console.log("length of element", element.length);
      }
      const txBuilder = _lucid
        .newTx()
        .pay.ToAddress(walletAddress!, { lovelace: BigInt(1_000_000) }) // send 1 ADA to self
        .attachMetadata(674, preparedMessage);

      if (includeTip) {
        txBuilder.pay.ToAddress(williamDetails.paymentAddress, { lovelace: BigInt(tipAmount * 1_000_000) });
      }

      console.log("about to complete tx");
      const tx = await txBuilder.complete();
      console.log("tx completed");

      // ask browser to save a file describing the commitment
      const commitmentRecord = {
        message: message,
        preparedMessage: preparedMessage,
        tip: includeTip ? tipAmount : "None",
        txHash: tx.toHash(),
        cardanoscan: `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`
      }

      downloadJson(commitmentRecord, `commitment_${Date.now()}.json`);

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
    <div className="clear-text-commit flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
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

      {/* a check box which when checked indicates that the user wants to include a tip to $computerman. It opens an input box for them to enter a number of ada with a default setting of 5 */}
      <div>
        <input type="checkbox" id="includeTip" checked={includeTip} onChange={() => setIncludeTip(!includeTip)} />
        <label htmlFor="includeTip">Include tip to $computerman</label>
      </div>
      {includeTip && (
        <div>
          <input type="number" id="tipAmount" value={tipAmount} onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)} />
        </div>
      )}
    </div>
  );
};

export default ClearTextCommit;
