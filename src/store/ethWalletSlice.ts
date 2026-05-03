import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EthWalletState {
  selectedWalletName: string | null;
  providerRdns: string | null;
  address: string | null;
  chainId: string | null;
}

const initialState: EthWalletState = {
  selectedWalletName: null,
  providerRdns: null,
  address: null,
  chainId: null,
};

export const ethWalletSlice = createSlice({
  name: 'eth-wallet',
  initialState,
  reducers: {
    setEthWallet: (state, action: PayloadAction<EthWalletState>) => {
      state.selectedWalletName = action.payload.selectedWalletName;
      state.providerRdns = action.payload.providerRdns;
      state.address = action.payload.address;
      state.chainId = action.payload.chainId;
    },
    setEthAddress: (state, action: PayloadAction<string | null>) => {
      state.address = action.payload;
    },
    setEthChainId: (state, action: PayloadAction<string | null>) => {
      state.chainId = action.payload;
    },
    resetEthWallet: (state) => {
      state.selectedWalletName = null;
      state.providerRdns = null;
      state.address = null;
      state.chainId = null;
    },
  },
});

export const {
  setEthWallet,
  setEthAddress,
  setEthChainId,
  resetEthWallet,
} = ethWalletSlice.actions;

export default ethWalletSlice.reducer;
