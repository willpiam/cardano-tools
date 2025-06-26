import { useState, useEffect } from 'react';
import { Menu, X, } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useIsMobile } from '../hooks/use-mobile';
import {
  Dialog,
  DialogContent,
} from '../components/ui/dialog';
import { Card } from './Card';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Emulator, Lucid } from '@lucid-evolution/lucid';
import {
  setAddress,
  setBalance,
  setLucid,
  setSelectedWallet,
} from '../store/walletSlice';
import {
  setPreviewAddress,
  setPreviewWallet,
  setWalletBalance,
  setWalletSelectList,
} from '../store/networkSlice';
import { clearWalletError, setWalletError } from '../store/errorSlice';
import NavWalletDropDown from './NavWalletDropDown';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const selectedWallet = useAppSelector((state) => state.wallet.selectedWallet);
  const { activeView, showWalletSelect } = useAppSelector(
    (state) => state.modal
  );
  const dispatch = useAppDispatch();
  const walletSelectList = useAppSelector(
    (state) => state.network.walletSelectList
  );
  const isMobile = useIsMobile();

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
  useEffect(() => {
    if (typeof (window as any).cardano === 'undefined') {
      dispatch(setWalletError('No Cardano wallet found'));
      return;
    }

    const labels = Object.keys((window as any).cardano);
    dispatch(setWalletSelectList(labels));
    dispatch(clearWalletError());
  }, [dispatch]);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300 ${
        isScrolled || isMenuOpen
          ? 'bg-background/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <NavWalletDropDown />
        </nav>

        {/* Mobile Navigation Toggle */}
        <div className="md:hidden flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobile && isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md shadow-md animate-fade-in">
          <div className="container mx-auto px-4 py-6 flex flex-col space-y-4">
            <NavWalletDropDown />
          </div>
        </div>
      )}

      {/* Wallet Connect Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-[59rem]">
          {!selectedWallet && showWalletSelect && (
            <Card className="w-full p-2 rounded-lg">
              <h3>Available Wallets</h3>
              {walletSelectList.length === 0 ? (
                <p>No wallets found. Please install a Cardano wallet.</p>
              ) : (
                <div className="wallet-list">
                  {walletSelectList.map((wallet, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleWalletSelect(wallet);
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
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Navbar;
