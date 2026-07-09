export interface AdaUsdPrice {
  usd: number;
  fetchedAt: Date;
}

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd';

/** Fetch the current ADA/USD spot price from CoinGecko. */
export async function fetchAdaUsdPrice(): Promise<AdaUsdPrice> {
  const res = await fetch(COINGECKO_URL);
  if (!res.ok) {
    throw new Error(`CoinGecko price fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { cardano?: { usd?: number } };
  const usd = data?.cardano?.usd;
  if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) {
    throw new Error('CoinGecko returned an invalid ADA/USD price');
  }

  return {
    usd,
    fetchedAt: new Date(),
  };
}
