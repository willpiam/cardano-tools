import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import '../simple.css';
import { prepMessage } from '../functions/prepMessage';
import { encryptAES } from '../QuickAES';
import { WrappedTextBlock } from './WrappedTextBlock';

const AESEncryptedCommit: React.FC = () => {
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [cipherText, setCipherText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const [includeTip, setIncludeTip] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);

  // Generate cipher text preview whenever inputs change
  useEffect(() => {
    const generateCipher = async () => {
      if (!message || !password) {
        setCipherText('');
        return;
      }
      try {
        const ct = await encryptAES(message, password);
        setCipherText(ct);
      } catch (err) {
        console.error('Encryption failed', err);
        setCipherText('');
      }
    };
    generateCipher();
  }, [message, password]);

  const handleCommit = async () => {
    if (!isWalletConnected) return;
    if (!message.trim() || !password.trim()) {
      alert('Please provide both a message and a password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const ct = prepMessage(cipherText || (await encryptAES(message, password)));
      const { _lucid, api } = await setupLucid(walletName);

      const txBuilder = _lucid
        .newTx()
        .pay.ToAddress(walletAddress!, { lovelace: BigInt(1_000_000) })
        .attachMetadata(674, ct);

      if (includeTip) {
        txBuilder.pay.ToAddress(williamDetails.paymentAddress, {
          lovelace: BigInt(tipAmount * 1_000_000),
        });
      }

      const tx = await txBuilder.complete();

      // Save record for user
      const record = {
        message,
        cipherText: ct,
        password: password,
        tip: includeTip ? tipAmount : 'None',
        txHash: tx.toHash(),
        cardanoscan: `https://cardanoscan.io/transaction/${tx.toHash()}?tab=metadata`,
      };
      downloadJson(record, `aes_commitment_${Date.now()}.json`);

      await signAndSubmitTx(tx, api);
      alert('Transaction submitted!');
      setMessage('');
      setPassword('');
    } catch (error) {
      console.error('Failed to submit transaction', error);
      alert('Failed to submit transaction. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isWalletConnected) return null;

  return (
    <div className="aes-commit flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      <h2 className="text-xl font-semibold">Commit AES-Encrypted Text To Chain</h2>
      <p>
        This tool encrypts your message locally in the browser using AES-GCM before committing it to the
        Cardano blockchain. Only those who know the password can decrypt the cipher text.
      </p>

      <textarea
        className="w-full p-2 border rounded-md"
        rows={4}
        placeholder="Enter the message you want to encrypt & put on-chain..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div>
        <input
          type="password"
          className="w-full p-2 border rounded-md"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {cipherText && (
        <>
          <h3 className="font-medium">Cipher text preview:</h3>
          <WrappedTextBlock text={cipherText} width={500} />
        </>
      )}


      {/* Optional tip section */}
      <div>
        <input
          type="checkbox"
          id="includeTipAES"
          checked={includeTip}
          onChange={() => setIncludeTip(!includeTip)}
        />
        <label htmlFor="includeTipAES">Include tip to $computerman</label>
      </div>
      {includeTip && (
        <div>
          <input
            type="number"
            id="tipAmountAES"
            value={tipAmount}
            onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}
      <Button disabled={isSubmitting} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit Encrypted Text'}
      </Button>
    </div>
  );
};

export default AESEncryptedCommit;
