const jwt = require('jsonwebtoken');
const { supabase } = require('../services/supabase');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('No token provided');
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            throw new Error('User not found');
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ message: 'Please authenticate' });
    }
};

module.exports = { auth }; 