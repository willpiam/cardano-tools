import React, { useState } from 'react';

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
    <div className="file-hash-viewer flex flex-col gap-4 w-full max-w-xl border border-gray-300 p-4 rounded-md">
      <h3 className="text-lg font-medium">File SHA-256 Hash</h3>
      <input type="file" onChange={handleFileChange} />

      {fileName && <div>File: {fileName}</div>}

      {hash && (
        <div className="break-all border p-2 bg-gray-50 rounded-md font-mono text-sm">
          {hash}
        </div>
      )}
    </div>
  );
};

export default FileHashViewer;
