import React from 'react';
import ConnectWallet from '../components/ConnectWallet';
import { useAppSelector } from '../store/hooks';
import ClearTextCommit from '../components/ClearTextCommit';

const Commit = () => {
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const walletAddress = useAppSelector((state) => state.wallet.address);

  if (!isWalletConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="mb-4 text-lg">Connect With A Cardano Wallet To Continue</div>
        <ConnectWallet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 gap-4">
      <h1 className="text-3xl font-bold">Commitment Tools</h1>
      <code>Address: {walletAddress}</code>
      <ClearTextCommit />
    </div>
  );
};

export default Commit;
