import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import ConnectWallet from './ConnectWallet';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Button } from './ui/button';
import { CheckCircle2, Copy, CopyCheck } from 'lucide-react';
import { setShowWalletSelect } from '../store/modalSlice';
import {
  setPreviewAddress,
  setPreviewWallet,
  setWalletBalance,
} from '../store/networkSlice';
import {
  setAddress,
  setBalance,
  setSelectedWallet,
} from '../store/walletSlice';
import { setIsWalletConnected } from '../store/isWalletConnectedSlice';
import { useState } from 'react';

const NavWalletDropDown = () => {
  const dispatch = useAppDispatch();
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const balance = useAppSelector((state) => state.wallet.balance);
  const queue = useAppSelector((state) => state.queue.participants);
  const [copied, setCopied] = useState(false);
  const handleCopyToClipboard = () => {
    setCopied(true);
    navigator.clipboard.writeText(walletAddress || '');
    setTimeout(() => setCopied(false), 3000);
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

  let displayAddress = '';
  if (walletAddress) {
    if (walletAddress.length <= 11) {
      displayAddress = walletAddress;
    } else {
      const first7 = walletAddress.substring(0, 7);
      const last4 = walletAddress.substring(walletAddress.length - 4);
      displayAddress = `${first7}.....${last4}`;
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {!walletAddress ? (
          <ConnectWallet />
        ) : (
          <Button className="bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30 transition-colors font-medium w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Wallet Connected
          </Button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="min-w-[220px] md:min-w-[320px] mt-2 bg-[#1a1103] border-2 border-[#ffa722] rounded-md shadow-lg p-2 z-[999]">
          {/* Address Row */}
          <div className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md font-medium text-foreground/80 hover:text-primary transition-colors text-sm md:text-base">
            Address:
            <span className="mr-1 font-mono">{displayAddress}</span>
            <span
              className="cursor-pointer select-none"
              onClick={handleCopyToClipboard}
            >
              {copied ? <CopyCheck /> : <Copy />}
            </span>
          </div>

          {/* Balance Row */}
          <div className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md font-medium text-foreground/80 hover:text-primary transition-colors font-sans text-sm md:text-base">
            Balance: {balance || 0} ADA
          </div>

          {/* Queue Row */}
          <div className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md font-medium text-foreground/80 hover:text-primary transition-colors text-sm md:text-base">
            Queue:{' '}
            <span className="font-sans">{queue.length || 0} in Queue</span>
          </div>

          {/* Separator */}
          <DropdownMenu.Separator className="h-[1px] bg-gray-200 my-1" />

          {/* Disconnect Button */}
          <DropdownMenu.Item
            onClick={disconnectWallet}
            className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md text-foreground/80 hover:text-primary font-semibold transition-colors text-red-500 hover:text-red-700 text-sm md:text-base"
          >
            Disconnect Wallet
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default NavWalletDropDown;
