const LOVELACE_PER_ADA = 1_000_000;

function formatCompactTier(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.05) {
    return String(rounded);
  }
  return value.toFixed(1).replace(/\.0$/, '');
}

/** Compact badge style: ₳70M, ₳6.3K, ₳1.2B, or whole ADA below 1K. */
export function formatAdaCompact(lovelace: number): string {
  const ada = lovelace / LOVELACE_PER_ADA;
  if (ada >= 1_000_000_000) {
    return `₳${formatCompactTier(ada / 1_000_000_000)}B`;
  }
  if (ada >= 1_000_000) {
    return `₳${formatCompactTier(ada / 1_000_000)}M`;
  }
  if (ada >= 1_000) {
    return `₳${formatCompactTier(ada / 1_000)}K`;
  }
  return `₳${Math.round(ada).toLocaleString()}`;
}

/** Full-precision ADA for detail views. */
export function formatAdaExact(lovelace: number): string {
  const ada = lovelace / LOVELACE_PER_ADA;
  return `₳${ada.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}
