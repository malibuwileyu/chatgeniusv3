const supabase = require('../config/database');

class Channel {
    static async create({ name, description, type }) {
        return await supabase
            .from('channels')
            .insert([{
                name,
                description,
                type
            }])
            .select();
    }

    static async findById(id) {
        return await supabase
            .from('channels')
            .select('*')
            .eq('id', id)
            .single();
    }

    static async findByMember(userId) {
        return await supabase
            .from('channels')
            .select(`
                *,
                channel_members!inner(user_id)
            `)
            .eq('channel_members.user_id', userId);
    }

    static async addMember(channelId, userId, role = 'member') {
        return await supabase
            .from('channel_members')
            .insert([{
                channel_id: channelId,
                user_id: userId,
                role
            }]);
    }

    static async removeMember(channelId, userId) {
        return await supabase
            .from('channel_members')
            .delete()
            .match({ channel_id: channelId, user_id: userId });
    }

    static async getMembers(channelId) {
        return await supabase
            .from('channel_members')
            .select(`
                *,
                users:user_id(*)
            `)
            .eq('channel_id', channelId);
    }

    static async update(channelId, updates) {
        return await supabase
            .from('channels')
            .update(updates)
            .eq('id', channelId);
    }
}

module.exports = Channel; 