const supabase = require('../config/database');

class User {
    static async create({ email, username, fullName, password }) {
        return await supabase
            .from('users')
            .insert([{
                email,
                username,
                full_name: fullName,
                password_hash: password // Note: Password should be hashed before storage
            }])
            .select();
    }

    static async findByEmail(email) {
        return await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
    }

    static async findById(id) {
        return await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
    }

    static async updateStatus(userId, status) {
        return await supabase
            .from('users')
            .update({ status })
            .eq('id', userId);
    }

    static async initializePresence(userId) {
        return await supabase
            .from('presence')
            .upsert({
                user_id: userId,
                status: 'online',
                is_typing: {},
                last_seen: new Date().toISOString()
            })
            .select();
    }

    static async updateProfile(userId, updates) {
        return await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
    }
}

module.exports = User; 