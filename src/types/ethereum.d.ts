export {};

declare global {
  interface EthereumProvider {
    request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
    on?(event: string, listener: (...args: unknown[]) => void): void;
    removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  }

  interface EIP6963ProviderInfo {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  }

  interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo;
    provider: EthereumProvider;
  }

  interface EIP6963ProviderEvent extends Event {
    detail: EIP6963ProviderDetail;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}
