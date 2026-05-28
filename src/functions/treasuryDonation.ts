import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';

/**
 * Treasury donation helpers built directly on top of the Cardano Multiplatform Library (CML).
 *
 * These helpers intentionally avoid `@lucid-evolution/lucid` for transaction construction.
 * The only Cardano-stack dependency is `@anastasia-labs/cardano-multiplatform-lib-browser`
 * (the dcSpark / Anastasia Labs CML WASM bindings).
 *
 * The CIP-30 wallet API (passed in as `api`) is used to fetch UTxOs, sign, and submit.
 */

import {
  fetchProtocolParametersSnapshot,
  type ProtocolParametersSnapshot,
} from './blockfrostProtocolParams';
import { buildCip20AuxiliaryData } from './cip20Metadata';

const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

/** Re-export for callers that import from treasuryDonation. */
export type { ProtocolParametersSnapshot };

export interface TreasuryContext {
  currentTreasuryLovelace: bigint;
  params: ProtocolParametersSnapshot;
}

export interface DonationOptions {
  /** CIP-30 wallet API returned by `await window.cardano[name].enable()`. */
  api: any;
  /** Donation amount in lovelace. */
  donationLovelace: bigint;
  /** Current treasury value (lovelace) at submission time. */
  currentTreasuryLovelace: bigint;
  /** Protocol parameters snapshot returned by `fetchTreasuryContext`. */
  params: ProtocolParametersSnapshot;
  /** Bech32 address used as change address and as the donation placeholder address. */
  changeAddressBech32: string;
  /** Optional CIP-20 metadata strings (label 674). */
  metadata?: string[];
  /** Optional tip to William (paymentAddress + lovelace amount). */
  tip?: { addressBech32: string; lovelace: bigint };
}

export interface DonationResult {
  txHash: string;
  unsignedTxHex: string;
  signedTxHex: string;
}

