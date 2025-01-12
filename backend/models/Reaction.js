const supabase = require('../config/database');

class Reaction {
    static async create({ messageId, userId, channelId, emoji }) {
        return await supabase
            .from('reactions')
            .insert([{
                message_id: messageId,
                user_id: userId,
                channel_id: channelId,
                emoji
            }])
            .select();
    }

    static async findByMessage(messageId) {
        return await supabase
            .from('reactions')
            .select(`
                *,
                users:user_id(*)
            `)
            .eq('message_id', messageId);
    }

    static async delete(messageId, userId, emoji) {
        return await supabase
            .from('reactions')
            .delete()
            .match({
                message_id: messageId,
                user_id: userId,
                emoji
            });
    }
}

module.exports = Reaction; 