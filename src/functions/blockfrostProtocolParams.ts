/**
 * Blockfrost protocol parameters snapshot for CML TransactionBuilderConfig.
 * Shared by treasury donations and bulk DRep voting.
 */

const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface ProtocolParametersSnapshot {
  minFeeA: bigint;
  minFeeB: bigint;
  minFeeRefScriptCostPerByte: bigint;
  poolDeposit: bigint;
  keyDeposit: bigint;
  coinsPerUtxoByte: bigint;
  maxValSize: number;
  maxTxSize: number;
  collateralPercent: number;
  maxCollateralInputs: number;
  priceMem: { numerator: bigint; denominator: bigint };
  priceStep: { numerator: bigint; denominator: bigint };
  costModelsJson: string;
}

const decimalToRational = (raw: unknown): { numerator: bigint; denominator: bigint } => {
  if (raw === null || raw === undefined) {
    return { numerator: BigInt(0), denominator: BigInt(1) };
  }
  const str = String(raw);
  if (str.includes('/')) {
    const [n, d] = str.split('/');
    return { numerator: BigInt(n), denominator: BigInt(d || '1') };
  }
  if (!str.includes('.')) {
    return { numerator: BigInt(str), denominator: BigInt(1) };
  }
  const [intPart, fracPart] = str.split('.');
  const denominator = BigInt('1' + '0'.repeat(fracPart.length));
  const numerator = BigInt(intPart) * denominator + BigInt(fracPart);
  return { numerator, denominator };
};

const toBigInt = (raw: unknown, fallback: bigint = BigInt(0)): bigint => {
  if (raw === null || raw === undefined) return fallback;
  try {
    return BigInt(String(raw).split('.')[0]);
  } catch {
    return fallback;
  }
};

const toNumber = (raw: unknown, fallback: number = 0): number => {
  if (raw === null || raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const blockfrostFetch = async (apiKey: string, path: string): Promise<any> => {
  const res = await fetch(`${BLOCKFROST_BASE_URL}${path}`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) {
    throw new Error(`Blockfrost ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

export const fetchProtocolParametersSnapshot = async (apiKey: string): Promise<ProtocolParametersSnapshot> => {
  const params = await blockfrostFetch(apiKey, '/epochs/latest/parameters');
  const costModelsObj = params?.cost_models_raw ?? params?.cost_models ?? {};
  const costModelsJson = JSON.stringify(costModelsObj);

  return {
    minFeeA: toBigInt(params?.min_fee_a, BigInt(44)),
    minFeeB: toBigInt(params?.min_fee_b, BigInt(155381)),
    minFeeRefScriptCostPerByte: toBigInt(params?.min_fee_ref_script_cost_per_byte, BigInt(15)),
    poolDeposit: toBigInt(params?.pool_deposit, BigInt(500000000)),
    keyDeposit: toBigInt(params?.key_deposit, BigInt(2000000)),
    coinsPerUtxoByte: toBigInt(params?.coins_per_utxo_size ?? params?.coins_per_utxo_word, BigInt(4310)),
    maxValSize: toNumber(params?.max_val_size, 5000),
    maxTxSize: toNumber(params?.max_tx_size, 16384),
    collateralPercent: toNumber(params?.collateral_percent, 150),
    maxCollateralInputs: toNumber(params?.max_collateral_inputs, 3),
    priceMem: decimalToRational(params?.price_mem),
    priceStep: decimalToRational(params?.price_step),
    costModelsJson,
  };
};
