import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setChannels, setLoading, setError, Channel } from '../store/slices/channelSlice';
import { supabase } from '../services/supabase';

const useChannels = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchChannels = async () => {
            dispatch(setLoading(true));
            try {
                console.log('Fetching channels from Supabase...');
                
                const { data: channels, error } = await supabase
                    .from('channels')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .returns<Channel[]>();

                if (error) {
                    console.error('Supabase error:', error);
                    dispatch(setError(`Failed to fetch channels: ${error.message}`));
                    return;
                }

                console.log('Channels fetched:', channels);
                dispatch(setChannels(channels || []));
            } catch (error: any) {
                console.error('Error in useChannels:', error);
                const errorMessage = error.message || 'Failed to fetch channels';
                dispatch(setError(errorMessage));
            } finally {
                dispatch(setLoading(false));
            }
        };

        fetchChannels();

        // Subscribe to channel changes
        const subscription = supabase
            .channel('channel-changes')
            .on('postgres_changes', {
                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'channels'
            }, async (payload) => {
                console.log('Channel change received:', payload);
                
                // Refetch all channels to ensure we have the latest state
                // This is simpler than trying to merge changes, especially for updates and deletes
                const { data: channels, error } = await supabase
                    .from('channels')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .returns<Channel[]>();

                if (error) {
                    console.error('Error refetching channels:', error);
                    return;
                }

                dispatch(setChannels(channels || []));
            })
            .subscribe((status) => {
                console.log('Channel subscription status:', status);
            });

        // Cleanup subscription on unmount
        return () => {
            console.log('Cleaning up channel subscription');
            subscription.unsubscribe();
        };
    }, [dispatch]);
};

export default useChannels; 