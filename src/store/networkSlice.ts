import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type NetworkType = 'local' | 'preview' | null;

interface NetworkState {
    selectedNetwork: NetworkType;
    walletSelectList: string[];
    previewWallet: any;
    previewWalletApi: any;
    previewLucid: any;
    previewAddress: string | null;
    walletBalance: { lovelace: bigint } | null;
}

const initialState: NetworkState = {
    selectedNetwork: null,
    walletSelectList: [],
    previewWallet: null,
    previewWalletApi: null,
    previewLucid: null,
    previewAddress: null,
    walletBalance: null
};

export const networkSlice = createSlice({
    name: 'network',
    initialState,
    reducers: {
        setSelectedNetwork: (state, action: PayloadAction<NetworkType>) => {
            state.selectedNetwork = action.payload;
        },
        setWalletSelectList: (state, action: PayloadAction<string[]>) => {
            state.walletSelectList = action.payload;
        },
        setPreviewWallet: (state, action: PayloadAction<any>) => {
            state.previewWallet = action.payload;
        },
        setPreviewWalletApi: (state, action: PayloadAction<any>) => {
            state.previewWalletApi = action.payload;
        },
        setPreviewLucid: (state, action: PayloadAction<any>) => {
            state.previewLucid = action.payload;
        },
        setPreviewAddress: (state, action: PayloadAction<string | null>) => {
            state.previewAddress = action.payload;
        },
        setWalletBalance: (state, action: PayloadAction<{ lovelace: bigint } | null>) => {
            state.walletBalance = action.payload;
        },
        // Convenience action to reset preview wallet state
        resetPreviewWalletState: (state) => {
            state.previewWallet = null;
            state.previewWalletApi = null;
            state.previewLucid = null;
            state.previewAddress = null;
            state.walletBalance = null;
        }
    }
});

export const {
    setSelectedNetwork,
    setWalletSelectList,
    setPreviewWallet,
    setPreviewWalletApi,
    setPreviewLucid,
    setPreviewAddress,
    setWalletBalance,
    resetPreviewWalletState
} = networkSlice.actions;

export default networkSlice.reducer; 