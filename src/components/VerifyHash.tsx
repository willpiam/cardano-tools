import React, { useEffect, useState } from 'react';
import { sha256 } from '../functions/hashFunctions';
import { Button } from './Button';

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
    <div className="verify-hash flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      <h3 className="text-lg font-medium">Hash Preview (SHA-256)</h3>
      {message === undefined && (
        <textarea
          className="w-full p-2 border rounded-md"
          rows={4}
          placeholder="Enter the message to hash..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      )}
      {hash && (
        <div className="break-all border p-2 bg-gray-50 rounded-md font-mono text-sm">
          {hash}
        </div>
      )}
    </div>
  );
};

export default VerifyHash;
