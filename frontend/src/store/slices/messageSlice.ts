import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
    id: string;
    username: string;
    fullName: string;
    status: string;
}

interface Attachment {
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize: number;
}

interface Message {
    id: string;
    content: string;
    type: 'text' | 'file' | 'ai' | 'system';
    user: User;
    channelId: string;
    threadId?: string;
    attachments: Attachment[];
    createdAt: string;
    updatedAt: string;
}

export interface MessageState {
    messages: Message[];
    threadMessages: Message[];
    loading: boolean;
    error: string | null;
}

const initialState: MessageState = {
    messages: [],
    threadMessages: [],
    loading: false,
    error: null
};

const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setMessages: (state, action: PayloadAction<Message[]>) => {
            state.messages = action.payload;
        },
        setThreadMessages: (state, action: PayloadAction<Message[]>) => {
            state.threadMessages = action.payload;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            if (action.payload.threadId) {
                state.threadMessages.push(action.payload);
            } else {
                state.messages.push(action.payload);
            }
        },
        updateMessage: (state, action: PayloadAction<Message>) => {
            const isThreadMessage = action.payload.threadId;
            const messages = isThreadMessage ? state.threadMessages : state.messages;
            const index = messages.findIndex(m => m.id === action.payload.id);
            if (index !== -1) {
                messages[index] = action.payload;
            }
        },
        deleteMessage: (state, action: PayloadAction<{ id: string; threadId?: string }>) => {
            const isThreadMessage = action.payload.threadId;
            const messages = isThreadMessage ? state.threadMessages : state.messages;
            const index = messages.findIndex(m => m.id === action.payload.id);
            if (index !== -1) {
                messages.splice(index, 1);
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        }
    }
});

export const {
    setMessages,
    setThreadMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    setLoading,
    setError
} = messageSlice.actions;

export default messageSlice.reducer; 