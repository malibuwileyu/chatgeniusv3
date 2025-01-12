const { supabase } = require('../services/supabase');

// Add reaction to message
const addReaction = async (req, res) => {
    try {
        const { messageId, type } = req.body;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('reactions')
            .insert([{ message_id: messageId, user_id: userId, type }]);

        if (error) throw error;

        res.json(data[0]);
    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({ message: 'Error adding reaction' });
    }
};

// Remove reaction
const removeReaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('reactions')
            .delete()
            .match({ id, user_id: userId });

        if (error) throw error;

        res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
        console.error('Remove reaction error:', error);
        res.status(500).json({ message: 'Error removing reaction' });
    }
};

// Get reactions for message
const getReactions = async (req, res) => {
    try {
        const { messageId } = req.params;

        const { data, error } = await supabase
            .from('reactions')
            .select('*')
            .eq('message_id', messageId);

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Get reactions error:', error);
        res.status(500).json({ message: 'Error getting reactions' });
    }
};

module.exports = {
    addReaction,
    removeReaction,
    getReactions
}; 