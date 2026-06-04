export const PROPOSAL_BATCH_SIZE = 12;
export const VOTE_TX_BATCH_SIZE = 8;
export const IN_BATCH_CONCURRENCY = 6;
export const BATCH_COOLDOWN_MS = 10_000;

export const RECACHE_MODAL_TITLE = 'Reloading & Recaching';

/** Split items into fixed-size batches (exported for tests). */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  if (batchSize <= 0) return items.length > 0 ? [items] : [];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export function formatProposalBatchDescription(current: number, total: number): string {
  return `Requesting batch ${current} of ${total}`;
}

export function formatVoteCborBatchDescription(current: number, total: number): string {
  return `Fetching vote CBOR batch ${current} of ${total}`;
}

export function formatBatchCooldownDescription(
  seconds: number,
  afterBatch: number,
  beforeBatch: number
): string {
  return `Waiting ${seconds} seconds between batch ${afterBatch} and ${beforeBatch}`;
}

export function cooldownSec(): number {
  return Math.round(BATCH_COOLDOWN_MS / 1000);
}
