import {
  drepMetadataTxMode,
  fetchDrepRegistrationStatus,
  resolveDrepMetadataTxMode,
} from './drepRegistrationStatus';

describe('drepMetadataTxMode', () => {
  it('returns register for unregistered, retired, and expired', () => {
    expect(drepMetadataTxMode('unregistered')).toBe('register');
    expect(drepMetadataTxMode('retired')).toBe('register');
    expect(drepMetadataTxMode('expired')).toBe('register');
  });

  it('returns update for active', () => {
    expect(drepMetadataTxMode('active')).toBe('update');
  });
});

describe('resolveDrepMetadataTxMode', () => {
  it('maps active to update and unregistered to register', () => {
    expect(resolveDrepMetadataTxMode('active')).toBe('update');
    expect(resolveDrepMetadataTxMode('unregistered')).toBe('register');
  });

  it('aligns with drepMetadataTxMode for all statuses', () => {
    const statuses = ['unregistered', 'active', 'retired', 'expired'] as const;
    for (const status of statuses) {
      expect(resolveDrepMetadataTxMode(status)).toBe(drepMetadataTxMode(status));
    }
  });
});

describe('fetchDrepRegistrationStatus', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns unregistered on 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      ok: false,
    }) as typeof fetch;

    const result = await fetchDrepRegistrationStatus('test-key', 'drep1abc');
    expect(result).toEqual({ status: 'unregistered', drepId: 'drep1abc' });
  });

  it('returns active when not retired or expired', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ drep_id: 'drep1abc', retired: false, expired: false }),
    }) as typeof fetch;

    const result = await fetchDrepRegistrationStatus('test-key', 'drep1abc');
    expect(result.status).toBe('active');
  });

  it('returns retired when retired flag is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ drep_id: 'drep1abc', retired: true, expired: false }),
    }) as typeof fetch;

    const result = await fetchDrepRegistrationStatus('test-key', 'drep1abc');
    expect(result.status).toBe('retired');
  });

  it('returns expired when expired flag is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ drep_id: 'drep1abc', retired: false, expired: true }),
    }) as typeof fetch;

    const result = await fetchDrepRegistrationStatus('test-key', 'drep1abc');
    expect(result.status).toBe('expired');
  });
});
