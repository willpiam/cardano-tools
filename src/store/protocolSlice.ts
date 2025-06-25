import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProtocolState {
    minParticipants: number;
    operatorFee: string;
    uniformOutputValue: string;
    error: string | null;
}

const initialState: ProtocolState = {
    minParticipants: 0,
    operatorFee: "",
    uniformOutputValue: "",
    error: null
};

export const protocolSlice = createSlice({
    name: 'protocol',
    initialState,
    reducers: {
        setProtocolParameters: (state, action: PayloadAction<{ minParticipants: number; operatorFee: string; uniformOutputValue: string; }>) => {
            state.minParticipants = action.payload.minParticipants;
            state.operatorFee = action.payload.operatorFee;
            state.uniformOutputValue = action.payload.uniformOutputValue;
            state.error = null;
        },
        setProtocolError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
        },
    },
});

export const {
    setProtocolParameters,
    setProtocolError,
} = protocolSlice.actions;

export default protocolSlice.reducer; 