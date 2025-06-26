import { configureStore } from '@reduxjs/toolkit';
import networkReducer from './networkSlice';
import errorReducer from './errorSlice';
import walletReducer from './walletSlice';
import modalReducer from './modalSlice';
import walletConnectedReducer from './isWalletConnectedSlice';

export const store = configureStore({
  reducer: {
    network: networkReducer,
    error: errorReducer,
    wallet: walletReducer,
    modal: modalReducer,
    walletConnected: walletConnectedReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
