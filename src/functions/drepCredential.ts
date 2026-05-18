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

/** Strip CBOR short-bytestring header (0x58 len) when present. */
function decodeCborBytestring(hex: string): Uint8Array {
  const all = hexToBytes(hex);
  if (all.length >= 2 && all[0] === 0x58) {
    const len = all[1];
    if (all.length === 2 + len) return all.slice(2);
  }
  return all;
}

/** CIP-95 may return a 32-byte raw pubkey or a 64-byte Bip32 extended pubkey. */
function rawDRepPubKeyBytes(decoded: Uint8Array): Uint8Array {
  if (decoded.length === 32) return decoded;
  if (decoded.length === 64) return decoded.slice(0, 32);
  throw new Error(`Unexpected DRep pubkey length ${decoded.length}; expected 32 or 64 bytes`);
}

function resolveGetPubDRepKey(api: any): (() => Promise<unknown>) | null {
  if (typeof api?.getPubDRepKey === 'function') return api.getPubDRepKey.bind(api);
  if (typeof api?.cip95?.getPubDRepKey === 'function') return api.cip95.getPubDRepKey.bind(api.cip95);
  if (typeof api?.experimental?.getPubDRepKey === 'function') {
    return api.experimental.getPubDRepKey.bind(api.experimental);
  }
  return null;
}

/**
 * Enable the wallet with CIP-95 so DRep methods and DRep tx witnesses are available.
 * Falls back to plain enable if the wallet rejects extension args.
 */
export async function enableWalletWithCip95(walletName: string): Promise<any> {
  const wallet = (window as any).cardano?.[walletName];
  if (!wallet) throw new Error(`Wallet ${walletName} is not available`);
  try {
    return await wallet.enable({ extensions: [{ cip: 95 }] });
  } catch (err) {
    console.warn('enable({ extensions: [{ cip: 95 }] }) failed, falling back to plain enable', err);
    return await wallet.enable();
  }
}

/**
 * Derive DRep ID from the wallet's CIP-95 public DRep key (blake2b-224 hash of the pubkey bytes).
 */
export async function deriveDRepFromWallet(api: any): Promise<ResolvedDRep | null> {
  const getPubDRepKey = resolveGetPubDRepKey(api);
  if (!getPubDRepKey) return null;

  let pubHex: string;
  try {
    const raw = await getPubDRepKey();
    pubHex = typeof raw === 'string' ? raw : String(raw);
  } catch {
    return null;
  }

  if (!pubHex?.trim()) return null;

  const pubKeyBytes = rawDRepPubKeyBytes(decodeCborBytestring(pubHex));
  const keyHashBytes = blake2b_224(pubKeyBytes);
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
