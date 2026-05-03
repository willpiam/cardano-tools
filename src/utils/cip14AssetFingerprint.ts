import AssetFingerprint from '@emurgo/cip14-js';

const POLICY_HEX_LEN = 56; // 28 bytes

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

/** Split a Cardano native asset unit hex string into policy id and asset name bytes. */
export function parseAssetUnitHex(unit: string): { policy: Uint8Array; name: Uint8Array } | null {
  const u = unit.trim().toLowerCase();
  if (u.length < POLICY_HEX_LEN) return null;
  const policyHex = u.slice(0, POLICY_HEX_LEN);
  const nameHex = u.slice(POLICY_HEX_LEN);
  const policy = hexToBytes(policyHex);
  if (!policy) return null;
  if (nameHex.length === 0) {
    return { policy, name: new Uint8Array(0) };
  }
  const name = hexToBytes(nameHex);
  if (!name) return null;
  return { policy, name };
}

/** CIP-14 `asset1…` bech32 fingerprint, or null if the unit hex is invalid. */
export function assetFingerprintFromUnitHex(unit: string): string | null {
  const parts = parseAssetUnitHex(unit);
  if (!parts) return null;
  return AssetFingerprint.fromParts(parts.policy, parts.name).fingerprint();
}
