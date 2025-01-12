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
                    .order('created_at', { ascending: true });

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
    }, [dispatch]);
};

export default useChannels; 