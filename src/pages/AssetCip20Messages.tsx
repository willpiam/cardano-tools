import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import './AssetCip20Messages.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';
import { getAssetCip20History, type Cip20MessageRow } from '../utils/cip20AssetHistory';
import { assetFingerprintFromUnitHex } from '../utils/cip14AssetFingerprint';

const DEFAULT_TX_LIMIT = 40;
const MAX_TX_LIMIT = 500;

function parseTxLimit(raw: string | null): number {
  if (!raw) return DEFAULT_TX_LIMIT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TX_LIMIT;
  return Math.min(n, MAX_TX_LIMIT);
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

const AssetCip20Messages = () => {
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [localAssetId, setLocalAssetId] = useState('');
  const [localTxLimit, setLocalTxLimit] = useState(String(DEFAULT_TX_LIMIT));
  const [rows, setRows] = useState<Cip20MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

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
    const txLimit = urlParams.get('txLimit');
    if (txLimit) setLocalTxLimit(txLimit);
  }, [dispatch]);

  useEffect(() => {
    if (apiKey) setLocalApiKey(apiKey);
  }, [apiKey]);

  const syncUrlParams = (key: string, assetId: string, txLimit: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('blockfrostApiKey', key);
    url.searchParams.set('assetId', assetId);
    url.searchParams.set('txLimit', String(txLimit));
    window.history.replaceState({}, '', url.toString());
  };

  const handleApplySettings = () => {
    const key = localApiKey.trim() || (apiKey ?? '').trim();
    if (!key) return;

    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: key }));
    setLocalApiKey(key);

    const assetTrim = localAssetId.trim();
    const limit = parseTxLimit(localTxLimit.trim());

    syncUrlParams(key, assetTrim, limit);
  };

  const handleLoadHistory = async () => {
    const key = (apiKey || '').trim() || localApiKey.trim();
    const assetTrim = localAssetId.trim();
    if (!key || !assetTrim) {
      setError('A Blockfrost API key and asset id are required.');
      return;
    }

    const limit = parseTxLimit(localTxLimit.trim());
    setLoading(true);
    setError(null);
    setRows([]);

    try {
      const data = await getAssetCip20History(assetTrim, key, limit);
      setRows(data);
      setHasLoaded(true);
    } catch (err) {
      console.error('Conch protocol history', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
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
            asset. This page scans that asset’s transaction history via Blockfrost and lists those messages in time order. Paste the asset’s full hex{' '}
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
              Transaction limit (max {MAX_TX_LIMIT})
            </label>
            <input
              type="number"
              min={1}
              max={MAX_TX_LIMIT}
              value={localTxLimit}
              onChange={(e) => setLocalTxLimit(e.target.value)}
              style={{
                width: '8rem',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginBottom: '0.75rem',
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button onClick={handleApplySettings} disabled={!localApiKey.trim() && !apiKey}>
                Apply settings (save to URL)
              </Button>
              <Button
                onClick={handleLoadHistory}
                disabled={(!apiKey && !localApiKey.trim()) || !localAssetId.trim() || loading}
              >
                Load history
              </Button>
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
        </div>
      </div>
    </div>
  );
};

export default AssetCip20Messages;
