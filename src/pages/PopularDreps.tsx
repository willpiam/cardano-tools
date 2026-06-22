import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';
import { DRepMetadataModal } from '../components/DRepMetadataModal';
import { PopularDrepsSettingsModal } from '../components/PopularDrepsSettingsModal';
import { EmergoInsightsModal } from '../components/EmergoInsightsModal';
import {
  DEFAULT_POPULAR_DREPS_PAGE_SIZE,
  fetchAndCachePopularDrepsPage,
  loadPopularDrepsPage,
  type PopularDrepRow,
} from '../functions/popularDrepsFetch';
import {
  fetchEmergoInsightsBreakdown,
  type DelegationBreakdownLovelace,
} from '../functions/emergoInsights';
import { formatAdaCompact } from '../utils/formatAda';
import { countDrepMetadataDocCache } from '../utils/drepMetadataDocCache';
import {
  countPopularDrepsPageCache,
  clearPopularDrepsPageCache,
} from '../utils/popularDrepsCache';
import {
  getBlockfrostApiKeyFromStorage,
  hasBlockfrostApiKeyInUrl,
  saveBlockfrostApiKeyToStorage,
} from '../utils/toolConfigStorage';
import '../components/IpfsLinkModal.css';
import './DRepVotingHistory.css';

type ActiveFilter = 'active' | 'all' | 'retired' | 'expired';

function filterParams(activeFilter: ActiveFilter): { retired?: boolean; expired?: boolean } {
  switch (activeFilter) {
    case 'active':
      return { retired: false, expired: false };
    case 'retired':
      return { retired: true };
    case 'expired':
      return { expired: true };
    default:
      return {};
  }
}

