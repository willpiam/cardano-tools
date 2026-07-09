import { fetchAdaUsdPrice, type AdaUsdPrice } from '../utils/adaPrice';
import {
  getCachedAdaUsdPrice,
  getCachedTreasuryBalance,
  isCacheFresh,
  putCachedAdaUsdPrice,
  putCachedTreasuryBalance,
} from '../utils/treasuryBalanceCache';
import { fetchTreasuryBalance, type TreasuryBalanceSnapshot } from './treasuryBalanceFetch';

export interface TreasuryBalanceData {
  balance: TreasuryBalanceSnapshot | null;
  balanceFromCache: boolean;
  adaPrice: AdaUsdPrice | null;
  priceFromCache: boolean;
  balanceError: string | null;
  priceError: string | null;
}

function cachedBalanceToSnapshot(cached: { treasuryLovelace: string; cachedAtSec: number }): TreasuryBalanceSnapshot {
  return {
    treasuryLovelace: BigInt(cached.treasuryLovelace),
    fetchedAt: new Date(cached.cachedAtSec * 1000),
  };
}

function cachedPriceToSnapshot(cached: { usd: number; cachedAtSec: number }): AdaUsdPrice {
  return {
    usd: cached.usd,
    fetchedAt: new Date(cached.cachedAtSec * 1000),
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function loadBalance(
  apiKey: string,
  forceRefresh: boolean,
): Promise<Pick<TreasuryBalanceData, 'balance' | 'balanceFromCache' | 'balanceError'>> {
  const cached = getCachedTreasuryBalance();

  if (!forceRefresh && cached && isCacheFresh(cached.cachedAtSec)) {
    return {
      balance: cachedBalanceToSnapshot(cached),
      balanceFromCache: true,
      balanceError: null,
    };
  }

  try {
    const balance = await fetchTreasuryBalance(apiKey);
    putCachedTreasuryBalance(balance.treasuryLovelace);
    return {
      balance,
      balanceFromCache: false,
      balanceError: null,
    };
  } catch (err) {
    if (cached) {
      return {
        balance: cachedBalanceToSnapshot(cached),
        balanceFromCache: true,
        balanceError: `Refresh failed; showing cached balance. ${errorMessage(err, 'Failed to fetch treasury balance')}`,
      };
    }
    return {
      balance: null,
      balanceFromCache: false,
      balanceError: errorMessage(err, 'Failed to fetch treasury balance'),
    };
  }
}

async function loadPrice(
  forceRefresh: boolean,
): Promise<Pick<TreasuryBalanceData, 'adaPrice' | 'priceFromCache' | 'priceError'>> {
  const cached = getCachedAdaUsdPrice();

  if (!forceRefresh && cached && isCacheFresh(cached.cachedAtSec)) {
    return {
      adaPrice: cachedPriceToSnapshot(cached),
      priceFromCache: true,
      priceError: null,
    };
  }

  try {
    const adaPrice = await fetchAdaUsdPrice();
    putCachedAdaUsdPrice(adaPrice.usd);
    return {
      adaPrice,
      priceFromCache: false,
      priceError: null,
    };
  } catch (err) {
    if (cached) {
      return {
        adaPrice: cachedPriceToSnapshot(cached),
        priceFromCache: true,
        priceError: `Refresh failed; showing cached price. ${errorMessage(err, 'Failed to fetch ADA/USD price')}`,
      };
    }
    return {
      adaPrice: null,
      priceFromCache: false,
      priceError: errorMessage(err, 'Failed to fetch ADA/USD price'),
    };
  }
}

/** Load treasury balance and ADA/USD price, using a 24-hour cache unless forceRefresh is set. */
export async function loadTreasuryBalanceData(
  apiKey: string,
  options: { forceRefresh?: boolean } = {},
): Promise<TreasuryBalanceData> {
  const forceRefresh = options.forceRefresh ?? false;
  const [balanceResult, priceResult] = await Promise.all([
    loadBalance(apiKey, forceRefresh),
    loadPrice(forceRefresh),
  ]);

  return {
    ...balanceResult,
    ...priceResult,
  };
}
