import { configureStore } from '@reduxjs/toolkit';
import networkReducer from './networkSlice';
import errorReducer from './errorSlice';
import walletReducer from './walletSlice';
import modalReducer from './modalSlice';
import walletConnectedReducer from './isWalletConnectedSlice';
import blockfrostReducer from './blockfrostSlice';
import ethWalletReducer from './ethWalletSlice';

export const store = configureStore({
  reducer: {
    network: networkReducer,
    error: errorReducer,
    wallet: walletReducer,
    modal: modalReducer,
    walletConnected: walletConnectedReducer,
    blockfrost: blockfrostReducer,
    ethWallet: ethWalletReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
