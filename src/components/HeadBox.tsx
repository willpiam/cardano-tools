import { Menu } from './Menu';
import { useAppSelector } from '../store/hooks';

export const HeadBox = () => {
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const balance = useAppSelector((state) => state.wallet.balance);
  const queue = useAppSelector((state) => state.queue.participants);

  return (
    <div className="head-box">
      <div className="head-box-title">
        <img src="/logo-footer.png" alt="logo" />
        <h1>Turn</h1>
        {process.env.REACT_APP_NETWORK === 'preview' && (
          <div className="head-box-network">
            <a
              href="https://docs.cardano.org/cardano-testnets/tools/faucet"
              target="_blank"
              rel="noopener noreferrer"
            >
              preview
            </a>
          </div>
        )}
      </div>
      <div className="head-box-items">
        {walletAddress && (
          <div className="head-box-wallet-badge">
            Wallet Connected
            <div className="wallet-tooltip">
              <div className="wallet-tooltip-content">
                <div className="wallet-tooltip-row">
                  <span className="wallet-tooltip-label">Address:</span>
                  <span className="wallet-tooltip-value">{walletAddress}</span>
                </div>
                <div className="wallet-tooltip-row">
                  <span className="wallet-tooltip-label">Balance:</span>
                  <span className="wallet-tooltip-value">
                    {balance ? Number(BigInt(balance)) / 1000000 : 0} ADA
                  </span>
                </div>
              </div>
              <div className="wallet-tooltip-arrow"></div>
            </div>
          </div>
        )}
        <div className="head-box-queue-badge">{queue.length} in Queue</div>
        <Menu />
      </div>
    </div>
  );
};
