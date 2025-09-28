import React, { useState } from 'react';
import { Button } from './Button';
import '../simple.css';

// Utility to convert base64 to ArrayBuffer
const base64ToBuffer = (b64: string): ArrayBuffer => {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Decrypt cipher text formatted as "iv:cipher" with AES-GCM and password
const decryptAES = async (cipherText: string, password: string): Promise<string> => {
  const [ivB64, cipherB64] = cipherText.split(':');
  if (!ivB64 || !cipherB64) throw new Error('Cipher text format invalid. Expected iv:cipher format.');

  const enc = new TextEncoder();
  const pwHash = await crypto.subtle.digest('SHA-256', enc.encode(password));
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['decrypt']);

  const iv = new Uint8Array(base64ToBuffer(ivB64));
  const cipherBuf = base64ToBuffer(cipherB64);

  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  const dec = new TextDecoder();
  return dec.decode(plainBuf);
};

const DecryptAES: React.FC = () => {
  const [cipherText, setCipherText] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  // When enabled, the cipher text input is interpreted as a JSON array of strings which will be concatenated.
  const [isArrayMode, setIsArrayMode] = useState(false);

  const handleDecrypt = async () => {
    setError(null);
    setMessage(null);
    if (!cipherText.trim() || !password.trim()) {
      setError('Please enter both cipher text and password.');
      return;
    }

    // Prepare cipher string depending on the selected mode
    let preparedCipher = cipherText.trim();
    if (isArrayMode) {
      try {
        const parsed = JSON.parse(preparedCipher);
        if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === 'string')) {
          throw new Error('Parsed value is not an array of strings');
        }
        preparedCipher = parsed.join('');
      } catch (_e) {
        setError('Invalid JSON array of strings provided.');
        return;
      }
    }
    try {
      setIsDecrypting(true);
      const msg = await decryptAES(preparedCipher, password.trim());
      setMessage(msg);
    } catch (err: any) {
      console.error(err);
      setError('Failed to decrypt. Ensure the cipher text and password are correct.');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="aes-decrypt flex flex-col gap-4 border border-gray-300 p-4 rounded-md">
      <h3 className="text-lg font-semibold">Decrypt Cipher Text</h3>
      <textarea
        className="w-full p-2 border rounded-md"
        rows={3}
        placeholder={isArrayMode ? 'Cipher text JSON array ["iv", "cipher"]' : 'Cipher text (iv:cipher)'}
        value={cipherText}
        onChange={(e) => setCipherText(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isArrayMode}
          onChange={(e) => setIsArrayMode(e.target.checked)}
        />
        Input is JSON array of strings
      </label>
      <input
        type="password"
        className="w-full p-2 border rounded-md"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button disabled={isDecrypting} onClick={handleDecrypt}>
        {isDecrypting ? 'Decrypting...' : 'Decrypt'}
      </Button>
      {error && <p className="text-red-600">{error}</p>}
      {message !== null && (
        <>
          <h4 className="font-medium">Decrypted Message:</h4>
          <code className="break-all whitespace-pre-wrap">{message}</code>
        </>
      )}
    </div>
  );
};

export default DecryptAES;
