import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import VerifyHash from './VerifyHash';
import { sha256 } from '../functions/hashFunctions';
import { WrappedTextBlock } from './WrappedTextBlock';


/**
 * HashCommit component
 * Allows a user to write a message, posts ONLY the SHA-256 hash of the message
 * as transaction metadata (label 674) and downloads a record containing both
 * the original message and its hash so the user can later prove authorship.
 */
const HashCommit: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messageToUse, setMessageToUse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const [includeSalt, setIncludeSalt] = useState(false);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const [salt, setSalt] = useState('');

  useEffect(() => {
    if (includeSalt) {
      setSalt(`[salt:${Math.random().toString(16).substring(2, 15)}]`);
    }
  }, [includeSalt]);

  useEffect(() => {
    setMessageToUse(includeSalt ? message + " " + salt : message);
  }, [message, salt, includeSalt]);

  const handleCommit = async () => {
    if (!isWalletConnected) return;
    if (!messageToUse.trim()) {
      alert('Please enter a message to commit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const hash = await sha256(messageToUse.trim());

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
        messageToUse: messageToUse,
        salt: includeSalt ? salt : 'None',
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
      <p>
        This tool allows you to post a hash commitment of your message to the cardano blockchain.
        This hash will allow you to later prove that the text you provided existed at this moment. 
        Until you reveal the text nobody will know what you have committed to unless they can 
        guess the value you entered. <strong> This is why it is important to consider including a salt</strong>
      </p>

      <textarea
        className="w-full p-2 border rounded-md"
        rows={4}
        placeholder="Enter the message you want to hash & put on-chain..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {/* display mesage to use */}
      <h3>Message to use:</h3>
      <WrappedTextBlock 
      text={messageToUse} 
      width={500} />
      {/* Hash preview */}
      {messageToUse && <VerifyHash message={messageToUse} />}

      {/* Optional salt */}
      <div>
        <input type="checkbox" id="includeSalt" checked={includeSalt} onChange={() => setIncludeSalt(!includeSalt)} />
        <label htmlFor="includeSalt">Include salt</label>
      </div>

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
      <Button disabled={isSubmitting} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit Hash'}
      </Button>
    </div>
  );
};

export default HashCommit;
