import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ErrorState {
    walletError: string | null;
}

const initialState: ErrorState = {
    walletError: null
};

export const errorSlice = createSlice({
    name: 'error',
    initialState,
    reducers: {
        setWalletError: (state, action: PayloadAction<string | null>) => {
            state.walletError = action.payload;
        },
        clearWalletError: (state) => {
            state.walletError = null;
        }
    }
});

export const { setWalletError, clearWalletError } = errorSlice.actions;
export default errorSlice.reducer; 