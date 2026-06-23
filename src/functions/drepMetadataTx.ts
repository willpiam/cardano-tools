import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';
import { blake2b_224 } from '@harmoniclabs/crypto';
import type { ProtocolParametersSnapshot } from './blockfrostProtocolParams';

export interface DrepMetadataAnchor {
  url: string;
  /** 32-byte document hash as 64 hex characters (no 0x). */
  hashHex: string;
}

export interface BuildAndSubmitDrepMetadataTxOptions {
  api: any;
  params: ProtocolParametersSnapshot;
  changeAddressBech32: string;
  /** 28-byte Ed25519 key hash as hex (from DRep credential). */
  drepKeyHashHex: string;
  mode: 'register' | 'update';
  anchor: DrepMetadataAnchor;
}

export interface DrepMetadataTxResult {
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

function normalizeHashHex(hex: string): string {
  return hex.trim().replace(/^0x/i, '');
}

function buildCmlAnchor(anchor: DrepMetadataAnchor): CML.Anchor {
  const url = anchor.url.trim();
  const hashNorm = normalizeHashHex(anchor.hashHex);
  if (!url) throw new Error('Anchor URL is empty');
  if (!/^[0-9a-fA-F]{64}$/.test(hashNorm)) {
    throw new Error('Anchor hash must be exactly 64 hex characters (32-byte blake2b-256 digest)');
  }
  const urlObj = CML.Url.from_json(JSON.stringify(url));
  const docHash = CML.AnchorDocHash.from_hex(hashNorm);
  return CML.Anchor.new(urlObj, docHash);
}

function witnessSetContainsKeyHash(
  wits: CML.TransactionWitnessSet,
  expectedKeyHashHex: string
): boolean {
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

function buildCertificate(
  drepKeyHashHex: string,
  mode: 'register' | 'update',
  anchor: CML.Anchor,
  keyDeposit: bigint
): CML.Certificate {
  const cred = CML.Credential.new_pub_key(
    CML.Ed25519KeyHash.from_hex(normalizeHashHex(drepKeyHashHex))
  );

  if (mode === 'register') {
    return CML.Certificate.new_reg_drep_cert(cred, keyDeposit, anchor);
  }
  return CML.Certificate.new_update_drep_cert(cred, anchor);
}

/**
 * Build and submit a DRep registration or metadata update transaction.
 */
export async function buildAndSubmitDrepMetadataTx(
  options: BuildAndSubmitDrepMetadataTxOptions
): Promise<DrepMetadataTxResult> {
  const { api, params, changeAddressBech32, drepKeyHashHex, mode, anchor } = options;

  const cmlAnchor = buildCmlAnchor(anchor);
  const cert = buildCertificate(drepKeyHashHex, mode, cmlAnchor, params.keyDeposit);

  const cfg = buildConfig(params);
  const txb = CML.TransactionBuilder.new(cfg);
  const changeAddress = CML.Address.from_bech32(changeAddressBech32.trim());

  txb.add_cert(CML.SingleCertificateBuilder.new(cert).payment_key());

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
    throw new Error('Could not balance the transaction (insufficient funds for fees and deposit)');
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
      'The wallet returned signatures but none matches your DRep key. Reconnect with CIP-95 enabled and try again.'
    );
  }

  const witsBuilder = CML.TransactionWitnessSetBuilder.new();
  witsBuilder.add_existing(walletWits);

  const finalBody = builtTx.body();
  const finalWits = witsBuilder.build();
  const auxForSigned = builtTx.auxiliary_data();
  const signedTx = CML.Transaction.new(finalBody, finalWits, true, auxForSigned);
  const signedTxHex = signedTx.to_canonical_cbor_hex();

  const txHash: string = await api.submitTx(signedTxHex);

  return { txHash, unsignedTxHex, signedTxHex };
}
