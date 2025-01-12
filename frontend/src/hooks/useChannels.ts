import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setChannels, setLoading, setError, Channel } from '../store/slices/channelSlice';
import { supabase } from '../services/supabase';

const useChannels = () => {
    const dispatch = useDispatch();

    const fetchAndSortChannels = async () => {
        try {
            // Fetch regular channels and DMs separately
            const [regularResponse, dmResponse] = await Promise.all([
                supabase
                    .from('channels')
                    .select('*')
                    .neq('type', 'dm')
                    .order('created_at', { ascending: true }),
                supabase
                    .from('channels')
                    .select('*')
                    .eq('type', 'dm')
                    .order('last_message_at', { ascending: false, nullsFirst: false })
            ]);

            if (regularResponse.error) throw regularResponse.error;
            if (dmResponse.error) throw dmResponse.error;

            // Combine regular channels and DMs
            const allChannels = [
                ...(regularResponse.data || []),
                ...(dmResponse.data || [])
            ];

            dispatch(setChannels(allChannels));
        } catch (error: any) {
            console.error('Error fetching channels:', error);
            dispatch(setError(error.message || 'Failed to fetch channels'));
        } finally {
            dispatch(setLoading(false));
        }
    };

    useEffect(() => {
        dispatch(setLoading(true));
        fetchAndSortChannels();

        // Subscribe to channel changes
        const subscription = supabase
            .channel('channel-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'channels'
            }, async () => {
                await fetchAndSortChannels();
            })
            .subscribe((status) => {
                console.log('Channel subscription status:', status);
            });

        // Subscribe to message changes to update DM ordering
        const messageSubscription = supabase
            .channel('message-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, async (payload) => {
                // Update the channel's last_message_at
                await supabase
                    .from('channels')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', payload.new.channel_id);

                // Refetch channels to get updated order
                await fetchAndSortChannels();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
            messageSubscription.unsubscribe();
        };
    }, [dispatch]);
};

export default useChannels; 