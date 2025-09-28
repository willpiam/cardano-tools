import React from 'react';
import ConnectWallet from '../components/ConnectWallet';
import { useAppSelector } from '../store/hooks';
import ClearTextCommit from '../components/ClearTextCommit';
import HashCommit from '../components/HashCommit';
import AESEncryptedCommit from '../components/AESEncryptedCommit';
import DecryptAES from '../components/DecryptAES';
import VerifyHash from '../components/VerifyHash';
import FileHashViewer from '../components/FileHashViewer';
import FileHashCommit from '../components/FileHashCommit';

const Commit = () => {
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const walletAddress = useAppSelector((state) => state.wallet.address);

  // if (!isWalletConnected) {
  //   return (
  //     <div className="min-h-screen flex flex-col items-center justify-center">
  //       <div className="mb-4 text-lg">Connect With A Cardano Wallet To Continue</div>
  //       <ConnectWallet />
  //     </div>
  //   );
  // }

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-10 gap-4">
        {
          !isWalletConnected && (
            <>
              <div className="mb-4 text-lg">Connect With A Cardano Wallet To Continue</div>
              <ConnectWallet />
            </>
          )
        }
        {
          isWalletConnected && (
            <>
              <h1 className="text-3xl font-bold">Commitment Tools</h1>
              <code>Address: {walletAddress}</code>
              <ClearTextCommit />
              <HashCommit />
              <AESEncryptedCommit />
              <FileHashCommit />
            </>
          )
        }
        <div className="off-chain-tools">
          <h2>
            Off-chain tools
          </h2>
          <DecryptAES />
          <VerifyHash />
          <FileHashViewer />
        </div>
      </div>
    </>
  );
};

export default Commit;
