import React, { useState } from 'react';
import { WrappedTextBlock } from './WrappedTextBlock';

const FileHashViewer: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');
  const [hash, setHash] = useState<string>('');

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Read file as ArrayBuffer and compute SHA-256 hash
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setHash(hashHex);
  };

  return (
    <div className="file-hash-viewer">
      <h3>File SHA-256 Hash</h3>
      <input type="file" onChange={handleFileChange} />

      {fileName && <div>File: {fileName}</div>}

      {hash && (
        <WrappedTextBlock text={hash} width="100%" />
      )}
    </div>
  );
};

export default FileHashViewer;
