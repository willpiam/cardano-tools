
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
export const encryptAES = async (plainText: string, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const pwBytes = enc.encode(password);
  const pwHash = await crypto.subtle.digest('SHA-256', pwBytes); // derives 256-bit key
  const key = await crypto.subtle.importKey('raw', pwHash, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  return `${bufferToBase64(iv)}:${bufferToBase64(cipherBuffer)}`;
};

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
export const decryptAES = async (cipherText: string, password: string): Promise<string> => {
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