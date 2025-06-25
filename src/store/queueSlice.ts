import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface QueueParticipant {
  address: string;
}

interface QueueState {
  participants: QueueParticipant[];
  error: string | null;
}

const initialState: QueueState = {
  participants: [],
  error: null,
};

export const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setQueue: (state, action: PayloadAction<QueueParticipant[]>) => {
      state.participants = action.payload;
      state.error = null;
    },
    setQueueError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearQueue: (state) => {
      state.participants = [];
      state.error = null;
    },
  },
});

export const { setQueue, setQueueError, clearQueue } = queueSlice.actions;

export default queueSlice.reducer; 