import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SignupState {
    recipientAddress: string;
    error: string | null;
}

const initialState: SignupState = {
    recipientAddress: "",
    error: null,
};

export const signupSlice = createSlice({
    name: 'signup',
    initialState,
    reducers: {
        setRecipientAddress: (state, action: PayloadAction<string>) => {
            state.recipientAddress = action.payload;
        },
        setSignupError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        resetSignupForm: (state) => {
            state.recipientAddress = "";
            state.error = null;
        },
    },
});

export const {
    setRecipientAddress,
    setSignupError,
    resetSignupForm,
} = signupSlice.actions;

export default signupSlice.reducer; 