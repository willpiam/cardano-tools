import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Menu, X, Wallet, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import Logo from '../components/Logo';
import { useIsMobile } from '../hooks/use-mobile';
import { useToast } from '../hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { setShowWalletSelect } from '../store/modalSlice';
import ConnectWallet from './ConnectWallet';
import NavWalletDropDown from './NavWalletDropDown';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const selectedWallet = useAppSelector((state) => state.wallet.selectedWallet);
  const { activeView, showWalletSelect } = useAppSelector(
    (state) => state.modal
  );
  const dispatch = useAppDispatch();
  const walletSelectList = useAppSelector(
    (state) => state.network.walletSelectList
  );
  const { toast } = useToast();
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

  // const connectWallet = (walletType: string) => {
  //   // In a real app, this would connect to the actual wallet
  //   // For now, we'll just simulate with a timeout
  //   toast({
  //     title: 'Connecting to wallet...',
  //     description: `Connecting to ${walletType}...`,
  //   });

  //   setTimeout(() => {
  //     setIsWalletConnected(true);
  //     setIsConnectDialogOpen(false);
  //     toast({
  //       title: 'Wallet connected',
  //       description: 'Successfully connected to your wallet',
  //     });
  //   }, 1500);
  // };

  // const disconnectWallet = () => {
  //   // In a real app, this would disconnect from the wallet
  //   setIsWalletConnected(false);
  //   toast({
  //     title: 'Wallet disconnected',
  //     description: 'Your wallet has been disconnected',
  //   });
  // };
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300 ${
        isScrolled || isMenuOpen
          ? 'bg-background/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <NavLinks />
          {/* {isWalletConnected ? (
            <Button
              className="bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30 transition-colors font-medium"
              onClick={disconnectWallet}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Wallet Connected
            </Button>
          ) : (
            <Button
              className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium"
              onClick={() => {
                setIsConnectDialogOpen(true);
                dispatch(setShowWalletSelect(true));
              }}
            >
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button>
          )} */}
          {/* <ConnectWallet /> */}
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
            <NavLinks mobile={true} />
            {/* {isWalletConnected ? (
              <Button
                className="bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30 transition-colors font-medium w-full"
                onClick={disconnectWallet}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Wallet Connected
              </Button>
            ) : (
              <Button
                className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium w-full"
                onClick={() => {
                  setIsConnectDialogOpen(true);
                  dispatch(setShowWalletSelect(true));
                }}
              >
                <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
              </Button>
            )} */}
            {/* <ConnectWallet /> */}
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
              <div className="animated-text pb-2">
                <p>
                  Welcome to Turn Network, please connect your wallet to get
                  started and begin protecting your financial data.
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
                        // connectWallet(wallet);
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
          {/* <div className="grid gap-4 py-4">
            <WalletOption
              name="Eternl"
              icon="https://eternl.io/apple-touch-icon.png"
              onClick={() => connectWallet('Eternl')}
            />
            <WalletOption
              name="Nami"
              icon="https://namiwallet.io/favicon-32x32.png"
              onClick={() => connectWallet('Nami')}
            />
            <WalletOption
              name="Flint"
              icon="https://flint-wallet.com/favicon.ico"
              onClick={() => connectWallet('Flint')}
            />
            <WalletOption
              name="Yoroi"
              icon="https://yoroi-wallet.com/apple-touch-icon.png"
              onClick={() => connectWallet('Yoroi')}
            />
          </div> */}
        </DialogContent>
      </Dialog>
    </header>
  );
};

const NavLinks = ({ mobile = false }: { mobile?: boolean }) => {
  const baseClasses =
    'font-medium text-foreground/80 hover:text-primary transition-colors';
  const mobileClasses = 'py-2 block';

  return (
    <>
      <Link
        to="/"
        className={mobile ? `${baseClasses} ${mobileClasses}` : baseClasses}
      >
        Home
      </Link>
      <Link
        to="/mix"
        className={mobile ? `${baseClasses} ${mobileClasses}` : baseClasses}
      >
        Mix
      </Link>
      {/* <Link
        to="/pools"
        className={mobile ? `${baseClasses} ${mobileClasses}` : baseClasses}
      >
        Pools
      </Link> */}
      {/* <Link
        to="/docs"
        className={mobile ? `${baseClasses} ${mobileClasses}` : baseClasses}
      >
        Docs
      </Link> */}
    </>
  );
};

// const WalletOption = ({
//   name,
//   icon,
//   onClick,
// }: {
//   name: string;
//   icon: string;
//   onClick: () => void;
// }) => {
//   return (
//     <Button
//       variant="outline"
//       className="flex justify-start items-center w-full py-6 hover:bg-primary/5 hover:border-primary/30"
//       onClick={onClick}
//     >
//       <img
//         src={icon}
//         alt={name}
//         className="w-6 h-6 mr-3"
//         onError={(e) => {
//           (e.target as HTMLImageElement).src =
//             'https://via.placeholder.com/24?text=W';
//         }}
//       />
//       <span>{name}</span>
//     </Button>
//   );
// };

export default Navbar;
