import React, { useEffect, useState } from 'react';
import { sha256 } from '../functions/hashFunctions';
import { WrappedTextBlock } from './WrappedTextBlock';

/**
 * VerifyHash component
 * Lets user input a message and see its SHA-256 hash.
 * Useful for proving a given message matches an on-chain hash.
 */
interface VerifyHashProps {
  /**
   * If provided, component becomes read-only and simply shows the
   * hash for this message. If omitted, user can enter a message.
   */
  message?: string;
}

const VerifyHash: React.FC<VerifyHashProps> = ({ message }) => {
  const [input, setInput] = useState(message ?? '');
  const [hash, setHash] = useState('');

  const compute = async (msg: string) => {
    if (!msg.trim()) {
      setHash('');
      return;
    }
    const h = await sha256(msg.trim());
    setHash(h);
  };

  // Recompute whenever provided message or local input changes
  useEffect(() => {
    compute(message ?? input);
  }, [message, input]);

  return (
    <div className="verify-hash">
      <h3>Hash Preview (SHA-256)</h3>
      {message === undefined && (
        <textarea
          rows={4}
          placeholder="Enter the message to hash..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      )}
      {hash && <WrappedTextBlock text={hash} width="100%" />}
    </div>
  );
};

export default VerifyHash;
