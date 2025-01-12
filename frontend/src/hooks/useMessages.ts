import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setMessages, addMessage, setLoading, setError, Message } from '../store/slices/messageSlice';
import { supabase } from '../services/supabase';

interface SupabaseMessage {
    id: string;
    content: string;
    type: 'text' | 'file' | 'ai' | 'system';
    channel_id: string;
    thread_id?: string;
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        username: string;
        full_name: string;
        avatar_url?: string;
    }[];
    attachments: {
        id: string;
        file_url: string;
        file_type: string;
        file_name: string;
        file_size: number;
    }[];
}

const useMessages = (channelId: string) => {
    const dispatch = useDispatch();

    useEffect(() => {
        console.log('Setting up messages for channel:', channelId);
        
        const fetchMessages = async () => {
            dispatch(setLoading(true));
            try {
                console.log('Fetching messages...');
                const { data: messages, error } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        content,
                        type,
                        channel_id,
                        thread_id,
                        created_at,
                        updated_at,
                        user:user_id (
                            id,
                            username,
                            full_name,
                            avatar_url
                        ),
                        attachments (
                            id,
                            file_url,
                            file_type,
                            file_name,
                            file_size
                        )
                    `)
                    .eq('channel_id', channelId)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error fetching messages:', error);
                    dispatch(setError(error.message));
                    return;
                }

                console.log('Messages fetched:', messages?.length || 0);
                const typedMessages = messages?.map((msg: SupabaseMessage) => ({
                    ...msg,
                    user: Array.isArray(msg.user) ? msg.user[0] : msg.user,
                    attachments: Array.isArray(msg.attachments) ? msg.attachments : []
                })) as Message[];
                dispatch(setMessages(typedMessages || []));
            } catch (error: any) {
                console.error('Error in useMessages:', error);
                dispatch(setError(error.message || 'Failed to fetch messages'));
            } finally {
                dispatch(setLoading(false));
            }
        };

        fetchMessages();

        // Subscribe to new messages
        const subscription = supabase
            .channel(`messages:${channelId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channelId}`
            }, async (payload) => {
                console.log('New message received:', payload);
                
                // Fetch the complete message with user and attachments
                const { data: message, error } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        content,
                        type,
                        channel_id,
                        thread_id,
                        created_at,
                        updated_at,
                        user:user_id (
                            id,
                            username,
                            full_name,
                            avatar_url
                        ),
                        attachments (
                            id,
                            file_url,
                            file_type,
                            file_name,
                            file_size
                        )
                    `)
                    .eq('id', payload.new.id)
                    .single();

                if (error) {
                    console.error('Error fetching new message:', error);
                    return;
                }

                if (message) {
                    const typedMessage = {
                        ...message,
                        user: Array.isArray(message.user) ? message.user[0] : message.user,
                        attachments: Array.isArray(message.attachments) ? message.attachments : []
                    } as Message;
                    dispatch(addMessage(typedMessage));
                }
            })
            .subscribe();

        return () => {
            console.log('Cleaning up messages subscription');
            subscription.unsubscribe();
        };
    }, [channelId, dispatch]);
};

export default useMessages; 