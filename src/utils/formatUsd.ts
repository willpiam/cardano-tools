const LOVELACE_PER_ADA = 1_000_000;

/** Compact USD for large treasury values: $1.2B, $350M, $42K. */
export function formatUsdCompact(usd: number): string {
  const abs = Math.abs(usd);
  if (abs >= 1_000_000_000) {
    return `$${formatCompactTier(usd / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${formatCompactTier(usd / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `$${formatCompactTier(usd / 1_000)}K`;
  }
  return `$${Math.round(usd).toLocaleString()}`;
}

/** Full-precision USD for detail views. */
export function formatUsdExact(usd: number): string {
  return usd.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function lovelaceToUsd(lovelace: bigint, adaUsd: number): number {
  const ada = Number(lovelace) / LOVELACE_PER_ADA;
  return ada * adaUsd;
}

function formatCompactTier(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.05) {
    return String(rounded);
  }
  return value.toFixed(1).replace(/\.0$/, '');
}
