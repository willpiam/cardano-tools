export const ETHEREUM_MAINNET_CHAIN_ID = '0x1';
export const ETHEREUM_DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
export const FALLBACK_PROVIDER_RDNS = 'window.ethereum';

export interface DiscoveredEthereumProvider {
  info: EIP6963ProviderInfo;
  provider: EthereumProvider;
}

interface SendIDMArgs {
  from: string;
  dataHex: `0x${string}`;
  providerRdns: string | null;
}

const providerMap = new Map<string, EthereumProvider>();

const fallbackInfo: EIP6963ProviderInfo = {
  uuid: FALLBACK_PROVIDER_RDNS,
  name: 'Injected Ethereum Wallet',
  icon: '',
  rdns: FALLBACK_PROVIDER_RDNS,
};

const normalizeChainId = (chainId: unknown): string | null => {
  return typeof chainId === 'string' ? chainId.toLowerCase() : null;
};

export const getEtherscanTxUrl = (txHash: string): string => {
  return `https://etherscan.io/tx/${txHash}`;
};

export const toHexData = (input: string | Uint8Array): `0x${string}` => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hex = Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
};

export const discoverEthereumProviders = async (): Promise<DiscoveredEthereumProvider[]> => {
  const providers = new Map<string, DiscoveredEthereumProvider>();

  const addProvider = (detail: EIP6963ProviderDetail) => {
    const key = detail.info.rdns || detail.info.uuid || detail.info.name;
    if (!key) return;

    providers.set(key, detail);
    providerMap.set(key, detail.provider);
  };

  const handleProvider = (event: Event) => {
    const providerEvent = event as EIP6963ProviderEvent;
    if (providerEvent.detail?.provider && providerEvent.detail?.info) {
      addProvider(providerEvent.detail);
    }
  };

  window.addEventListener('eip6963:announceProvider', handleProvider);
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  await new Promise(resolve => window.setTimeout(resolve, 300));
  window.removeEventListener('eip6963:announceProvider', handleProvider);

  if (providers.size === 0 && window.ethereum) {
    providers.set(FALLBACK_PROVIDER_RDNS, {
      info: fallbackInfo,
      provider: window.ethereum,
    });
    providerMap.set(FALLBACK_PROVIDER_RDNS, window.ethereum);
  }

  return Array.from(providers.values());
};

export const getEthProvider = (providerRdns: string | null): EthereumProvider => {
  const provider = providerRdns ? providerMap.get(providerRdns) : null;
  if (provider) return provider;
  if (providerRdns === FALLBACK_PROVIDER_RDNS && window.ethereum) return window.ethereum;
  if (!providerRdns && window.ethereum) return window.ethereum;
  throw new Error('Ethereum wallet provider is no longer available. Please reconnect your wallet.');
};

export const connectEthWallet = async (providerRdns: string): Promise<{ address: string; chainId: string | null }> => {
  const provider = getEthProvider(providerRdns);
  const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
  const address = accounts[0];
  if (!address) {
    throw new Error('No Ethereum account returned by wallet.');
  }
  const chainId = normalizeChainId(await provider.request<string>({ method: 'eth_chainId' }));
  return { address, chainId };
};

export const ensureMainnet = async (providerRdns: string | null): Promise<void> => {
  const provider = getEthProvider(providerRdns);
  const currentChainId = normalizeChainId(await provider.request<string>({ method: 'eth_chainId' }));
  if (currentChainId === ETHEREUM_MAINNET_CHAIN_ID) return;

  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: ETHEREUM_MAINNET_CHAIN_ID }],
  });
};

export const sendIDM = async ({ from, dataHex, providerRdns }: SendIDMArgs): Promise<string> => {
  const provider = getEthProvider(providerRdns);
  return provider.request<string>({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: ETHEREUM_DEAD_ADDRESS,
      value: '0x0',
      data: dataHex,
    }],
  });
};
