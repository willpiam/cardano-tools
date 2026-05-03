export type CommitChain = 'cardano' | 'ethereum';

interface ChainPickerProps {
  chain: CommitChain;
  onChange: (chain: CommitChain) => void;
}

const ChainPicker = ({ chain, onChange }: ChainPickerProps) => {
  return (
    <div className="border border-gray-300 rounded-md p-4 w-full max-w-xl">
      <h2 className="text-xl font-semibold">Choose a chain</h2>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onChange('cardano')}
          className={chain === 'cardano' ? 'wallet-select-button selected' : 'wallet-select-button'}
        >
          Cardano
        </button>
        <button
          type="button"
          onClick={() => onChange('ethereum')}
          className={chain === 'ethereum' ? 'wallet-select-button selected' : 'wallet-select-button'}
        >
          Ethereum
        </button>
      </div>
      {chain === 'ethereum' && (
        <p className="text-sm text-yellow-700" style={{ marginTop: '0.75rem' }}>
          Ethereum commitments are sent on mainnet and cost real gas. The transaction has zero ETH value and writes your commitment in input data.
        </p>
      )}
    </div>
  );
};

export default ChainPicker;
