import React, { useState } from 'react';
import { Button } from './Button';
import '../simple.css';
import { decryptAES } from '../QuickAES';
import { WrappedTextBlock } from './WrappedTextBlock';

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
        placeholder={isArrayMode ? 'Cipher text JSON array' : 'Cipher text'}
        value={cipherText}
        onChange={(e) => setCipherText(e.target.value)}
      />
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isArrayMode}
            onChange={(e) => setIsArrayMode(e.target.checked)}
          />
          Input is JSON array of strings
        </label>
      </div>
      <div>
        <input
          type="password"
          className="w-full p-2 border rounded-md"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button disabled={isDecrypting} onClick={handleDecrypt}>
        {isDecrypting ? 'Decrypting...' : 'Decrypt'}
      </Button>
      {error && <p className="text-red-600">{error}</p>}
      {message !== null && (
        <>
          <h4 className="font-medium">Decrypted Message:</h4>
          <WrappedTextBlock
            text={message}
            width={300}
          />
        </>
      )}
    </div>
  );
};

export default DecryptAES;
