const Channel = require('../models/Channel');
const logger = require('../utils/logger');

const createChannel = async (req, res) => {
    try {
        const { name, description, type } = req.body;
        const { data: channel, error } = await Channel.create({
            name,
            description,
            type
        });

        if (error) throw error;

        // Add creator as member with admin role
        await Channel.addMember(channel.id, req.user.id, 'admin');

        res.status(201).json(channel);
    } catch (error) {
        logger.error('Create channel error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getChannels = async (req, res) => {
    try {
        const { data: channels, error } = await Channel.findByMember(req.user.id);
        if (error) throw error;

        res.json(channels);
    } catch (error) {
        logger.error('Get channels error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getChannel = async (req, res) => {
    try {
        const { data: channel, error } = await Channel.findById(req.params.id);
        if (error || !channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        res.json(channel);
    } catch (error) {
        logger.error('Get channel error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateChannel = async (req, res) => {
    try {
        const { name, description } = req.body;
        const { data: channel, error } = await Channel.update(req.params.id, {
            name,
            description
        });

        if (error) throw error;

        res.json(channel);
    } catch (error) {
        logger.error('Update channel error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addMember = async (req, res) => {
    try {
        const { userId, role } = req.body;
        const { error } = await Channel.addMember(req.params.id, userId, role);
        if (error) throw error;

        res.status(201).json({ message: 'Member added successfully' });
    } catch (error) {
        logger.error('Add member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const removeMember = async (req, res) => {
    try {
        const { error } = await Channel.removeMember(req.params.id, req.params.userId);
        if (error) throw error;

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        logger.error('Remove member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMembers = async (req, res) => {
    try {
        const { data: members, error } = await Channel.getMembers(req.params.id);
        if (error) throw error;

        res.json(members);
    } catch (error) {
        logger.error('Get members error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createChannel,
    getChannels,
    getChannel,
    updateChannel,
    addMember,
    removeMember,
    getMembers
}; 