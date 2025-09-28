const b64e = (bytes: ArrayBuffer | Uint8Array) => {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
};
const b64d = (b64: string): Uint8Array => {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

const deriveAesKey = async (password: string, salt: Uint8Array, iterations: number) => {
  const enc = new TextEncoder();
  const pwKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    pwKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptAES = async (plainText: string, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const iterations = 210_000; 
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(password, salt, iterations);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));

  const parts = [
    "v1",
    "pbkdf2",
    String(iterations),
    b64e(salt),
    b64e(iv),
    b64e(ctBuf),
  ];
  return parts.join(":");
};

export const decryptAES = async (payload: string, password: string): Promise<string> => {
  const parts = payload.split(":");
  if (parts.length !== 6) throw new Error("Invalid payload format.");

  const [v, kdf, iterStr, saltB64, ivB64, ctB64] = parts;
  if (v !== "v1" || kdf !== "pbkdf2") throw new Error("Unsupported format.");

  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations <= 0) throw new Error("Bad KDF params.");

  const salt = b64d(saltB64);
  const iv = b64d(ivB64);
  const ct = b64d(ctB64);

  const key = await deriveAesKey(password, salt, iterations);
  try {
    const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(ptBuf);
  } catch {
    throw new Error("Decryption failed (wrong password or corrupted data).");
  }
};
