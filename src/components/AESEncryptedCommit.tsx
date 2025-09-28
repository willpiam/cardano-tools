import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useAppSelector } from '../store/hooks';
import { signAndSubmitTx, setupLucid } from '../functions';
import { williamDetails } from '../williamDetails';
import { downloadJson } from '../functions/downloadJson';
import '../simple.css';
import DecryptAES from './DecryptAES';
import { prepMessage } from '../functions/prepMessage';

// Utility: convert ArrayBuffer to base64 string
const bufferToBase64 = (data: ArrayBuffer | Uint8Array) => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Encrypt text with password using AES-GCM. Returns "iv:cipherText" (both base64 encoded)
const encryptAES = async (plainText: string, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const pwBytes = enc.encode(password);
  const pwHash = await crypto.subtle.digest('SHA-256', pwBytes); // derives 256-bit key
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  return `${bufferToBase64(iv)}:${bufferToBase64(cipherBuffer)}`;
};

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
      const ct = prepMessage( cipherText || (await encryptAES(message, password)));
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

      <input
        type="password"
        className="w-full p-2 border rounded-md"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {cipherText && (
        <>
          <h3 className="font-medium">Cipher text preview:</h3>
          <code className="break-all whitespace-pre-wrap">{cipherText}</code>
          {/* <DecryptAES /> */}
        </>
      )}

      <Button disabled={isSubmitting} onClick={handleCommit}>
        {isSubmitting ? 'Submitting...' : 'Commit Encrypted Text'}
      </Button>

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
    </div>
  );
};

export default AESEncryptedCommit;
