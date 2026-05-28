import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';
import { blake2b_224 } from '@harmoniclabs/crypto';
import type { ProtocolParametersSnapshot } from './blockfrostProtocolParams';
import { buildCip20AuxiliaryData } from './cip20Metadata';

export type BulkVoteChoice = 'yes' | 'no' | 'abstain';

export interface BulkVoteEntry {
  txHash: string;
  certIndex: number;
  vote: BulkVoteChoice;
}

export interface BulkVoteAnchor {
  url: string;
  /** 32-byte document hash as 64 hex characters (no 0x). */
  hashHex: string;
}

export interface BuildAndSubmitBulkVotesOptions {
  api: any;
  params: ProtocolParametersSnapshot;
  changeAddressBech32: string;
  /** 28-byte Ed25519 key hash as hex (from DRep credential). */
  drepKeyHashHex: string;
  votes: BulkVoteEntry[];
  /** Optional shared CIP-100 anchor applied to every vote procedure. */
  anchor?: BulkVoteAnchor;
  /** Optional CIP-20 metadata strings (label 674). */
  metadata?: string[];
}

export interface BulkVoteResult {
  txHash: string;
  unsignedTxHex: string;
  signedTxHex: string;
}

function buildConfig(params: ProtocolParametersSnapshot): CML.TransactionBuilderConfig {
  const linearFee = CML.LinearFee.new(
    params.minFeeA,
    params.minFeeB,
    params.minFeeRefScriptCostPerByte
  );
  const memPrice = CML.Rational.new(params.priceMem.numerator, params.priceMem.denominator);
  const stepPrice = CML.Rational.new(params.priceStep.numerator, params.priceStep.denominator);
  const exUnitPrices = CML.ExUnitPrices.new(memPrice, stepPrice);

  let costModels: CML.CostModels;
  try {
    costModels = CML.CostModels.from_json(params.costModelsJson);
  } catch {
    costModels = CML.CostModels.from_json('{}');
  }

  return CML.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .coins_per_utxo_byte(params.coinsPerUtxoByte)
    .pool_deposit(params.poolDeposit)
    .key_deposit(params.keyDeposit)
    .max_value_size(params.maxValSize)
    .max_tx_size(params.maxTxSize)
    .ex_unit_prices(exUnitPrices)
    .cost_models(costModels)
    .collateral_percentage(params.collateralPercent)
    .max_collateral_inputs(params.maxCollateralInputs)
    .build();
}

function mapVote(choice: BulkVoteChoice): CML.Vote {
  switch (choice) {
    case 'yes':
      return CML.Vote.Yes;
    case 'no':
      return CML.Vote.No;
    case 'abstain':
      return CML.Vote.Abstain;
    default:
      throw new Error(`Unsupported vote: ${choice}`);
  }
}

function normalizeHashHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '');
}

function witnessSetContainsKeyHash(wits: CML.TransactionWitnessSet, expectedKeyHashHex: string): boolean {
  const vks = wits.vkeywitnesses();
  if (!vks) return false;
  const want = expectedKeyHashHex.toLowerCase();
  for (let i = 0; i < vks.len(); i++) {
    const pub = vks.get(i).vkey();
    const bytes = pub.to_raw_bytes();
    const kh = CML.Ed25519KeyHash.from_raw_bytes(blake2b_224(bytes)).to_hex().toLowerCase();
    if (kh === want) return true;
  }
  return false;
}

/**
 * Build and submit a single transaction containing many DRep votes (CIP-1694 voting procedures).
 */
