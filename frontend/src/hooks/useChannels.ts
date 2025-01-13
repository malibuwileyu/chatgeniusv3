import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setChannels, setLoading, setError, Channel } from '../store/slices/channelSlice';
import { supabase } from '../services/supabase';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';

const useChannels = () => {
    const dispatch = useDispatch();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const fetchAndSortChannels = async () => {
        try {
            // Fetch regular channels and DMs separately
            const [regularResponse, dmResponse] = await Promise.all([
                supabase
                    .from('channels')
                    .select(`
                        *,
                        channel_members!inner (user_id)
                    `)
                    .neq('type', 'dm')
                    .eq('channel_members.user_id', currentUser?.id)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('channels')
                    .select('*')
                    .eq('type', 'dm')
                    // Only fetch DMs where the current user is a participant
                    .contains('user_ids', [currentUser?.id])
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
        if (!currentUser) return; // Don't fetch if no user is logged in
        
        dispatch(setLoading(true));
        fetchAndSortChannels();

        // Subscribe to both channel and channel_members changes
        const subscription = supabase
            .channel('channel-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'channels'
            }, async () => {
                await fetchAndSortChannels();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'channel_members'
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
    }, [dispatch, currentUser]);
};

export default useChannels; 