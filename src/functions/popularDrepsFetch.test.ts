import {
  filterLeaderboardDreps,
  mapBlockfrostDrepToRow,
  seedDrepMetadataDocsFromListItems,
  type BlockfrostDrepListItem,
} from './popularDrepsFetch';
import type { CachedDrepMetadataDoc } from '../utils/drepMetadataDocCache';

jest.mock('../utils/drepMetadataDocFetch', () => ({
  seedDrepMetadataDocFromListItem: jest.fn().mockResolvedValue(true),
}));

import { seedDrepMetadataDocFromListItem } from '../utils/drepMetadataDocFetch';

const mockSeed = seedDrepMetadataDocFromListItem as jest.MockedFunction<
  typeof seedDrepMetadataDocFromListItem
>;

const baseItem = (overrides: Partial<BlockfrostDrepListItem> = {}): BlockfrostDrepListItem => ({
  drep_id: 'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpzklpg',
  hex: 'abc123',
  amount: '5000000000000',
  has_script: false,
  retired: false,
  expired: false,
  last_active_epoch: 500,
  metadata: {
    url: 'https://example.com/drep.json',
    hash: 'deadbeef',
    json_metadata: {
      body: { givenName: 'Embedded Name' },
    },
  },
  ...overrides,
});

describe('filterLeaderboardDreps', () => {
  it('excludes special system DReps', () => {
    const rows = [
      mapBlockfrostDrepToRow(baseItem()),
      mapBlockfrostDrepToRow(baseItem({ drep_id: 'drep_always_abstain' })),
      mapBlockfrostDrepToRow(baseItem({ drep_id: 'drep_always_no_confidence' })),
    ];
    const filtered = filterLeaderboardDreps(rows);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].drepId).toContain('drep1q');
  });
});

describe('mapBlockfrostDrepToRow', () => {
  it('parses amount and embedded givenName', () => {
    const row = mapBlockfrostDrepToRow(baseItem());
    expect(row.amountLovelace).toBe(5_000_000_000_000);
    expect(row.displayName).toBe('Embedded Name');
  });

  it('prefers cached metadata doc over embedded list metadata', () => {
    const cachedDoc: CachedDrepMetadataDoc = {
      metadata: {
        givenName: 'Cached Name',
        objectives: null,
        motivations: null,
        qualifications: null,
        paymentAddress: null,
        doNotList: null,
        image: null,
        references: [],
      },
      rawPayload: null,
      anchorUrl: 'https://example.com/drep.json',
      cachedAtSec: 1,
    };
    const cache = new Map([[baseItem().drep_id, cachedDoc]]);
    const row = mapBlockfrostDrepToRow(baseItem(), cache);
    expect(row.displayName).toBe('Cached Name');
  });
});

describe('seedDrepMetadataDocsFromListItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeed.mockResolvedValue(true);
  });

  it('seeds each list item', async () => {
    const count = await seedDrepMetadataDocsFromListItems([
      baseItem(),
      baseItem({ drep_id: 'drep1other' }),
    ]);
    expect(count).toBe(2);
    expect(mockSeed).toHaveBeenCalledTimes(2);
  });
});
