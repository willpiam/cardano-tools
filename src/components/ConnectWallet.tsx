import { CheckCircle2, Wallet } from 'lucide-react';
import { setShowWalletSelect } from '../store/modalSlice';
import { Button } from './ui/button';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Dialog, DialogContent } from './ui/dialog';
import { Card } from './ui/card';
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
      const wallet = (window as any).cardano[walletName];
      const api = await wallet.enable();

      // Initialize Lucid
      const _lucid = await Lucid(new Emulator([]), 'Preview');

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
            className="bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30 transition-colors font-medium w-full"
            onClick={disconnectWallet}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Wallet Connected
          </Button>
        ) : (
          <div>
            <Button
              className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium"
              onClick={() => {
                dispatch(setShowWalletSelect(true));
                setIsConnectDialogOpen(true);
              }}
            >
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button>
            <Dialog
              open={isConnectDialogOpen}
              onOpenChange={setIsConnectDialogOpen}
            >
              <DialogContent className="max-w-[300px] max-h-[550px] overflow-y-auto md:max-w-[59rem] rounded-lg border-2 border-[#ffa722] ">
                {!selectedWallet && showWalletSelect && (
                  <div className="w-full p-5 rounded-lg bg-[#1a1103]">
                    <h3 className="font-semibold text-lg text-center md:text-left">
                      Available Wallets
                    </h3>
                    <div className="md:animated-text pb-2">
                      <p>
                        Welcome to Turn Network, please connect your wallet to
                        get started and begin protecting your financial data.
                      </p>
                    </div>
                    {walletSelectList.length === 0 ? (
                      <p>No wallets found. Please install a Cardano wallet.</p>
                    ) : (
                      <div className="wallet-list">
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
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectWallet;
