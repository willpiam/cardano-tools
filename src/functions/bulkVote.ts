import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';
import type { ProtocolParametersSnapshot } from './blockfrostProtocolParams';

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

async function tryAddCollateral(api: any, txb: CML.TransactionBuilder): Promise<void> {
  const getCollateral =
    (typeof api.getCollateral === 'function' && api.getCollateral.bind(api)) ||
    (api.experimental && typeof api.experimental.getCollateral === 'function' &&
      api.experimental.getCollateral.bind(api.experimental));

  if (!getCollateral) return;

  let collateralHexes: string[] | undefined;
  try {
    collateralHexes = await getCollateral();
  } catch {
    return;
  }

  if (!collateralHexes?.length) return;

  for (const cHex of collateralHexes) {
    try {
      const utxo = CML.TransactionUnspentOutput.from_cbor_hex(cHex);
      const inputResult = CML.SingleInputBuilder.from_transaction_unspent_output(utxo).payment_key();
      txb.add_collateral(inputResult);
    } catch (e) {
      console.warn('Skipping invalid collateral UTxO', e);
    }
  }
}

/**
 * Build and submit a single transaction containing many DRep votes (CIP-1694 voting procedures).
 */
export async function buildAndSubmitBulkVotes(options: BuildAndSubmitBulkVotesOptions): Promise<BulkVoteResult> {
  const { api, params, changeAddressBech32, drepKeyHashHex, votes, anchor } = options;

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

  for (const entry of votes) {
    const txHashNorm = normalizeHashHex(entry.txHash);
    if (!/^[0-9a-fA-F]{64}$/.test(txHashNorm)) {
      throw new Error(`Invalid governance action tx hash: ${entry.txHash}`);
    }
    const govActionId = CML.GovActionId.new(CML.TransactionHash.from_hex(txHashNorm), BigInt(entry.certIndex));
    const voteEnum = mapVote(entry.vote);
    const procedure = cmlAnchor ? CML.VotingProcedure.new(voteEnum, cmlAnchor) : CML.VotingProcedure.new(voteEnum);
    const voteResult = CML.VoteBuilder.new().with_vote(voter, govActionId, procedure).build();
    txb.add_vote(voteResult);
  }

  await tryAddCollateral(api, txb);

  const walletUtxoHexes: string[] = await api.getUtxos();
  if (!walletUtxoHexes || walletUtxoHexes.length === 0) {
    throw new Error('Wallet has no UTxOs to spend');
  }
  for (const utxoHex of walletUtxoHexes) {
    const utxo = CML.TransactionUnspentOutput.from_cbor_hex(utxoHex);
    const inputResult = CML.SingleInputBuilder.from_transaction_unspent_output(utxo).payment_key();
    txb.add_input(inputResult);
  }

  const balanced = txb.add_change_if_needed(changeAddress, false);
  if (!balanced) {
    throw new Error('Could not balance the transaction (insufficient funds for fees)');
  }

  const signedBuilder = txb.build(CML.ChangeSelectionAlgo.Default, changeAddress);
  const builtTx = signedBuilder.build_unchecked();
  const unsignedTxHex = builtTx.to_cbor_hex();

  const witnessSetHex: string = await api.signTx(unsignedTxHex, false);
  const walletWits = CML.TransactionWitnessSet.from_cbor_hex(witnessSetHex);

  const witsBuilder = CML.TransactionWitnessSetBuilder.new();
  witsBuilder.add_existing(walletWits);

  const finalBody = builtTx.body();
  const finalWits = witsBuilder.build();
  const aux = builtTx.auxiliary_data();
  const signedTx = CML.Transaction.new(finalBody, finalWits, true, aux);
  const signedTxHex = signedTx.to_cbor_hex();

  const txHash: string = await api.submitTx(signedTxHex);

  return { txHash, unsignedTxHex, signedTxHex };
}
