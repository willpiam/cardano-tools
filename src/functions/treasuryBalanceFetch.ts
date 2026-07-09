const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface TreasuryBalanceSnapshot {
  treasuryLovelace: bigint;
  fetchedAt: Date;
}

const blockfrostFetch = async (apiKey: string, path: string): Promise<unknown> => {
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

/** Fetch the current on-chain Cardano treasury balance from Blockfrost. */
export async function fetchTreasuryBalance(apiKey: string): Promise<TreasuryBalanceSnapshot> {
  const network = (await blockfrostFetch(apiKey, '/network')) as {
    supply?: { treasury?: string };
  };
  const treasuryLovelace = toBigInt(network?.supply?.treasury, BigInt(0));

  return {
    treasuryLovelace,
    fetchedAt: new Date(),
  };
}