export async function buildAndSubmitBulkVotes(options: BuildAndSubmitBulkVotesOptions): Promise<BulkVoteResult> {
  const { api, params, changeAddressBech32, drepKeyHashHex, votes, anchor, metadata } = options;

  if (!votes.length) {
    throw new Error('No votes to submit');
  }

  let cmlAnchor: CML.Anchor | undefined;
  if (anchor) {
    const url = anchor.url.trim();
    const hashNorm = normalizeHashHex(anchor.hashHex);
    if (!url) throw new Error('Anchor URL is empty');
    if (!/^[0-9a-fA-F]{64}$/.test(hashNorm)) {
      throw new Error('Anchor hash must be exactly 64 hex characters (32-byte blake2b-256 digest)');
    }
    const urlObj = CML.Url.from_json(JSON.stringify(url));
    const docHash = CML.AnchorDocHash.from_hex(hashNorm);
    cmlAnchor = CML.Anchor.new(urlObj, docHash);
  }

  const cfg = buildConfig(params);
  const txb = CML.TransactionBuilder.new(cfg);
  const changeAddress = CML.Address.from_bech32(changeAddressBech32.trim());

  const voter = CML.Voter.new_d_rep_key_hash(CML.Ed25519KeyHash.from_hex(normalizeHashHex(drepKeyHashHex)));

  let voteBuilder = CML.VoteBuilder.new();
  for (const entry of votes) {
    const txHashNorm = normalizeHashHex(entry.txHash);
    if (!/^[0-9a-fA-F]{64}$/.test(txHashNorm)) {
      throw new Error(`Invalid governance action tx hash: ${entry.txHash}`);
    }
    const govActionId = CML.GovActionId.new(CML.TransactionHash.from_hex(txHashNorm), BigInt(entry.certIndex));
    const voteEnum = mapVote(entry.vote);
    const procedure = cmlAnchor ? CML.VotingProcedure.new(voteEnum, cmlAnchor) : CML.VotingProcedure.new(voteEnum);
    voteBuilder = voteBuilder.with_vote(voter, govActionId, procedure);
  }
  txb.add_vote(voteBuilder.build());

  let auxDataCborHex: string | undefined;
  if (metadata && metadata.length > 0) {
    const auxData = buildCip20AuxiliaryData(metadata);
    auxDataCborHex = auxData.to_cbor_hex();
    txb.add_auxiliary_data(auxData);
  }

  const walletUtxoHexes: string[] = await api.getUtxos();
  if (!walletUtxoHexes || walletUtxoHexes.length === 0) {
    throw new Error('Wallet has no UTxOs to spend');
  }
  for (const utxoHex of walletUtxoHexes) {
    const utxo = CML.TransactionUnspentOutput.from_cbor_hex(utxoHex);
    const inputResult = CML.SingleInputBuilder.from_transaction_unspent_output(utxo).payment_key();
    txb.add_utxo(inputResult);
  }
  txb.select_utxos(CML.CoinSelectionStrategyCIP2.LargestFirstMultiAsset);

  const balanced = txb.add_change_if_needed(changeAddress, false);
  if (!balanced) {
    throw new Error('Could not balance the transaction (insufficient funds for fees)');
  }

  const signedBuilder = txb.build(CML.ChangeSelectionAlgo.Default, changeAddress);
  const builtTx = signedBuilder.build_unchecked();
  const unsignedTxHex = builtTx.to_canonical_cbor_hex();

  let witnessSetHex: string;
  try {
    witnessSetHex = await api.signTx(unsignedTxHex, true);
  } catch (err: unknown) {
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    throw new Error(`Wallet refused to sign: ${msg}`);
  }
  const walletWits = CML.TransactionWitnessSet.from_cbor_hex(witnessSetHex);

  if (!witnessSetContainsKeyHash(walletWits, normalizeHashHex(drepKeyHashHex))) {
    throw new Error(
      'The wallet returned signatures but none matches your DRep key. Either the CIP-95 extension was not approved on this connection, or the auto-detected DRep ID does not match the wallet. Reconnect Eternl/Lace, approve CIP-95 when prompted, and try again.'
    );
  }

  const witsBuilder = CML.TransactionWitnessSetBuilder.new();
  witsBuilder.add_existing(walletWits);

  const finalBody = builtTx.body();
  const finalWits = witsBuilder.build();
  const auxForSigned = auxDataCborHex
    ? CML.AuxiliaryData.from_cbor_hex(auxDataCborHex)
    : builtTx.auxiliary_data();
  const signedTx = CML.Transaction.new(finalBody, finalWits, true, auxForSigned);
  const signedTxHex = signedTx.to_canonical_cbor_hex();

  const txHash: string = await api.submitTx(signedTxHex);

  return { txHash, unsignedTxHex, signedTxHex };
}
