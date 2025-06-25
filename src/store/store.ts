import { configureStore } from '@reduxjs/toolkit';
import networkReducer from './networkSlice';
import errorReducer from './errorSlice';
import ceremonyReducer from './ceremonySlice';
import queueReducer from './queueSlice';
import walletReducer from './walletSlice';
import modalReducer from './modalSlice';
import signupReducer from './signupSlice';
import protocolReducer from './protocolSlice';
import walletConnectedReducer from './isWalletConnectedSlice';
import ceremonyHistoryReducer from './ceremonyHistorySlice';

export const store = configureStore({
  reducer: {
    network: networkReducer,
    error: errorReducer,
    ceremony: ceremonyReducer,
    queue: queueReducer,
    wallet: walletReducer,
    modal: modalReducer,
    signup: signupReducer,
    protocol: protocolReducer,
    walletConnected: walletConnectedReducer,
    ceremonyHistory: ceremonyHistoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
