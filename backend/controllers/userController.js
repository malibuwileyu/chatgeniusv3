const { supabase } = require('../services/supabase');

// Get all users
const getUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, full_name, status')
            .order('username');

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Error getting users' });
    }
};

// Get single user
const getUser = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('users')
            .select('id, username, full_name, status')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Error getting user' });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, fullName } = req.body;

        // Only allow users to update their own profile
        if (id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this user' });
        }

        const updates = {};
        if (username) updates.username = username;
        if (fullName) updates.full_name = fullName;

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

// Update user status
const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Only allow users to update their own status
        if (id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this status' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Only allow users to delete their own account
        if (id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this user' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

module.exports = {
    getUsers,
    getUser,
    updateUser,
    updateStatus,
    deleteUser
}; 