import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setChannels, setLoading, setError, Channel } from '../store/slices/channelSlice';
import { supabase } from '../services/supabase';

interface SupabaseChannel {
    id: string;
    name: string;
    type: 'public' | 'private';
    description?: string;
    created_at: string;
}

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
                    .returns<SupabaseChannel[]>();

                if (error) {
                    console.error('Supabase error:', error);
                    dispatch(setError(`Failed to fetch channels: ${error.message}`));
                    return;
                }

                console.log('Channels fetched:', channels);
                if (!channels || channels.length === 0) {
                    console.log('No channels found');
                } else {
                    console.log('Channel IDs:', channels.map(c => c.id));
                }
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
    }, [dispatch]);
};

export default useChannels; 