import React, { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import ConnectWallet from '../components/ConnectWallet';
import { useAppSelector } from '../store/hooks';
import { williamDetails } from '../williamDetails';
import {
  buildAndSubmitDonation,
  fetchTreasuryContext,
  type TreasuryContext,
} from '../functions/treasuryDonation';

const LOVELACE_PER_ADA = BigInt(1000000);

const adaToLovelace = (ada: number): bigint => {
  if (!Number.isFinite(ada) || ada <= 0) return BigInt(0);
  const [whole, frac = ''] = ada.toString().split('.');
  const truncatedFrac = (frac + '000000').slice(0, 6);
  return BigInt(whole) * LOVELACE_PER_ADA + BigInt(truncatedFrac || '0');
};

const formatLovelaceAsAda = (lovelace: bigint): string => {
  const negative = lovelace < BigInt(0);
  const abs = negative ? -lovelace : lovelace;
  const whole = abs / LOVELACE_PER_ADA;
  const remainder = abs % LOVELACE_PER_ADA;
  const fracStr = remainder.toString().padStart(6, '0').replace(/0+$/, '');
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${wholeStr}${fracStr ? '.' + fracStr : ''} ADA`;
};

const TreasuryDonation: React.FC = () => {
  const walletName = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected,
  );
  const { useBlockfrost, apiKey } = useAppSelector((state) => state.blockfrost);

  const [donationAda, setDonationAda] = useState<number>(5);

  const [includeNote, setIncludeNote] = useState<boolean>(true);
  const [noteText, setNoteText] = useState<string>(
    "donating to the Cardano treasury — using $computerman's donation tool",
  );

  const [includeTip, setIncludeTip] = useState<boolean>(false);
  const [tipAda, setTipAda] = useState<number>(1);

  const [context, setContext] = useState<TreasuryContext | null>(null);
  const [contextLoading, setContextLoading] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);

  const blockfrostReady = Boolean(useBlockfrost && apiKey);
  const canSubmit =
    isWalletConnected &&
    walletName &&
    walletAddress &&
    blockfrostReady &&
    donationAda > 0 &&
    !isSubmitting;

  const refreshContext = async (silent: boolean = false) => {
    if (!blockfrostReady || !apiKey) return;
    if (!silent) setContextLoading(true);
    setContextError(null);
    try {
      const ctx = await fetchTreasuryContext(apiKey);
      setContext(ctx);
    } catch (err: any) {
      console.error('Failed to fetch treasury context', err);
      setContextError(err?.message || 'Failed to fetch treasury context');
    } finally {
      if (!silent) setContextLoading(false);
    }
  };

  useEffect(() => {
    if (!blockfrostReady) {
      setContext(null);
      return;
    }
    refreshContext(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockfrostReady, apiKey]);

  const handleDonate = async () => {
    if (!walletName) {
      setSubmitError('No wallet selected.');
      return;
    }
    if (!walletAddress) {
      setSubmitError('Wallet address not available.');
      return;
    }
    if (!apiKey) {
      setSubmitError('Blockfrost API key is required for treasury donations.');
      return;
    }
    if (donationAda <= 0) {
      setSubmitError('Donation amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmittedTxHash(null);

    try {
      // Always fetch a fresh treasury value right before building, so the
      // current_treasury_value field matches the live network state.
      const ctx = await fetchTreasuryContext(apiKey);
      setContext(ctx);

      const wallet = (window as any).cardano?.[walletName];
      if (!wallet) {
        throw new Error(`Wallet ${walletName} is no longer available`);
      }
      const api = await wallet.enable();

      const donationLovelace = adaToLovelace(donationAda);
      const tipLovelace = includeTip ? adaToLovelace(tipAda) : BigInt(0);

      const metadata: string[] | undefined =
        includeNote && noteText.trim().length > 0
          ? [noteText.trim(), `treasury donation: ${donationAda} ADA`]
          : undefined;

      const result = await buildAndSubmitDonation({
        api,
        donationLovelace,
        currentTreasuryLovelace: ctx.currentTreasuryLovelace,
        params: ctx.params,
        changeAddressBech32: walletAddress,
        metadata,
        tip:
          includeTip && tipLovelace > BigInt(0)
            ? { addressBech32: williamDetails.paymentAddress, lovelace: tipLovelace }
            : undefined,
      });

      setSubmittedTxHash(result.txHash);
    } catch (err: any) {
      console.error('Failed to submit treasury donation', err);
      const message =
        err?.info?.message ||
        err?.message ||
        (typeof err === 'string' ? err : 'Failed to submit treasury donation');
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContextPanel = () => {
    if (!blockfrostReady) {
      return (
        <div
          style={{
            border: '1px solid #d97706',
            backgroundColor: '#3a2a05',
            color: '#fde68a',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          <strong>Blockfrost is required.</strong>
          <p style={{ margin: '0.5rem 0 0' }}>
            Treasury donations need the current treasury value, which can only be fetched from a
            full provider. Open the wallet connect dialog and enable <em>Use Blockfrost API Key</em>,
            then enter your project id from{' '}
            <a
              href="https://blockfrost.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#93c5fd' }}
            >
              blockfrost.io
            </a>
            .
          </p>
        </div>
      );
    }
    return (
      <div
        style={{
          border: '1px solid #4b5563',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#0f172a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Current treasury value</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              {contextLoading && !context
                ? 'Loading…'
                : context
                ? formatLovelaceAsAda(context.currentTreasuryLovelace)
                : contextError
                ? '—'
                : '—'}
            </div>
            {context && (
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {context.currentTreasuryLovelace.toString()} lovelace
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <Button onClick={() => refreshContext(false)}>
              {contextLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
        {contextError && (
          <div style={{ color: '#fca5a5', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            {contextError}
          </div>
        )}
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.75rem' }}>
          The ledger verifies <code>current_treasury_value</code> at submission time. We refetch it
          automatically just before signing, but if the treasury moves between then and inclusion
          the wallet may reject the transaction. If that happens, click <em>Donate</em> again.
        </p>
      </div>
    );
  };

  const renderForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div
        style={{
          border: '1px solid #4b5563',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#1a1103',
        }}
      >
        <label htmlFor="donationAda" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Donation amount (ADA)
        </label>
        <input
          id="donationAda"
          type="number"
          min="0"
          step="0.000001"
          value={donationAda}
          onChange={(e) => setDonationAda(parseFloat(e.target.value) || 0)}
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #4b5563',
            backgroundColor: '#0f172a',
            color: '#e5e7eb',
          }}
        />
        <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.4rem' }}>
          = {adaToLovelace(donationAda).toString()} lovelace
        </div>
      </div>

      <div
        style={{
          border: '1px solid #4b5563',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#1a1103',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={includeNote}
            onChange={() => setIncludeNote(!includeNote)}
          />
          <span>Attach CIP-20 metadata note (label 674)</span>
        </label>
        {includeNote && (
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #4b5563',
              backgroundColor: '#0f172a',
              color: '#e5e7eb',
            }}
          />
        )}
      </div>

      <div
        style={{
          border: '1px solid #4b5563',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#1a1103',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={includeTip} onChange={() => setIncludeTip(!includeTip)} />
          <span>Tip $computerman (helps fund continued work on this tool)</span>
        </label>
        {includeTip && (
          <div style={{ marginTop: '0.5rem' }}>
            <label htmlFor="tipAda" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Tip amount (ADA)
            </label>
            <input
              id="tipAda"
              type="number"
              min="0"
              step="0.000001"
              value={tipAda}
              onChange={(e) => setTipAda(parseFloat(e.target.value) || 0)}
              style={{
                width: '160px',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #4b5563',
                backgroundColor: '#0f172a',
                color: '#e5e7eb',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderSubmit = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Button onClick={handleDonate} disabled={!canSubmit}>
        {isSubmitting ? 'Submitting…' : `Donate ${donationAda || 0} ADA to the treasury`}
      </Button>
      {!blockfrostReady && (
        <div style={{ color: '#fde68a', fontSize: '0.85rem' }}>
          Enable Blockfrost in the wallet connect dialog above to unlock submission.
        </div>
      )}
      {submitError && (
        <div style={{ color: '#fca5a5', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
          {submitError}
        </div>
      )}
      {submittedTxHash && (
        <div
          style={{
            border: '1px solid #16a34a',
            backgroundColor: '#062e1a',
            color: '#bbf7d0',
            padding: '0.75rem',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Submitted!</div>
          <div style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>{submittedTxHash}</div>
          <a
            href={`https://cardanoscan.io/transaction/${submittedTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#93c5fd' }}
          >
            View on Cardanoscan →
          </a>
        </div>
      )}
    </div>
  );

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
            maxWidth: '800px',
          }}
        >
          <h1>Donate to the Cardano Treasury</h1>
          <p style={{ color: '#d1d5db' }}>
            Send ADA directly to the on-chain treasury. This page builds the donation transaction
            with the <strong>Cardano Multiplatform Library (CML)</strong> — not lucid-evolution —
            because the <code>donation</code> and <code>current_treasury_value</code> fields aren't
            exposed by lucid's high-level builder.
          </p>

          {!isWalletConnected && (
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: '0.5rem', color: '#d1d5db' }}>
                Connect a Cardano wallet to begin.
              </div>
              <ConnectWallet />
            </div>
          )}

          {isWalletConnected && (
            <>
              <div style={{ width: '100%' }}>
                <ConnectWallet />
              </div>
              <code style={{ wordBreak: 'break-all' }}>Address: {walletAddress}</code>

              {renderContextPanel()}
              {renderForm()}
              {renderSubmit()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreasuryDonation;
