import { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';

// Decode the asset name (hex part after policy id) into UTF-8 string.
function decodeAssetName(unit: string): string {
  if (unit.length <= 56) return '';
  const hex = unit.slice(56);
  if (!hex) return '';
  try {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    return hex; // fallback: return hex if decode fails
  }
}

interface TokenInfo {
  unit: string;      // policyId+assetName hex string
  quantity: bigint;  // aggregated amount across all utxos
  name: string;      // decoded asset name (may be empty)
}

// A list of all tokens found in the users wallet
export default function TokenList() {
  const lucid = useAppSelector((state) => state.wallet.lucid);
  const isWalletConnected = useAppSelector(
    (state) => state.walletConnected.isWalletConnected
  );

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!lucid || !isWalletConnected) return;
      setLoading(true);
      setError(null);
      try {
        const utxos = await lucid.wallet().getUtxos();
        const aggregate: Record<string, bigint> = {};
        for (const utxo of utxos) {
          for (const [unit, quantity] of Object.entries(utxo.assets)) {
            if (unit === 'lovelace') continue; // Skip ADA
            // Quantity might already be bigint or string; cast to any for BigInt
            aggregate[unit] = (aggregate[unit] || BigInt(0)) + BigInt(quantity as any);
          }
        }
        const tokenList: TokenInfo[] = Object.entries(aggregate).map(
          ([unit, quantity]) => ({
            unit,
            quantity,
            name: decodeAssetName(unit),
          })
        );
        setTokens(tokenList);
      } catch (err: any) {
        console.error('Failed to fetch tokens', err);
        setError('Failed to fetch tokens');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [lucid, isWalletConnected]);

  if (!isWalletConnected) {
    return <p>Connect a wallet to view tokens.</p>;
  }

  if (loading) {
    return <p>Loading tokens...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (tokens.length === 0) {
    return <p>No tokens found in your wallet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#1a1103]">
            <th className="px-4 py-2 border-b">Name</th>
            <th className="px-4 py-2 border-b">Unit (hex)</th>
            <th className="px-4 py-2 border-b">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.unit} className="odd:bg-[#33240b] even:bg-[#1a1103]">
              <td className="px-4 py-2 border-b font-semibold">
                {t.name || '(no name)'}
              </td>
              <td className="px-4 py-2 border-b break-all font-mono text-xs text-gray-300">
                {t.unit}
              </td>
              <td className="px-4 py-2 border-b">{t.quantity.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