const PopularDreps = () => {
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [rows, setRows] = useState<PopularDrepRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [cachedPageCount, setCachedPageCount] = useState(0);
  const [cachedDrepMetadataDocCount, setCachedDrepMetadataDocCount] = useState(0);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [metadataModalDrepId, setMetadataModalDrepId] = useState<string | null>(null);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsBreakdown, setInsightsBreakdown] = useState<DelegationBreakdownLovelace | null>(null);

  const refreshCacheCounts = useCallback(async () => {
    const [pages, metadataDocs] = await Promise.all([
      countPopularDrepsPageCache(),
      countDrepMetadataDocCache(),
    ]);
    setCachedPageCount(pages);
    setCachedDrepMetadataDocCount(metadataDocs);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockfrostApiKey = urlParams.get('blockfrostApiKey');
    if (blockfrostApiKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: blockfrostApiKey }));
      setLocalApiKey(blockfrostApiKey);
      saveBlockfrostApiKeyToStorage(blockfrostApiKey);
      return;
    }

    if (!hasBlockfrostApiKeyInUrl()) {
      const cached = getBlockfrostApiKeyFromStorage();
      if (cached) {
        dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: cached }));
        setLocalApiKey(cached);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (apiKey) {
      setLocalApiKey(apiKey);
      saveBlockfrostApiKeyToStorage(apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    void refreshCacheCounts();
  }, [refreshCacheCounts]);

  const fetchOptions = useMemo(
    () => ({
      count: DEFAULT_POPULAR_DREPS_PAGE_SIZE,
      ...filterParams(activeFilter),
    }),
    [activeFilter]
  );

  const loadInitial = useCallback(
    async (key: string, forceRefresh = false) => {
      setLoading(true);
      setError(null);
      setRows([]);
      setPage(1);
      setHasMore(false);

      try {
        if (!forceRefresh) {
          const cached = await loadPopularDrepsPage(key, { page: 1, ...fetchOptions });
          if (cached.fromCache) {
            setRows(cached.rows);
            setHasMore(cached.hasMore);
            setLoading(false);
          }
        }

        setRefreshing(true);
        const fresh = await fetchAndCachePopularDrepsPage(key, {
          page: 1,
          ...fetchOptions,
          skipCache: true,
        });
        setRows(fresh.rows);
        setHasMore(fresh.hasMore);
        await refreshCacheCounts();
      } catch (err) {
        console.error('Failed to load popular DReps', err);
        setError(err instanceof Error ? err.message : 'Failed to load popular DReps');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchOptions, refreshCacheCounts]
  );

  useEffect(() => {
    if (!apiKey) return;
    void loadInitial(apiKey);
  }, [apiKey, activeFilter, loadInitial]);

  const handleApplyKey = () => {
    if (!localApiKey.trim()) return;
    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: localApiKey.trim() }));
    saveBlockfrostApiKeyToStorage(localApiKey.trim());
    const url = new URL(window.location.href);
    url.searchParams.set('blockfrostApiKey', localApiKey.trim());
    window.history.replaceState({}, '', url.toString());
  };

  const handleLoadMore = async () => {
    if (!apiKey || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await loadPopularDrepsPage(apiKey, {
        page: nextPage,
        ...fetchOptions,
      });
      setRows((prev) => [...prev, ...result.rows]);
      setPage(nextPage);
      setHasMore(result.hasMore);

      if (result.fromCache) {
        void fetchAndCachePopularDrepsPage(apiKey, {
          page: nextPage,
          ...fetchOptions,
          skipCache: true,
        }).then((fresh) => {
          setRows((prev) => {
            const head = prev.slice(0, (nextPage - 1) * DEFAULT_POPULAR_DREPS_PAGE_SIZE);
            return [...head, ...fresh.rows];
          });
          setHasMore(fresh.hasMore);
          void refreshCacheCounts();
        });
      } else {
        await refreshCacheCounts();
      }
    } catch (err) {
      console.error('Failed to load more popular DReps', err);
      setError(err instanceof Error ? err.message : 'Failed to load more DReps');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    if (!apiKey) return;
    setRefreshing(true);
    setError(null);

    try {
      const allRows: PopularDrepRow[] = [];
      let nextHasMore = false;

      for (let p = 1; p <= page; p++) {
        const result = await fetchAndCachePopularDrepsPage(apiKey, {
          page: p,
          ...fetchOptions,
          skipCache: true,
        });
        allRows.push(...result.rows);
        if (p === page) nextHasMore = result.hasMore;
      }

      setRows(allRows);
      setHasMore(nextHasMore);
      await refreshCacheCounts();
    } catch (err) {
      console.error('Failed to refresh popular DReps', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh popular DReps');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearLeaderboardCache = async () => {
    await clearPopularDrepsPageCache();
    await refreshCacheCounts();
  };

  const handleOpenInsights = async () => {
    if (!apiKey) return;
    setInsightsModalOpen(true);
    setInsightsLoading(true);
    setInsightsError(null);
    setInsightsBreakdown(null);

    try {
      const breakdown = await fetchEmergoInsightsBreakdown(apiKey);
      setInsightsBreakdown(breakdown);
    } catch (err) {
      console.error('Failed to load Emergo insights', err);
      setInsightsError(err instanceof Error ? err.message : 'Failed to load Emergo insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
        }}
      >
        <div
          className="main-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '980px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <h1 style={{ margin: 0 }}>Popular DReps</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {apiKey && (
                <Button onClick={() => void handleOpenInsights()} disabled={insightsLoading}>
                  Emergo Insights
                </Button>
              )}
              <button
                type="button"
                className="voting-history-settings-icon-btn"
                onClick={() => setSettingsModalOpen(true)}
                disabled={loading && rows.length === 0}
                title="Settings"
                aria-label="Open popular DReps settings"
              >
                <Settings size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <p style={{ margin: 0, color: '#d1d5db' }}>
            DReps ranked by delegated voting power. Data from Blockfrost mainnet.
          </p>

          {!apiKey && (
            <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                A Blockfrost API key is required. Get one from{' '}
                <a
                  href="https://blockfrost.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  blockfrost.io
                </a>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter your Blockfrost API key"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyKey()}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <Button onClick={handleApplyKey}>Set Key</Button>
              </div>
            </div>
          )}

          {apiKey && (
            <div
              style={{
                border: '1px solid #ccc',
                padding: '1rem',
                borderRadius: '4px',
                width: '100%',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ minWidth: '220px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Filter</label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="active">Active only</option>
                  <option value="all">All DReps</option>
                  <option value="retired">Retired</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              {refreshing && (
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Refreshing from Blockfrost…</span>
              )}
            </div>
          )}

          {loading && rows.length === 0 && <p>Loading popular DReps…</p>}

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px',
                color: '#c00',
                width: '100%',
              }}
            >
              Error: {error}
            </div>
          )}

          {rows.length > 0 && (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.92rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #4b5563', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem', width: '3rem' }}>#</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>DRep</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Voting power</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.drepId} style={{ borderBottom: '1px solid #374151' }}>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#9ca3af' }}>{index + 1}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {row.profile?.image?.contentUrl && (
                            <img
                              src={row.profile.image.contentUrl}
                              alt=""
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: '#e5e7eb' }}>{row.displayName}</div>
                            <code style={{ fontSize: '0.78rem', color: '#9ca3af', wordBreak: 'break-all' }}>
                              {row.drepId}
                            </code>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#93c5fd' }}>
                        {formatAdaCompact(row.amountLovelace)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {row.retired && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: '#450a0a',
                                color: '#fca5a5',
                              }}
                            >
                              Retired
                            </span>
                          )}
                          {row.expired && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: '#422006',
                                color: '#fcd34d',
                              }}
                            >
                              Expired
                            </span>
                          )}
                          {!row.retired && !row.expired && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: '#022c22',
                                color: '#34d399',
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link
                            to={`/drephistory/${encodeURIComponent(row.drepId)}`}
                            style={{ color: '#93c5fd', fontSize: '0.85rem' }}
                          >
                            Voting history
                          </Link>
                          {apiKey && (
                            <button
                              type="button"
                              onClick={() => setMetadataModalDrepId(row.drepId)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#93c5fd',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              Profile
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && rows.length === 0 && apiKey && (
            <p>No DReps found for the current filter.</p>
          )}

          {hasMore && apiKey && (
            <Button onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      </div>

      {apiKey && metadataModalDrepId && (
        <DRepMetadataModal
          open={Boolean(metadataModalDrepId)}
          drepId={metadataModalDrepId}
          apiKey={apiKey}
          onClose={() => setMetadataModalDrepId(null)}
          onCacheUpdated={() => void refreshCacheCounts()}
        />
      )}

      <PopularDrepsSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        cachedPageCount={cachedPageCount}
        cachedDrepMetadataDocCount={cachedDrepMetadataDocCount}
        onRefresh={() => void handleRefresh()}
        onClearLeaderboardCache={() => void handleClearLeaderboardCache()}
        refreshDisabled={!apiKey || refreshing}
        clearDisabled={cachedPageCount === 0}
      />

      <EmergoInsightsModal
        open={insightsModalOpen}
        onClose={() => setInsightsModalOpen(false)}
        loading={insightsLoading}
        error={insightsError}
        breakdown={insightsBreakdown}
      />
    </div>
  );
};

export default PopularDreps;
