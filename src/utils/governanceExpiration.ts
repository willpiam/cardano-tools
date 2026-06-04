import {
  fetchBlockfrostProposalMetadataAnchor,
  resolveProposalMetadataAnchorInfo,
  type ProposalMetadataAnchorInfo,
} from '../functions/governanceActionsFetch';

export type { ProposalMetadataAnchorInfo } from '../functions/governanceActionsFetch';

const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export interface BlockfrostEpochLatest {
  epoch: number;
  start_time: number;
  end_time: number;
}

export interface BlockfrostProposalExpirationFields {
  expiration: number | null;
  expired_epoch: number | null;
  ratified_epoch: number | null;
  enacted_epoch: number | null;
  dropped_epoch: number | null;
}

export interface GovernanceEpochContext {
  currentEpoch: number;
  epochEndTimeSec: number;
  epochLengthSec: number;
}

export type GovernanceActionTimeStatus =
  | { kind: 'countdown'; deadlineSec: number }
  | { kind: 'expired' }
  | { kind: 'ratified' }
  | { kind: 'enacted' }
  | { kind: 'dropped' }
  | { kind: 'unknown' };

export async function fetchGovernanceEpochContext(apiKey: string): Promise<GovernanceEpochContext> {
  const res = await fetch(`${BLOCKFROST_BASE}/epochs/latest`, {
    headers: { project_id: apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Blockfrost ${res.status}: ${body}`);
  }
  const data: BlockfrostEpochLatest = await res.json();
  const epochLengthSec = Math.max(1, data.end_time - data.start_time);
  return {
    currentEpoch: data.epoch,
    epochEndTimeSec: data.end_time,
    epochLengthSec,
  };
}

/** Deadline is the start of the expiration epoch (when voting ends if not ratified). */
export function expirationDeadlineSec(ctx: GovernanceEpochContext, expirationEpoch: number): number {
  if (expirationEpoch <= ctx.currentEpoch) {
    return ctx.epochEndTimeSec;
  }
  return ctx.epochEndTimeSec + (expirationEpoch - ctx.currentEpoch - 1) * ctx.epochLengthSec;
}

export function resolveGovernanceTimeStatus(
  detail: BlockfrostProposalExpirationFields,
  ctx: GovernanceEpochContext,
  nowSec = Math.floor(Date.now() / 1000)
): GovernanceActionTimeStatus {
  if (detail.dropped_epoch !== null) return { kind: 'dropped' };
  if (detail.enacted_epoch !== null) return { kind: 'enacted' };
  if (detail.expired_epoch !== null) return { kind: 'expired' };
  if (detail.ratified_epoch !== null) return { kind: 'ratified' };

  const expiration = detail.expiration;
  if (expiration === null || !Number.isFinite(expiration)) {
    return { kind: 'unknown' };
  }

  const deadlineSec = expirationDeadlineSec(ctx, expiration);
  if (nowSec >= deadlineSec) return { kind: 'expired' };
  return { kind: 'countdown', deadlineSec };
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Expired';
  if (totalSeconds < 60) return '< 1m';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function formatGovernanceTimeRemaining(
  status: GovernanceActionTimeStatus,
  nowSec = Math.floor(Date.now() / 1000)
): string {
  switch (status.kind) {
    case 'dropped':
      return 'Dropped';
    case 'enacted':
      return 'Enacted';
    case 'ratified':
      return 'Ratified';
    case 'expired':
      return 'Expired';
    case 'unknown':
      return '—';
    case 'countdown':
      return formatDurationSeconds(status.deadlineSec - nowSec);
  }
}

/** Voting has ended (ratified, enacted, expired, or dropped). Excludes live countdown and unknown. */
export function isGovernanceActionFinalized(status: GovernanceActionTimeStatus): boolean {
  return (
    status.kind === 'expired' ||
    status.kind === 'ratified' ||
    status.kind === 'enacted' ||
    status.kind === 'dropped'
  );
}

export function governanceTimeStatusTitle(status: GovernanceActionTimeStatus): string | undefined {
  if (status.kind === 'countdown') {
    return `Voting ends ${new Date(status.deadlineSec * 1000).toLocaleString()}`;
  }
  return undefined;
}

export function timeRemainingColor(status: GovernanceActionTimeStatus, nowSec = Math.floor(Date.now() / 1000)): string {
  switch (status.kind) {
    case 'countdown': {
      const secondsLeft = status.deadlineSec - nowSec;
      if (secondsLeft < 86400) return '#ef4444';
      if (secondsLeft < 3 * 86400) return '#eab308';
      return '#22c55e';
    }
    case 'ratified':
      return '#38bdf8';
    case 'enacted':
      return '#a78bfa';
    case 'expired':
    case 'dropped':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const current = next++;
      if (current >= items.length) return;
      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

export async function fetchProposalExpirationFields(
  apiKey: string,
  proposals: { tx_hash: string; cert_index: number; id?: string }[]
): Promise<{
  expirationByKey: Map<string, BlockfrostProposalExpirationFields>;
  metadataAnchorByKey: Map<string, ProposalMetadataAnchorInfo>;
}> {
  const details = await mapWithConcurrency(proposals, 8, async (proposal) => {
    const key = `${proposal.tx_hash}#${proposal.cert_index}`;
    try {
      const [detailRes, blockfrostAnchor] = await Promise.all([
        fetch(
          `${BLOCKFROST_BASE}/governance/proposals/${proposal.tx_hash}/${proposal.cert_index}`,
          { headers: { project_id: apiKey } }
        ),
        fetchBlockfrostProposalMetadataAnchor(apiKey, proposal),
      ]);
      if (!detailRes.ok) return { key, fields: null, metadataAnchor: null as ProposalMetadataAnchorInfo | null };
      const detail = await detailRes.json();
      const metadataAnchor = resolveProposalMetadataAnchorInfo(
        blockfrostAnchor,
        detail.governance_description
      );

      return {
        key,
        fields: {
          expiration: typeof detail.expiration === 'number' ? detail.expiration : null,
          expired_epoch: detail.expired_epoch ?? null,
          ratified_epoch: detail.ratified_epoch ?? null,
          enacted_epoch: detail.enacted_epoch ?? null,
          dropped_epoch: detail.dropped_epoch ?? null,
        } satisfies BlockfrostProposalExpirationFields,
        metadataAnchor,
      };
    } catch {
      return { key, fields: null, metadataAnchor: null };
    }
  });

  const expirationByKey = new Map<string, BlockfrostProposalExpirationFields>();
  const metadataAnchorByKey = new Map<string, ProposalMetadataAnchorInfo>();
  for (const { key, fields, metadataAnchor } of details) {
    if (fields) expirationByKey.set(key, fields);
    if (metadataAnchor) metadataAnchorByKey.set(key, metadataAnchor);
  }
  return { expirationByKey, metadataAnchorByKey };
}
