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
        <div className="title-container">
          <div className="title">
            Written in Stone
          </div>
          <div className="subtext">
            a commitment tool from the $computerman 
          </div>
        </div>
        <div className="description">
          <p>
            This is a free tool that lets anyone anchor their words, 
            files, or proofs directly on the Cardano blockchain. You 
            can record plain text, commit a hash, encrypt a secret, 
            or timestamp a file. Each action creates a receipt with 
            a Cardanoscan link and other relevant details. The tool 
            is free to use, and if you'd like, you can include an 
            optional tip to support ongoing development of this tool 
            and my other activities within the Cardano ecosystem.
            <br/>
            Write something down <strong>forever</strong>. 
          </p>
        </div>
        {
          !isWalletConnected && (
            <div className="connect-to-wallet-container">
              <div >
                <h2>
                  Connect With A Cardano Wallet To Continue
                </h2>
                <p>
                  You will need a Cardano wallet to use this tool. Lace and Eternl are two great options. You will also need a small amount of ADA to cover transaction fees.
                  Ada can be purchased from most exchanges such as Coinbase, Binance, Kraken, etc.
                </p>
              </div>
              <ConnectWallet />
            </div>
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
              <UnifiedCommit />
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
      {/* <footer> */}
      <div className="bottom-area">
        {/* link to https://github.com/willpiam/cardano-tools */}
        <div className="bottom-area-item">
          <a href="https://github.com/willpiam/cardano-tools" target="_blank" rel="noopener noreferrer">
            Source Code
          </a>
        </div>
        <div className="bottom-area-item">
          <a href="https://projects.williamdoyle.ca" target="_blank" rel="noopener noreferrer">
            My Other Projects
          </a>
        </div>
      </div>
    </>
  );
};

export default Commit;
