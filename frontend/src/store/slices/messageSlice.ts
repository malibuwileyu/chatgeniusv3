import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
}

export interface Attachment {
    id: string;
    file_url: string;
    file_type: string;
    file_name: string;
    file_size: number;
}

export interface Message {
    id: string;
    content: string;
    type: 'text' | 'file' | 'ai' | 'system';
    channel_id: string;
    thread_id?: string;
    user: User;
    attachments: Attachment[];
    created_at: string;
    updated_at: string;
}

export interface MessageState {
    messages: Message[];
    loading: boolean;
    error: string | null;
}

const initialState: MessageState = {
    messages: [],
    loading: false,
    error: null
};

const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setMessages: (state, action: PayloadAction<Message[]>) => {
            state.messages = action.payload;
            state.error = null;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
        updateMessage: (state, action: PayloadAction<Message>) => {
            const index = state.messages.findIndex(m => m.id === action.payload.id);
            if (index !== -1) {
                state.messages[index] = action.payload;
            }
        },
        deleteMessage: (state, action: PayloadAction<string>) => {
            state.messages = state.messages.filter(m => m.id !== action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.loading = false;
        }
    }
});

export const {
    setMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    setLoading,
    setError
} = messageSlice.actions;

export default messageSlice.reducer; 