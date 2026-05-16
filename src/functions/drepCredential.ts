import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';
import { blake2b_224 } from '@harmoniclabs/crypto';
import { drepIDToCredential } from '@lucid-evolution/lucid';

export type ResolvedDRep =
  | { source: 'wallet' | 'manual'; kind: 'key'; keyHashHex: string; drepIdBech32: string }
  | { source: 'manual'; kind: 'script'; scriptHashHex: string; drepIdBech32: string };

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Derive DRep ID from the wallet's CIP-95 public DRep key (blake2b-224 hash of the pubkey bytes).
 */
export async function deriveDRepFromWallet(api: any): Promise<ResolvedDRep | null> {
  const cip95 = api?.cip95;
  if (!cip95 || typeof cip95.getPubDRepKey !== 'function') {
    return null;
  }

  let pubHex: string;
  try {
    const raw = await cip95.getPubDRepKey();
    pubHex = typeof raw === 'string' ? raw : String(raw);
  } catch {
    return null;
  }

  if (!pubHex?.trim()) return null;

  const pubBytes = hexToBytes(pubHex);
  const keyHashBytes = blake2b_224(pubBytes);
  if (keyHashBytes.length !== 28) {
    throw new Error(`Unexpected DRep key hash length ${keyHashBytes.length}; expected 28`);
  }

  const edHash = CML.Ed25519KeyHash.from_raw_bytes(keyHashBytes);
  const drepIdBech32 = edHash.to_bech32('drep');
  const keyHashHex = edHash.to_hex();

  return {
    source: 'wallet',
    kind: 'key',
    keyHashHex,
    drepIdBech32,
  };
}

/**
 * Parse a manual `drep1...` id into a credential suitable for on-chain voting.
 */
export function resolveManualDRep(drepIdBech32: string): ResolvedDRep {
  const cred = drepIDToCredential(drepIdBech32.trim());
  if (cred.type === 'Key') {
    return {
      source: 'manual',
      kind: 'key',
      keyHashHex: cred.hash,
      drepIdBech32: drepIdBech32.trim(),
    };
  }
  return {
    source: 'manual',
    kind: 'script',
    scriptHashHex: cred.hash,
    drepIdBech32: drepIdBech32.trim(),
  };
}
