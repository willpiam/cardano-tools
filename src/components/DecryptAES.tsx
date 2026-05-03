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
    <div className="aes-decrypt">
      <h3>Decrypt Cipher Text</h3>
      <div>
        <textarea
          rows={3}
          placeholder={isArrayMode ? 'Cipher text JSON array' : 'Cipher text'}
          value={cipherText}
          onChange={(e) => setCipherText(e.target.value)}
        />
      </div>
      <div>
        <label className="pw-row">
          <input
            type="checkbox"
            checked={isArrayMode}
            onChange={(e) => setIsArrayMode(e.target.checked)}
          />
          Input is JSON array of strings
        </label>
      </div>
      <div className="password-input-section">
        <label htmlFor="password" className="pw-label">Enter Password</label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <Button disabled={isDecrypting} onClick={handleDecrypt}>
          {isDecrypting ? 'Decrypting...' : 'Decrypt'}
        </Button>
      </div>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {message !== null && (
        <div>
          <h4>Decrypted Message:</h4>
          <WrappedTextBlock
            text={message}
            width="100%"
          />
        </div>
      )}
    </div>
  );
};

export default DecryptAES;
