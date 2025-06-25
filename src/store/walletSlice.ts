import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
    selectedWallet: string | null;
    address: string | null;
    balance: string | null; // Store as string to handle bigint serialization
    lucid: any | null; // We'll type this better later
}

const initialState: WalletState = {
    selectedWallet: null,
    address: null,
    balance: null,
    lucid: null,
};

export const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        setSelectedWallet: (state, action: PayloadAction<string | null>) => {
            state.selectedWallet = action.payload;
        },
        setAddress: (state, action: PayloadAction<string | null>) => {
            state.address = action.payload;
        },
        setBalance: (state, action: PayloadAction<bigint | null>) => {
            state.balance = action.payload?.toString() ?? null;
        },
        setLucid: (state, action: PayloadAction<any | null>) => {
            state.lucid = action.payload;
        },
        resetWallet: (state) => {
            state.selectedWallet = null;
            state.address = null;
            state.balance = null;
            state.lucid = null;
        },
    }
});

export const {
    setSelectedWallet,
    setAddress,
    setBalance,
    setLucid,
    resetWallet,
} = walletSlice.actions;

export default walletSlice.reducer; 