const blockfrostFetch = async (apiKey: string, path: string): Promise<any> => {
  const res = await fetch(`${BLOCKFROST_BASE_URL}${path}`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) {
    throw new Error(`Blockfrost ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

const toBigInt = (raw: unknown, fallback: bigint = BigInt(0)): bigint => {
  if (raw === null || raw === undefined) return fallback;
  try {
    return BigInt(String(raw).split('.')[0]);
  } catch {
    return fallback;
  }
};

/**
 * Fetch the protocol parameters and current treasury value needed to construct
 * a donation transaction. Always re-fetched just before building so the
 * `current_treasury_value` value is as fresh as possible.
 */
export const fetchTreasuryContext = async (apiKey: string): Promise<TreasuryContext> => {
  const [network, params] = await Promise.all([
    blockfrostFetch(apiKey, '/network'),
    fetchProtocolParametersSnapshot(apiKey),
  ]);

  const currentTreasuryLovelace = toBigInt(network?.supply?.treasury, BigInt(0));

  return {
    currentTreasuryLovelace,
    params,
  };
};

const buildConfig = (params: ProtocolParametersSnapshot): CML.TransactionBuilderConfig => {
  const linearFee = CML.LinearFee.new(
    params.minFeeA,
    params.minFeeB,
    params.minFeeRefScriptCostPerByte,
  );
  const memPrice = CML.Rational.new(params.priceMem.numerator, params.priceMem.denominator);
  const stepPrice = CML.Rational.new(params.priceStep.numerator, params.priceStep.denominator);
  const exUnitPrices = CML.ExUnitPrices.new(memPrice, stepPrice);

  // CostModels has no public empty-constructor, so we parse from JSON. For a
  // wallet-to-treasury transaction the body has no scripts and the contents
  // are irrelevant to the on-chain validation; the builder just needs an
  // object it can hold a reference to.
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
};

const coinOnlyOutput = (addr: CML.Address, lovelace: bigint): CML.TransactionOutput =>
  CML.TransactionOutput.new(addr, CML.Value.from_coin(lovelace));

const wrapAsSingleOutput = (output: CML.TransactionOutput): CML.SingleOutputBuilderResult =>
  CML.SingleOutputBuilderResult.new(output);

/**
 * Build, sign (via CIP-30), and submit a treasury donation transaction.
 *
 * Strategy:
 *   1. Use CML's TransactionBuilder to assemble inputs, optional tip output, optional
 *      auxiliary data, and a *placeholder* output that earmarks the donation lovelace
 *      so coin selection picks enough inputs.
 *   2. Build & balance via `build(ChangeSelectionAlgo.Default, changeAddress)`.
 *   3. Reconstruct a new TransactionBody that drops the placeholder output and
 *      instead sets `donation` + `current_treasury_value` on the body. The accounting
 *      stays balanced because the placeholder coin equals the donation field.
 *   4. Pass the unsigned tx CBOR to the wallet for signing and submit the result.
 */
export const buildAndSubmitDonation = async (
  options: DonationOptions,
): Promise<DonationResult> => {
  const {
    api,
    donationLovelace,
    currentTreasuryLovelace,
    params,
    changeAddressBech32,
    metadata,
    tip,
  } = options;

  if (donationLovelace <= BigInt(0)) {
    throw new Error('Donation amount must be positive');
  }

  const cfg = buildConfig(params);
  const txb = CML.TransactionBuilder.new(cfg);

  const changeAddress = CML.Address.from_bech32(changeAddressBech32);

  const walletUtxoHexes: string[] = await api.getUtxos();
  if (!walletUtxoHexes || walletUtxoHexes.length === 0) {
    throw new Error('Wallet has no UTxOs to spend');
  }
  for (const utxoHex of walletUtxoHexes) {
    const utxo = CML.TransactionUnspentOutput.from_cbor_hex(utxoHex);
    const inputResult = CML.SingleInputBuilder.from_transaction_unspent_output(utxo).payment_key();
    txb.add_input(inputResult);
  }

  if (tip && tip.lovelace > BigInt(0)) {
    const tipAddress = CML.Address.from_bech32(tip.addressBech32);
    txb.add_output(wrapAsSingleOutput(coinOnlyOutput(tipAddress, tip.lovelace)));
  }

  // Donation placeholder: pay donationLovelace to the wallet's own address so coin selection
  // sees the donation as a required outflow. We swap this output for the body-level
  // `donation` field after building.
  const placeholderIndexInUserAdditions =
    tip && tip.lovelace > BigInt(0) ? 1 : 0;
  txb.add_output(wrapAsSingleOutput(coinOnlyOutput(changeAddress, donationLovelace)));

  /** Serialized once; `Transaction.new` consumes each AuxiliaryData JS wrapper via WASM. */
  let auxDataCborHex: string | undefined;
  if (metadata && metadata.length > 0) {
    const auxData = buildCip20AuxiliaryData(metadata);
    auxDataCborHex = auxData.to_cbor_hex();
    txb.add_auxiliary_data(auxData);
  }

  const balanced = txb.add_change_if_needed(changeAddress, false);
  if (!balanced) {
    throw new Error('Could not balance the transaction (insufficient funds for donation + fees)');
  }

  const signedBuilder = txb.build(CML.ChangeSelectionAlgo.Default, changeAddress);
  const builtTx = signedBuilder.build_unchecked();

  const builtBody = builtTx.body();
  const builtInputs = builtBody.inputs();
  const builtOutputs = builtBody.outputs();
  const builtFee = builtBody.fee();
  const builtAuxHash = builtBody.auxiliary_data_hash();

  // Rebuild the outputs list without the donation placeholder. The builder preserves
  // the order in which outputs were added (tip?, placeholder, then change).
  const newOutputs = CML.TransactionOutputList.new();
  for (let i = 0; i < builtOutputs.len(); i++) {
    if (i === placeholderIndexInUserAdditions) continue;
    newOutputs.add(builtOutputs.get(i));
  }

  const newInputs = CML.TransactionInputList.new();
  for (let i = 0; i < builtInputs.len(); i++) {
    newInputs.add(builtInputs.get(i));
  }

  const finalBody = CML.TransactionBody.new(newInputs, newOutputs, builtFee);
  finalBody.set_donation(donationLovelace);
  finalBody.set_current_treasury_value(currentTreasuryLovelace);
  if (builtAuxHash) {
    finalBody.set_auxiliary_data_hash(builtAuxHash);
  }
  const ttl = builtBody.ttl();
  if (ttl !== undefined) {
    finalBody.set_ttl(ttl);
  }
  const validityStart = builtBody.validity_interval_start();
  if (validityStart !== undefined) {
    finalBody.set_validity_interval_start(validityStart);
  }
  const networkId = builtBody.network_id();
  if (networkId !== undefined) {
    finalBody.set_network_id(networkId);
  }

  const emptyWits = CML.TransactionWitnessSetBuilder.new().build();
  const auxForUnsigned = auxDataCborHex
    ? CML.AuxiliaryData.from_cbor_hex(auxDataCborHex)
    : undefined;
  const unsignedTx = CML.Transaction.new(finalBody, emptyWits, true, auxForUnsigned);
  const unsignedTxHex = unsignedTx.to_cbor_hex();

  const witnessSetHex: string = await api.signTx(unsignedTxHex, false);
  const walletWits = CML.TransactionWitnessSet.from_cbor_hex(witnessSetHex);

  const witsBuilder = CML.TransactionWitnessSetBuilder.new();
  witsBuilder.add_existing(walletWits);
  const finalWits = witsBuilder.build();

  const auxForSigned = auxDataCborHex
    ? CML.AuxiliaryData.from_cbor_hex(auxDataCborHex)
    : undefined;
  const signedTx = CML.Transaction.new(finalBody, finalWits, true, auxForSigned);
  const signedTxHex = signedTx.to_cbor_hex();

  const txHash: string = await api.submitTx(signedTxHex);

  return { txHash, unsignedTxHex, signedTxHex };
};
