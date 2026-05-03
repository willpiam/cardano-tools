import { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setIsWalletConnected } from '../store/isWalletConnectedSlice';
import { resetEthWallet, setEthAddress, setEthChainId, setEthWallet } from '../store/ethWalletSlice';
import { connectEthWallet, discoverEthereumProviders, DiscoveredEthereumProvider, ETHEREUM_MAINNET_CHAIN_ID } from '../functions/ethereum';

const providerKey = (provider: DiscoveredEthereumProvider): string => {
  return provider.info.rdns || provider.info.uuid || provider.info.name;
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const EthereumConnectWallet = () => {
  const dispatch = useAppDispatch();
  const { selectedWalletName, providerRdns, address, chainId } = useAppSelector((state) => state.ethWallet);
  const isWalletConnected = useAppSelector((state) => state.walletConnected.isWalletConnected);
  const [providers, setProviders] = useState<DiscoveredEthereumProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      setLoading(true);
      setError(null);
      try {
        const discovered = await discoverEthereumProviders();
        if (!cancelled) {
          setProviders(discovered);
          if (discovered.length === 0) {
            setError('No Ethereum wallet found. Please install MetaMask, Rabby, or another Ethereum wallet.');
          }
        }
      } catch (err) {
        console.error('Failed to discover Ethereum wallets', err);
        if (!cancelled) setError('Failed to discover Ethereum wallets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvider = useMemo(() => {
    if (!providerRdns) return null;
    return providers.find(provider => providerKey(provider) === providerRdns) ?? null;
  }, [providerRdns, providers]);

  useEffect(() => {
    if (!selectedProvider) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      const nextAddress = accounts?.[0] ?? null;
      if (!nextAddress) {
        dispatch(resetEthWallet());
        dispatch(setIsWalletConnected(false));
        return;
      }
      dispatch(setEthAddress(nextAddress));
    };

    const handleChainChanged = (...args: unknown[]) => {
      const nextChainId = typeof args[0] === 'string' ? args[0].toLowerCase() : null;
      dispatch(setEthChainId(nextChainId));
    };

    selectedProvider.provider.on?.('accountsChanged', handleAccountsChanged);
    selectedProvider.provider.on?.('chainChanged', handleChainChanged);

    return () => {
      selectedProvider.provider.removeListener?.('accountsChanged', handleAccountsChanged);
      selectedProvider.provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [dispatch, selectedProvider]);

  const handleConnect = async (provider: DiscoveredEthereumProvider) => {
    const key = providerKey(provider);
    setConnecting(key);
    setError(null);
    try {
      const connected = await connectEthWallet(key);
      dispatch(setEthWallet({
        selectedWalletName: provider.info.name,
        providerRdns: key,
        address: connected.address,
        chainId: connected.chainId,
      }));
      dispatch(setIsWalletConnected(true));
    } catch (err) {
      console.error('Failed to connect Ethereum wallet', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Ethereum wallet.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = () => {
    dispatch(resetEthWallet());
    dispatch(setIsWalletConnected(false));
  };

  if (isWalletConnected && address) {
    return (
      <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
        <Button onClick={handleDisconnect}>Ethereum Wallet Connected</Button>
        <div className="text-sm">
          Connected to {selectedWalletName || 'Ethereum wallet'}: <span className="font-mono">{truncateAddress(address)}</span>
        </div>
        {chainId !== ETHEREUM_MAINNET_CHAIN_ID && (
          <div className="text-sm text-yellow-700">
            This tool submits Ethereum commitments on mainnet. Your wallet will be asked to switch networks before submitting.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Available Ethereum Wallets</h3>
        <p className="text-sm">
          Ethereum commitments are submitted on mainnet and require ETH for gas.
        </p>
      </div>

      {loading && <p>Loading Ethereum wallets...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && providers.length > 0 && (
        <div className="wallet-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          {providers.map((provider) => {
            const key = providerKey(provider);
            return (
              <button
                key={key}
                onClick={() => handleConnect(provider)}
                className="wallet-select-button"
                disabled={connecting !== null}
              >
                {connecting === key ? 'Connecting...' : provider.info.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EthereumConnectWallet;
