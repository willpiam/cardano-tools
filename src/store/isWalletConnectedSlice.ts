import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  isWalletConnected: boolean;
}

const initialState: WalletState = {
  isWalletConnected: false,
};

export const isWalletConnected = createSlice({
  name: 'wallet-connected',
  initialState,
  reducers: {
    setIsWalletConnected: (state, action: PayloadAction<boolean>) => {
      state.isWalletConnected = action.payload;
    },
  },
});

export const { setIsWalletConnected } = isWalletConnected.actions;

export default isWalletConnected.reducer;
