import { supabase } from '../supabaseClient';
import { getUser } from './authService';

const bookmarkService = {
    async getBookmarks() {
        const currentUser = getUser();
        const { data, error } = await supabase
            .from('bookmarked_messages')
            .select(`
                message_id,
                messages:message_id (
                    id,
                    content,
                    created_at,
                    sender:sender_id (
                        id,
                        username
                    ),
                    channel:channel_id (
                        id,
                        name
                    ),
                    dm:dm_id (
                        id
                    )
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(bookmark => bookmark.messages);
    },

    async toggleBookmark(messageId) {
        const currentUser = getUser();
        // Get all matching bookmarks (should be 0 or 1)
        const { data: existing, error: checkError } = await supabase
            .from('bookmarked_messages')
            .select('user_id, message_id')
            .eq('message_id', messageId)
            .eq('user_id', currentUser.id);

        if (checkError) throw checkError;

        // Check if we found any matches
        if (existing && existing.length > 0) {
            const { error: deleteError } = await supabase
                .from('bookmarked_messages')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', currentUser.id);

            if (deleteError) throw deleteError;
            return false;
        } else {
            const { error: insertError } = await supabase
                .from('bookmarked_messages')
                .insert([{
                    message_id: messageId,
                    user_id: currentUser.id
                }]);

            if (insertError) throw insertError;
            return true;
        }
    }
};

export default bookmarkService;
