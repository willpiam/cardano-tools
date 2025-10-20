import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BlockfrostState {
    useBlockfrost: boolean;
    apiKey: string | null;
}

const initialState: BlockfrostState = {
    useBlockfrost: false,
    apiKey: null,
};

export const blockfrostSlice = createSlice({
    name: 'blockfrost',
    initialState,
    reducers: {
        setUseBlockfrost: (state, action: PayloadAction<boolean>) => {
            state.useBlockfrost = action.payload;
        },
        setApiKey: (state, action: PayloadAction<string | null>) => {
            state.apiKey = action.payload;
        },
        setBlockfrostConfig: (state, action: PayloadAction<{ useBlockfrost: boolean; apiKey: string | null }>) => {
            state.useBlockfrost = action.payload.useBlockfrost;
            state.apiKey = action.payload.apiKey;
        },
        resetBlockfrost: (state) => {
            state.useBlockfrost = false;
            state.apiKey = null;
        },
    }
});

export const {
    setUseBlockfrost,
    setApiKey,
    setBlockfrostConfig,
    resetBlockfrost,
} = blockfrostSlice.actions;

export default blockfrostSlice.reducer;
