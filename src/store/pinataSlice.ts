import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PinataState {
  usePinata: boolean;
  jwt: string | null;
}

const initialState: PinataState = {
  usePinata: false,
  jwt: null,
};

export const pinataSlice = createSlice({
  name: 'pinata',
  initialState,
  reducers: {
    setUsePinata: (state, action: PayloadAction<boolean>) => {
      state.usePinata = action.payload;
    },
    setPinataJwt: (state, action: PayloadAction<string | null>) => {
      state.jwt = action.payload;
    },
    setPinataConfig: (state, action: PayloadAction<{ usePinata: boolean; jwt: string | null }>) => {
      state.usePinata = action.payload.usePinata;
      state.jwt = action.payload.jwt;
    },
    resetPinata: (state) => {
      state.usePinata = false;
      state.jwt = null;
    },
  },
});

export const {
  setUsePinata,
  setPinataJwt,
  setPinataConfig,
  resetPinata,
} = pinataSlice.actions;

export default pinataSlice.reducer;
