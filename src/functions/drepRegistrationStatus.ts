const BLOCKFROST_BASE = 'https://cardano-mainnet.blockfrost.io/api/v0';

export type DrepRegistrationStatus = 'unregistered' | 'active' | 'retired' | 'expired';

interface BlockfrostDrepResponse {
  drep_id: string;
  retired: boolean;
  expired: boolean;
}

export interface DrepRegistrationStatusResult {
  status: DrepRegistrationStatus;
  drepId: string;
}

/** Resolve on-chain DRep registration status via Blockfrost. */
export async function fetchDrepRegistrationStatus(
  apiKey: string,
  drepId: string
): Promise<DrepRegistrationStatusResult> {
  const trimmedId = drepId.trim();
  if (!trimmedId) {
    throw new Error('DRep ID is required.');
  }

  const res = await fetch(
    `${BLOCKFROST_BASE}/governance/dreps/${encodeURIComponent(trimmedId)}`,
    { headers: { project_id: apiKey.trim() } }
  );

  if (res.status === 404) {
    return { status: 'unregistered', drepId: trimmedId };
  }

  if (!res.ok) {
    throw new Error(`Blockfrost DRep lookup failed (${res.status} ${res.statusText})`);
  }

  const data = (await res.json()) as BlockfrostDrepResponse;

  if (data.retired) {
    return { status: 'retired', drepId: trimmedId };
  }
  if (data.expired) {
    return { status: 'expired', drepId: trimmedId };
  }

  return { status: 'active', drepId: trimmedId };
}

/** Map registration status to the on-chain certificate mode. */
export function drepMetadataTxMode(
  status: DrepRegistrationStatus
): 'register' | 'update' | null {
  switch (status) {
    case 'unregistered':
    case 'retired':
    case 'expired':
      return 'register';
    case 'active':
      return 'update';
    default:
      return null;
  }
}

/** Resolve tx mode from registration status; throws when unsupported. */
export function resolveDrepMetadataTxMode(status: DrepRegistrationStatus): 'register' | 'update' {
  const mode = drepMetadataTxMode(status);
  if (!mode) {
    throw new Error(`Unsupported DRep registration status: ${status}`);
  }
  return mode;
}
