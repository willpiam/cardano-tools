// import { CheckCircle2, Wallet } from 'lucide-react';
import { setShowWalletSelect } from '../store/modalSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useEffect, useState } from 'react';
import {
  setPreviewAddress,
  setPreviewWallet,
  setWalletBalance,
  setWalletSelectList,
} from '../store/networkSlice';
import {
  setAddress,
  setBalance,
  setLucid,
  setSelectedWallet,
} from '../store/walletSlice';
import { clearWalletError, setWalletError } from '../store/errorSlice';
import { Emulator, Lucid } from '@lucid-evolution/lucid';
import { setIsWalletConnected } from '../store/isWalletConnectedSlice';
import { Button } from './Button';
import { Blockfrost, Koios } from '@lucid-evolution/provider';
import { setUseBlockfrost, setApiKey, setBlockfrostConfig } from '../store/blockfrostSlice';

function ConnectWallet() {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const dispatch = useAppDispatch();
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const selectedWallet = useAppSelector((state) => state.wallet.selectedWallet);
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const { activeView, showWalletSelect } = useAppSelector(
    (state) => state.modal
  );
  const walletSelectList = useAppSelector(
    (state) => state.network.walletSelectList
  );
  const { useBlockfrost, apiKey } = useAppSelector((state) => state.blockfrost);

  // Initialize Blockfrost config from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockfrostApiKey = urlParams.get('blockfrostApiKey');
    
    if (blockfrostApiKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: blockfrostApiKey }));
    }
  }, [dispatch]);

  // Update URL when Blockfrost config changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (useBlockfrost && apiKey) {
      url.searchParams.set('blockfrostApiKey', apiKey);
    } else {
      url.searchParams.delete('blockfrostApiKey');
    }
    window.history.replaceState({}, '', url.toString());
  }, [useBlockfrost, apiKey]);

  useEffect(() => {
    if (typeof (window as any).cardano === 'undefined') {
      dispatch(setWalletError('No Cardano wallet found'));
      return;
    }

    const labels = Object.keys((window as any).cardano);
    dispatch(setWalletSelectList(labels));
    dispatch(clearWalletError());
  }, [dispatch]);

  const handleWalletSelect = async (walletName: string) => {
    try {
      console.log(`inside handleWalletSelect`);
      const wallet = (window as any).cardano[walletName];
      const api = await wallet.enable();
      console.log(`Keys in api`, Object.keys(api));
      console.log(`keys in api.experimental`, Object.keys(api.experimental));

      // Initialize Lucid with Blockfrost or Emulator
      let _lucid;
      console.log(`useBlockfrost`, useBlockfrost);
      console.log(`apiKey`, apiKey);
      if (useBlockfrost && apiKey) {
        // Use Blockfrost provider
        const blockfrostProvider = new Blockfrost('https://cardano-mainnet.blockfrost.io/api/v0', apiKey);
        _lucid = await Lucid(blockfrostProvider, 'Mainnet');
        console.log('Using Blockfrost provider');
      } else {
        // Use Emulator provider
        const emulator = new Emulator([]);
        console.log(`emulator`, emulator);
        _lucid = await Lucid(emulator, 'Mainnet');
        console.log('Using Emulator provider');
      }

      _lucid.selectWallet.fromAPI(api);
      dispatch(setLucid(_lucid));
      const address = await _lucid.wallet().address();

      // Get wallet balance
      const utxos = await _lucid.wallet().getUtxos();
      const walletBalance = utxos.reduce(
        (acc, utxo) => acc + utxo.assets.lovelace,
        BigInt(0)
      );

      dispatch(setPreviewWallet(walletName));
      dispatch(setPreviewAddress(address));
      dispatch(setWalletBalance({ lovelace: walletBalance }));
      dispatch(setSelectedWallet(walletName));
      dispatch(setAddress(address));
      dispatch(setBalance(walletBalance));
      setIsConnectDialogOpen(false);
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      dispatch(setWalletError('Failed to connect to wallet'));
    }
  };

  const disconnectWallet = () => {
    dispatch(setShowWalletSelect(true));
    dispatch(setPreviewWallet(''));
    dispatch(setPreviewAddress(''));
    dispatch(setWalletBalance({ lovelace: BigInt(0) }));
    dispatch(setSelectedWallet(''));
    dispatch(setAddress(''));
    dispatch(setBalance(BigInt(0)));
    dispatch(setIsWalletConnected(false));
  };

  return (
    <div>
      <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
        {isWalletConnected && walletAddress ? (
          <Button
            onClick={disconnectWallet}
          >
            Wallet Connected
          </Button>
        ) : (
          <div>
            <Button
              onClick={() => {
                dispatch(setShowWalletSelect(true));
                setIsConnectDialogOpen(true);
              }}
            >
               Connect Wallet
            </Button>
            {isConnectDialogOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                onClick={() => setIsConnectDialogOpen(false)}
              >
                <div
                  className="max-w-[300px] max-h-[550px] overflow-y-auto md:max-w-[59rem] rounded-lg border-2 border-[#ffa722]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Blockfrost Configuration */}
                  <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="useBlockfrost"
                        checked={useBlockfrost}
                        onChange={(e) => {
                          dispatch(setUseBlockfrost(e.target.checked));
                          if (!e.target.checked) {
                            dispatch(setApiKey(null));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="useBlockfrost" className="text-sm font-medium">
                        Use Blockfrost API Key
                      </label>
                    </div>
                    {useBlockfrost && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Enter your Blockfrost API key"
                          value={apiKey || ''}
                          onChange={(e) => dispatch(setApiKey(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          style={{width: '100%'}}
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Get your API key from <a href="https://blockfrost.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">blockfrost.io</a>
                        </p>
                        {apiKey && apiKey.trim() && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800" style={{maxWidth: '400px'}}>
                            ⚠️ <strong>Security Notice:</strong> Your API key will be stored in the URL. Be careful when screensharing or sharing URLs.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!selectedWallet && showWalletSelect && (
                    <div className="w-full p-5 rounded-lg bg-[#1a1103]">
                      <h3 className="font-semibold text-lg text-center md:text-left">
                        Available Wallets
                      </h3>
                      {walletSelectList.length === 0 ? (
                        <p>No wallets found. Please install a Cardano wallet.</p>
                      ) : (
                        <div className="wallet-list" style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                          <div>
                            There are {walletSelectList.length} wallets available.
                          </div>
                          {walletSelectList.map((wallet, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                handleWalletSelect(wallet);
                                dispatch(setIsWalletConnected(true));
                              }}
                              className={`wallet-select-button ${
                                selectedWallet === wallet ? 'selected' : ''
                              }`}
                            >
                              {wallet}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectWallet;
