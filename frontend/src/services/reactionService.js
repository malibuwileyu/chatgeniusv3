import api from '../api/api';

class ReactionService {
    async toggleReaction(messageId, emoji) {
        const response = await api.post(`/reactions/${messageId}`, { emoji });
        return response.data;
    }

    async getMessageReactions(messageId) {
        const response = await api.get(`/reactions/${messageId}`);
        return response.data;
    }
}

const reactionService = new ReactionService();
export default reactionService;