import React, { useState } from 'react';
import ConnectWallet from '../components/ConnectWallet';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import DecryptAES from '../components/DecryptAES';
import VerifyHash from '../components/VerifyHash';
import FileHashViewer from '../components/FileHashViewer';
import UnifiedCommit from '../components/UnifiedCommit';
import { AddressDisplay } from '../components/AddressDisplay';
import EthereumConnectWallet from '../components/EthereumConnectWallet';
import ChainPicker, { CommitChain } from '../components/ChainPicker';
import { setIsWalletConnected } from '../store/isWalletConnectedSlice';
import { resetWallet } from '../store/walletSlice';
import { resetEthWallet } from '../store/ethWalletSlice';
import '../simple.css';

const Commit = () => {
  const dispatch = useAppDispatch();
  const [chain, setChain] = useState<CommitChain>('cardano');
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const ethAddress = useAppSelector((state) => state.ethWallet.address);
  const isActiveWalletConnected = chain === 'cardano'
    ? isWalletConnected && Boolean(walletAddress)
    : isWalletConnected && Boolean(ethAddress);

  const handleChainChange = (nextChain: CommitChain) => {
    if (nextChain === chain) return;
    setChain(nextChain);
    dispatch(setIsWalletConnected(false));
    dispatch(resetWallet());
    dispatch(resetEthWallet());
  };

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
            files, or proofs directly on Cardano or Ethereum. You 
            can record plain text, commit a hash, encrypt a secret, 
            or timestamp a file. Each action creates a receipt with 
            an explorer link and other relevant details. The tool 
            is free to use, and if you'd like, you can include an 
            optional Cardano tip to support ongoing development of this tool 
            and my other activities within the ecosystem.
            <br/>
            Write something down <strong>forever</strong>. 
          </p>
        </div>
        <ChainPicker chain={chain} onChange={handleChainChange} />
        {
          !isActiveWalletConnected && chain === 'cardano' && (
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
          !isActiveWalletConnected && chain === 'ethereum' && (
            <div className="connect-to-wallet-container">
              <div>
                <h2>
                  Connect With An Ethereum Wallet To Continue
                </h2>
                <p>
                  You will need an Ethereum wallet such as MetaMask or Rabby, and a small amount of ETH on mainnet to cover gas. The commitment transaction sends zero ETH to 0x000000000000000000000000000000000000dEaD and writes your data in the transaction input.
                </p>
              </div>
              <EthereumConnectWallet />
            </div>
          )
        }
        {
          isActiveWalletConnected && chain === 'cardano' && (
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
              <UnifiedCommit chain="cardano" />
            </>
          )
        }
        {
          isActiveWalletConnected && chain === 'ethereum' && (
            <>
              <div className="connection-info">
                <h3>
                  Connected to
                </h3>
                <div className="font-mono" style={{ wordBreak: 'break-all', maxWidth: '256px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {ethAddress}
                </div>
              </div>
              <EthereumConnectWallet />
              <UnifiedCommit chain="ethereum" />
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
