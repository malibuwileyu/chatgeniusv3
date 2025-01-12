const Message = require('../models/Message');
const logger = require('../utils/logger');

const createMessage = async (req, res) => {
    try {
        const { channelId, content, type = 'text', threadId } = req.body;
        const { data: message, error } = await Message.create({
            channelId,
            userId: req.user.id,
            content,
            type,
            threadId
        });

        if (error) throw error;

        res.status(201).json(message);
    } catch (error) {
        logger.error('Create message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMessages = async (req, res) => {
    try {
        const { data: messages, error } = await Message.findByChannel(
            req.params.channelId,
            req.query.limit
        );

        if (error) throw error;

        res.json(messages);
    } catch (error) {
        logger.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getThreadMessages = async (req, res) => {
    try {
        const { data: messages, error } = await Message.findByThread(
            req.params.threadId,
            req.query.limit
        );

        if (error) throw error;

        res.json(messages);
    } catch (error) {
        logger.error('Get thread messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const { data: message, error } = await Message.update(req.params.id, {
            content
        });

        if (error) throw error;

        res.json(message);
    } catch (error) {
        logger.error('Update message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { error } = await Message.delete(req.params.id);
        if (error) throw error;

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        logger.error('Delete message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createMessage,
    getMessages,
    getThreadMessages,
    updateMessage,
    deleteMessage
}; 