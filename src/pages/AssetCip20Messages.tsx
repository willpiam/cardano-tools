import { useCallback, useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import './AssetCip20Messages.css';
import '../components/IpfsLinkModal.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';
import { ConchHistorySettingsModal } from '../components/ConchHistorySettingsModal';
import { getAssetCip20History, type Cip20MessageRow } from '../utils/cip20AssetHistory';
import { assetFingerprintFromUnitHex } from '../utils/cip14AssetFingerprint';
import { clearConchTxCache, countConchTxCache } from '../utils/conchHistoryCache';

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;

function parsePageSize(raw: string | null): number {
  if (!raw) return DEFAULT_PAGE_SIZE;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

const AssetCip20Messages = () => {
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [localAssetId, setLocalAssetId] = useState('');
  const [localPageSize, setLocalPageSize] = useState(String(DEFAULT_PAGE_SIZE));
  const [rows, setRows] = useState<Cip20MessageRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [cachedTxCount, setCachedTxCount] = useState(0);
  const [lastLoadCachedCount, setLastLoadCachedCount] = useState(0);

  const assetFingerprint = useMemo(
    () => assetFingerprintFromUnitHex(localAssetId),
    [localAssetId]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockfrostApiKey = urlParams.get('blockfrostApiKey');
    if (blockfrostApiKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: blockfrostApiKey }));
      setLocalApiKey(blockfrostApiKey);
    }
    const assetId = urlParams.get('assetId');
    if (assetId) setLocalAssetId(assetId);
    const pageSize = urlParams.get('pageSize') ?? urlParams.get('txLimit');
    if (pageSize) setLocalPageSize(pageSize);
  }, [dispatch]);

  useEffect(() => {
    if (apiKey) setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    void countConchTxCache().then(setCachedTxCount);
  }, []);

  const handleClearCache = useCallback(async () => {
    await clearConchTxCache();
    setCachedTxCount(0);
    setLastLoadCachedCount(0);
  }, []);

  const syncUrlParams = (key: string, assetId: string, pageSize: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('blockfrostApiKey', key);
    url.searchParams.set('assetId', assetId);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.delete('txLimit');
    window.history.replaceState({}, '', url.toString());
  };

  const handleApplySettings = () => {
    const key = localApiKey.trim() || (apiKey ?? '').trim();
    if (!key) return;

    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: key }));
    setLocalApiKey(key);

    const assetTrim = localAssetId.trim();
    const pageSize = parsePageSize(localPageSize.trim());

    syncUrlParams(key, assetTrim, pageSize);
  };

  const handleLoadHistory = async () => {
    const key = (apiKey || '').trim() || localApiKey.trim();
    const assetTrim = localAssetId.trim();
    if (!key || !assetTrim) {
      setError('A Blockfrost API key and asset id are required.');
      return;
    }

    const pageSize = parsePageSize(localPageSize.trim());
    setLoading(true);
    setError(null);

    try {
      const result = await getAssetCip20History(assetTrim, key, { page: 1, count: pageSize });
      setRows(result.rows);
      setPage(1);
      setHasMore(result.hasMore);
      setHasLoaded(true);
      setLastLoadCachedCount(result.cachedTxCount);
      const totalCached = await countConchTxCache();
      setCachedTxCount(totalCached);
    } catch (err) {
      console.error('Conch protocol history', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    const key = (apiKey || '').trim() || localApiKey.trim();
    const assetTrim = localAssetId.trim();
    if (!key || !assetTrim || loadingMore || !hasMore) return;

    const pageSize = parsePageSize(localPageSize.trim());
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);

    try {
      const result = await getAssetCip20History(assetTrim, key, {
        page: nextPage,
        count: pageSize,
      });
      setRows((prev) => {
        const seen = new Set(prev.map((row) => row.tx));
        const appended = result.rows.filter((row) => !seen.has(row.tx));
        return [...prev, ...appended];
      });
      setPage(nextPage);
      setHasMore(result.hasMore);
      setLastLoadCachedCount(result.cachedTxCount);
      const totalCached = await countConchTxCache();
      setCachedTxCount(totalCached);
    } catch (err) {
      console.error('Conch protocol history', err);
      setError(err instanceof Error ? err.message : 'Failed to load more history');
    } finally {
      setLoadingMore(false);
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
            maxWidth: '960px',
          }}
        >
          <h1>Conch protocol</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.92rem', margin: 0, lineHeight: 1.55 }}>
            <strong style={{ color: '#d1d5db' }}>Conch</strong> is a simple on-chain messaging pattern: short human-readable text is published as{' '}
            <strong>CIP-20</strong> transaction metadata (label <code style={{ fontSize: '0.85rem' }}>674</code>) on transactions that move a chosen native
            asset. This page scans that asset’s transaction history via Blockfrost and lists those messages newest first. Paste the asset’s full hex{' '}
            <strong>unit</strong> (policy id + hex-encoded asset name), not the CIP-14 <code style={{ fontSize: '0.85rem' }}>asset1…</code> fingerprint.
            Blockfrost API keys in the URL can leak via referrers and shared links; treat bookmarked URLs as sensitive.
          </p>
          <p style={{ margin: 0, fontSize: '0.92rem' }}>
            <Link to="/commit" style={{ color: '#0066cc', textDecoration: 'underline', fontWeight: 600 }}>
              Commit tool
            </Link>
            {' — '}attach new Conch-style (CIP-20 / 674) messages when you build and submit transactions.
          </p>

          <div
            style={{
              border: '1px solid #ccc',
              padding: '1rem',
              borderRadius: '4px',
              width: '100%',
            }}
          >
            <p style={{ marginBottom: '0.5rem' }}>
              Blockfrost project id (sent as the{' '}
              <code style={{ fontSize: '0.85rem' }}>project_id</code> header). Get one from{' '}
              <a
                href="https://blockfrost.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                blockfrost.io
              </a>
              .
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Enter your Blockfrost API key"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
              Asset id (hex unit)
            </label>
            <input
              type="text"
              placeholder="policyId + assetName hex"
              value={localAssetId}
              onChange={(e) => setLocalAssetId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                marginBottom: '0.35rem',
              }}
            />
            {assetFingerprint && (
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                CIP-14 fingerprint:{' '}
                <a
                  href={`https://cardanoscan.io/token/${assetFingerprint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0066cc', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                  {assetFingerprint}
                </a>{' '}
                (Cardanoscan)
              </p>
            )}

            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }}>
              Transactions per page (max {MAX_PAGE_SIZE})
            </label>
            <input
              type="number"
              min={1}
              max={MAX_PAGE_SIZE}
              value={localPageSize}
              onChange={(e) => setLocalPageSize(e.target.value)}
              style={{
                width: '8rem',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginBottom: '0.75rem',
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button onClick={handleApplySettings} disabled={!localApiKey.trim() && !apiKey}>
                Apply settings (save to URL)
              </Button>
              <Button
                onClick={handleLoadHistory}
                disabled={(!apiKey && !localApiKey.trim()) || !localAssetId.trim() || loading || loadingMore}
              >
                Load history
              </Button>
              <button
                type="button"
                className="voting-history-settings-icon-btn"
                onClick={() => setSettingsModalOpen(true)}
                disabled={loading || loadingMore}
                title="Settings"
                aria-label="Open Conch history settings"
              >
                <Settings size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {loading && <p>Loading Conch messages…</p>}

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

          {!loading && !error && rows.length > 0 && (
            <div className="conch-history-frame">
              {lastLoadCachedCount > 0 && (
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                  Cached <strong>{lastLoadCachedCount}</strong> transactions
                </p>
              )}
              <table className="conch-history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Tx</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.tx}>
                      <td>{row.timestamp}</td>
                      <td>
                        <a href={row.url} target="_blank" rel="noopener noreferrer">
                          {truncateHash(row.tx)}
                        </a>
                      </td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && hasLoaded && rows.length === 0 && (
            <p style={{ color: '#9ca3af' }}>No Conch messages (CIP-20 / label 674) found in the scanned transactions.</p>
          )}

          {hasLoaded && hasMore && !loading && (
            <Button onClick={handleLoadMore} disabled={loadingMore || (!apiKey && !localApiKey.trim())}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}

          <div style={{ width: '100%', marginTop: '2rem', textAlign: 'center' }}>
            <a
              href="https://projects.williamdoyle.ca"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc', textDecoration: 'underline' }}
            >
              Other work projects
            </a>
          </div>

          <ConchHistorySettingsModal
            open={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            cachedTxCount={cachedTxCount}
            onClearCache={() => void handleClearCache()}
            clearDisabled={cachedTxCount === 0 || loading || loadingMore}
          />
        </div>
      </div>
    </div>
  );
};

export default AssetCip20Messages;
