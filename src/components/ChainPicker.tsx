export type CommitChain = 'cardano' | 'ethereum';

interface ChainPickerProps {
  chain: CommitChain;
  onChange: (chain: CommitChain) => void;
}

const ChainPicker = ({ chain, onChange }: ChainPickerProps) => {
  return (
    <>
      <div className="choice-grid">
        <button
          type="button"
          onClick={() => onChange('cardano')}
          className={`choice-card theme-cardano${chain === 'cardano' ? ' is-selected' : ''}`}
        >
          <div className="choice-card-title">
            <span className="choice-glyph" aria-hidden="true">₳</span>
            Cardano
          </div>
          <div className="choice-card-desc">
            Low fees, metadata label 674. Pay in ADA. Optional pointer-token and tip extras.
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange('ethereum')}
          className={`choice-card theme-ethereum${chain === 'ethereum' ? ' is-selected' : ''}`}
        >
          <div className="choice-card-title">
            <span className="choice-glyph" aria-hidden="true">Ξ</span>
            Ethereum
          </div>
          <div className="choice-card-desc">
            Mainnet only. Sends a zero-value transaction with your data in the input. Costs real gas.
          </div>
        </button>
      </div>
      {chain === 'ethereum' && (
        <p className="pw-muted" style={{ color: '#7c5d10' }}>
          Heads up: Ethereum commitments cost real gas at current mainnet rates.
        </p>
      )}
    </>
  );
};

export default ChainPicker;
