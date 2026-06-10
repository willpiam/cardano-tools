import {
  BLOCKFROST_API_KEY_STORAGE_KEY,
  BULK_VOTE_CONFIG_STORAGE_KEY,
  DREP_HISTORY_CONFIG_STORAGE_KEY,
  getBlockfrostApiKeyFromStorage,
  getBulkVoteConfigFromStorage,
  getDRepHistoryConfigFromStorage,
  saveBlockfrostApiKeyToStorage,
  saveBulkVoteConfigToStorage,
  saveDRepHistoryConfigToStorage,
} from './toolConfigStorage';

describe('toolConfigStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and reads Blockfrost API key', () => {
    saveBlockfrostApiKeyToStorage('mainnetTestKey');
    expect(getBlockfrostApiKeyFromStorage()).toBe('mainnetTestKey');
    expect(localStorage.getItem(BLOCKFROST_API_KEY_STORAGE_KEY)).toBe('mainnetTestKey');
  });

  it('ignores empty Blockfrost API key writes', () => {
    saveBlockfrostApiKeyToStorage('   ');
    expect(getBlockfrostApiKeyFromStorage()).toBeNull();
  });

  it('merges bulk vote config partial updates', () => {
    saveBulkVoteConfigToStorage({ pinataJwt: 'jwt1' });
    saveBulkVoteConfigToStorage({
      anchor: { attachAnchor: true, anchorUrl: 'ipfs://abc', anchorHashHex: 'deadbeef' },
    });

    const config = getBulkVoteConfigFromStorage();
    expect(config?.pinataJwt).toBe('jwt1');
    expect(config?.anchor).toEqual({
      attachAnchor: true,
      anchorUrl: 'ipfs://abc',
      anchorHashHex: 'deadbeef',
    });
    expect(config?.savedAtSec).toBeGreaterThan(0);
    expect(localStorage.getItem(BULK_VOTE_CONFIG_STORAGE_KEY)).toBeTruthy();
  });

  it('merges drep history config partial updates', () => {
    saveDRepHistoryConfigToStorage({ drepId: 'drep1abc' });
    const config = getDRepHistoryConfigFromStorage();
    expect(config?.drepId).toBe('drep1abc');
    expect(config?.savedAtSec).toBeGreaterThan(0);
    expect(localStorage.getItem(DREP_HISTORY_CONFIG_STORAGE_KEY)).toBeTruthy();
  });
});
