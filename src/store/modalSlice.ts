import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ModalState {
    isQueueModalOpen: boolean;
    activeView: 'signup' | 'info';
    showWalletSelect: boolean;
}

const initialState: ModalState = {
    isQueueModalOpen: false,
    activeView: 'signup',
    showWalletSelect: false,
};

export const modalSlice = createSlice({
    name: 'modal',
    initialState,
    reducers: {
        setQueueModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isQueueModalOpen = action.payload;
        },
        setActiveView: (state, action: PayloadAction<'signup' | 'info'>) => {
            state.activeView = action.payload;
        },
        setShowWalletSelect: (state, action: PayloadAction<boolean>) => {
            state.showWalletSelect = action.payload;
        },
        closeAllModals: (state) => {
            state.isQueueModalOpen = false;
            state.showWalletSelect = false;
        },
    },
});

export const {
    setQueueModalOpen,
    setActiveView,
    setShowWalletSelect,
    closeAllModals,
} = modalSlice.actions;

export default modalSlice.reducer; 