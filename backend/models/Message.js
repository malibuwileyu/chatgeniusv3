const supabase = require('../config/database');

class Message {
    static async create({ channelId, userId, content, type = 'text', threadId = null }) {
        return await supabase
            .from('messages')
            .insert([{
                channel_id: channelId,
                user_id: userId,
                content,
                type,
                thread_id: threadId
            }])
            .select();
    }

    static async findById(id) {
        return await supabase
            .from('messages')
            .select(`
                *,
                users:user_id(*),
                attachments(*)
            `)
            .eq('id', id)
            .single();
    }

    static async findByChannel(channelId, limit = 50) {
        return await supabase
            .from('messages')
            .select(`
                *,
                users:user_id(*),
                attachments(*)
            `)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(limit);
    }

    static async findByThread(threadId, limit = 50) {
        return await supabase
            .from('messages')
            .select(`
                *,
                users:user_id(*),
                attachments(*)
            `)
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true })
            .limit(limit);
    }

    static async update(messageId, updates) {
        return await supabase
            .from('messages')
            .update(updates)
            .eq('id', messageId);
    }

    static async delete(messageId) {
        return await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);
    }
}

module.exports = Message; 