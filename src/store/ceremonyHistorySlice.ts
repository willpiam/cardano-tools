import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CeremonyRecord {
  expirationTime: number | null;
  id: string;
  transactionHash: string;
}

interface CeremonyHistoryState {
  records: CeremonyRecord[];
  error: string | null;
}

const initialState: CeremonyHistoryState = {
  records: [],
  error: null,
};

export const ceremonyHistorySlice = createSlice({
  name: 'ceremonyHistory',
  initialState,
  reducers: {
    setCeremonyHistory: (state, action: PayloadAction<CeremonyRecord[]>) => {
      state.records = action.payload;
      state.error = null;
    },
    setCeremonyHistoryError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  }
});

export const {
  setCeremonyHistory,
  setCeremonyHistoryError,
} = ceremonyHistorySlice.actions;

export default ceremonyHistorySlice.reducer; 