// Utility functions related to hashing
// Currently only SHA-256. More algorithms can be added here later.

/**
 * Compute the SHA-256 hash of the given UTF-8 string and return it as a hex string.
 * Uses the browser's SubtleCrypto API. Works in all modern browsers.
 */
export const sha256 = async (msg: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(msg);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
