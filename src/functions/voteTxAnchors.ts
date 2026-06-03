import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';
import { mapWithConcurrency } from './governanceActionsFetch';
import { resolveManualDRep, type ResolvedDRep } from './drepCredential';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface VoteAnchorEntry {
  hasAnchor: boolean;
  url?: string;
  hashHex?: string;
}

export interface FetchVoteTxAnchorResult {
  anchorByProposalKey: Map<string, VoteAnchorEntry>;
  failedTxHashes: string[];
}

function normalizeHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '').toLowerCase();
}

function govActionKey(txHashHex: string, certIndex: bigint | number): string {
  return `${normalizeHex(txHashHex)}#${certIndex}`;
}

function voterMatchesDRep(voter: CML.Voter, drep: ResolvedDRep): boolean {
  if (drep.kind === 'key') {
    const kh = voter.as_d_rep_key_hash();
    return kh !== undefined && normalizeHex(kh.to_hex()) === normalizeHex(drep.keyHashHex);
  }
  const sh = voter.as_d_rep_script_hash();
  return sh !== undefined && normalizeHex(sh.to_hex()) === normalizeHex(drep.scriptHashHex);
}

/**
 * Parse on-chain voting_procedure anchors for a DRep from full transaction CBOR.
 * Keys are `proposalTxHash#proposalCertIndex` (gov action id).
 */
export function parseVoteAnchorsFromTxCbor(
  cborHex: string,
  drep: ResolvedDRep
): Map<string, VoteAnchorEntry> {
  const out = new Map<string, VoteAnchorEntry>();
  const tx = CML.Transaction.from_cbor_hex(cborHex.trim());
  const body = tx.body();
  const votingProcedures = body.voting_procedures();
  if (!votingProcedures) return out;

  const voters = votingProcedures.keys();
  for (let vi = 0; vi < voters.len(); vi++) {
    const voter = voters.get(vi);
    if (!voterMatchesDRep(voter, drep)) continue;

    const actionMap = votingProcedures.get(voter);
    if (!actionMap) continue;

    const actionIds = actionMap.keys();
    for (let ai = 0; ai < actionIds.len(); ai++) {
      const actionId = actionIds.get(ai);
      const procedure = actionMap.get(actionId);
      if (!procedure) continue;

      const txHash = actionId.transaction_id().to_hex();
      const index = actionId.gov_action_index();
      const key = govActionKey(txHash, index);

      const anchor = procedure.anchor();
      if (!anchor) {
        out.set(key, { hasAnchor: false });
        continue;
      }

      out.set(key, {
        hasAnchor: true,
        url: anchor.anchor_url().get(),
        hashHex: anchor.anchor_doc_hash().to_hex(),
      });
    }
  }

  return out;
}

async function fetchTxCborHex(apiKey: string, txHash: string): Promise<string | null> {
  const res = await fetch(`${BLOCKFROST_BASE}/txs/${txHash}/cbor`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) return null;
  const data: { cbor?: string } = await res.json();
  return typeof data.cbor === 'string' ? data.cbor : null;
}

/**
 * Fetch vote transaction CBOR from Blockfrost and extract per-proposal anchor presence.
 */
export async function fetchVoteTxAnchorMap(
  apiKey: string,
  voteTxHashes: string[],
  drepId: string
): Promise<FetchVoteTxAnchorResult> {
  const drep = resolveManualDRep(drepId);
  const unique = [...new Set(voteTxHashes.map((h) => normalizeHex(h)).filter(Boolean))];
  const anchorByProposalKey = new Map<string, VoteAnchorEntry>();
  const failedTxHashes: string[] = [];

  if (unique.length === 0) {
    return { anchorByProposalKey, failedTxHashes };
  }

  const results = await mapWithConcurrency(unique, 8, async (txHash) => {
    try {
      const cbor = await fetchTxCborHex(apiKey, txHash);
      if (!cbor) return { txHash, ok: false as const, map: null };
      const map = parseVoteAnchorsFromTxCbor(cbor, drep);
      return { txHash, ok: true as const, map };
    } catch (err) {
      console.warn('Failed to parse vote tx anchors', txHash, err);
      return { txHash, ok: false as const, map: null };
    }
  });

  for (const row of results) {
    if (!row.ok || !row.map) {
      failedTxHashes.push(row.txHash);
      continue;
    }
    for (const [key, entry] of row.map) {
      anchorByProposalKey.set(key, entry);
    }
  }

  return { anchorByProposalKey, failedTxHashes };
}

export function proposalKey(proposalTxHash: string, proposalCertIndex: number): string {
  return govActionKey(proposalTxHash, proposalCertIndex);
}
