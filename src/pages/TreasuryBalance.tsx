import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import { Button } from '../components/Button';
import { loadTreasuryBalanceData } from '../functions/treasuryBalanceLoad';
import type { TreasuryBalanceSnapshot } from '../functions/treasuryBalanceFetch';
import type { AdaUsdPrice } from '../utils/adaPrice';
import { formatAdaCompact, formatAdaExact } from '../utils/formatAda';
import { formatUsdCompact, formatUsdExact, lovelaceToUsd } from '../utils/formatUsd';
import {
  getBlockfrostApiKeyFromStorage,
  hasBlockfrostApiKeyInUrl,
  saveBlockfrostApiKeyToStorage,
} from '../utils/toolConfigStorage';

const TreasuryBalance = () => {
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [balance, setBalance] = useState<TreasuryBalanceSnapshot | null>(null);
  const [adaPrice, setAdaPrice] = useState<AdaUsdPrice | null>(null);
  const [balanceFromCache, setBalanceFromCache] = useState(false);
  const [priceFromCache, setPriceFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    hasDataRef.current = balance != null || adaPrice != null;
  }, [balance, adaPrice]);

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

  const loadData = useCallback(async (key: string, forceRefresh = false) => {
    if (forceRefresh || hasDataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    if (forceRefresh) {
      setBalanceError(null);
      setPriceError(null);
    }

    try {
      const result = await loadTreasuryBalanceData(key, { forceRefresh });
      setBalance(result.balance);
      setAdaPrice(result.adaPrice);
      setBalanceFromCache(result.balanceFromCache);
      setPriceFromCache(result.priceFromCache);
      setBalanceError(result.balanceError);
      setPriceError(result.priceError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    void loadData(apiKey, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const handleApplyKey = () => {
    const trimmed = localApiKey.trim();
    if (!trimmed) return;
    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: trimmed }));
    saveBlockfrostApiKeyToStorage(trimmed);
    const url = new URL(window.location.href);
    url.searchParams.set('blockfrostApiKey', trimmed);
    window.history.replaceState({}, '', url.toString());
  };

  const treasuryLovelaceNumber = balance ? Number(balance.treasuryLovelace) : null;
  const treasuryUsd =
    balance && adaPrice ? lovelaceToUsd(balance.treasuryLovelace, adaPrice.usd) : null;

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
          <h1>Cardano Treasury Balance</h1>
          <p style={{ margin: 0, color: '#d1d5db' }}>
            On-chain treasury balance on Cardano mainnet, shown in ADA and USD. Values are cached for
            24 hours and only refetched when stale or when you force a refresh.
          </p>

          {!apiKey && (
            <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                A Blockfrost API key is required to read the treasury balance. Get one from{' '}
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
                border: '1px solid #4b5563',
                borderRadius: '8px',
                padding: '1.5rem',
                width: '100%',
                backgroundColor: '#1a1103',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    Current treasury balance
                    {balanceFromCache && balance && (
                      <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>(cached)</span>
                    )}
                  </div>
                  {loading && !balance ? (
                    <div style={{ fontSize: '1.5rem', color: '#d1d5db' }}>Loading…</div>
                  ) : balanceError && !balance ? (
                    <div style={{ color: '#fca5a5' }}>{balanceError}</div>
                  ) : treasuryLovelaceNumber != null ? (
                    <>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399', lineHeight: 1.2 }}>
                        {formatAdaExact(treasuryLovelaceNumber)}
                      </div>
                      <div style={{ fontSize: '1.1rem', color: '#93c5fd', marginTop: '0.35rem' }}>
                        {formatAdaCompact(treasuryLovelaceNumber)}
                      </div>
                    </>
                  ) : null}
                </div>

                <Button onClick={() => loadData(apiKey, true)} disabled={loading || refreshing}>
                  {refreshing ? 'Refreshing…' : 'Force refresh'}
                </Button>
              </div>

              {treasuryUsd != null && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid #374151',
                  }}
                >
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    Approximate USD value
                    {priceFromCache && adaPrice && (
                      <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>(cached)</span>
                    )}
                    {adaPrice && (
                      <span style={{ marginLeft: '0.35rem' }}>
                        (@ ${adaPrice.usd.toLocaleString(undefined, { maximumFractionDigits: 4 })} / ADA)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#facc15' }}>
                    {formatUsdExact(treasuryUsd)}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#fde68a', marginTop: '0.25rem' }}>
                    {formatUsdCompact(treasuryUsd)}
                  </div>
                </div>
              )}

              {priceError && !adaPrice && (
                <div style={{ marginTop: '1rem', color: '#fca5a5', fontSize: '0.9rem' }}>
                  USD estimate unavailable: {priceError}
                </div>
              )}

              {balanceError && balance && (
                <div style={{ marginTop: '1rem', color: '#fcd34d', fontSize: '0.9rem' }}>
                  {balanceError}
                </div>
              )}

              {priceError && adaPrice && (
                <div style={{ marginTop: '1rem', color: '#fcd34d', fontSize: '0.9rem' }}>
                  {priceError}
                </div>
              )}

              {balance && (
                <div style={{ marginTop: '1rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                  Balance as of {balance.fetchedAt.toLocaleString()}
                  {adaPrice && ` · Price as of ${adaPrice.fetchedAt.toLocaleString()}`}
                  <div style={{ marginTop: '0.25rem' }}>
                    {balance.treasuryLovelace.toString()} lovelace
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '1rem',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ fontWeight: 600, color: '#93c5fd' }}>Related tools</div>
            <Link to="/donate-treasury" style={{ color: '#60a5fa' }}>
              Donate ADA to the treasury
            </Link>
            <Link to="/governance-actions" style={{ color: '#60a5fa' }}>
              Browse live governance actions (including treasury withdrawals)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryBalance;
