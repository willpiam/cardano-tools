import React from 'react';
import ConnectWallet from '../components/ConnectWallet';
import { useAppSelector } from '../store/hooks';
import DecryptAES from '../components/DecryptAES';
import VerifyHash from '../components/VerifyHash';
import FileHashViewer from '../components/FileHashViewer';
import UnifiedCommit from '../components/UnifiedCommit';
import { AddressDisplay } from '../components/AddressDisplay';
import '../simple.css';

const Commit = () => {
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const walletAddress = useAppSelector((state) => state.wallet.address);

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-10 gap-4">
        <h1 className="text-3xl font-bold">
          Commitment Tools
        </h1>
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
              <div className="connection-info">
                <h3>
                  Connected to
                </h3>
                <AddressDisplay
                  address={walletAddress || ''}
                  width={256}
                  style={{
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                />
              </div>
              {/* <ClearTextCommit />
              <HashCommit />
              <AESEncryptedCommit />
              <FileHashCommit /> */}
              <UnifiedCommit />
              {/* <TokenList /> */}
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
