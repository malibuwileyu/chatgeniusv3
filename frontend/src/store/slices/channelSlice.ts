import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Channel {
    id: string;
    name: string;
    type: 'public' | 'private';
    created_at: string;
}

export interface ChannelState {
    channels: Channel[];
    currentChannel: Channel | null;
    loading: boolean;
    error: string | null;
}

const initialState: ChannelState = {
    channels: [],
    currentChannel: null,
    loading: false,
    error: null
};

const channelSlice = createSlice({
    name: 'channels',
    initialState,
    reducers: {
        setChannels: (state, action: PayloadAction<Channel[]>) => {
            state.channels = action.payload;
            state.error = null;
        },
        setCurrentChannel: (state, action: PayloadAction<Channel>) => {
            state.currentChannel = action.payload;
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.loading = false;
        }
    }
});

export const { setChannels, setCurrentChannel, setLoading, setError } = channelSlice.actions;
export default channelSlice.reducer; 