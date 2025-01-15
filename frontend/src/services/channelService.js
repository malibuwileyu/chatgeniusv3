import api from '../api/api';

class ChannelService {
    async createChannel(channelData) {
        try {
            console.log("Client: [createChannel] Creating channel with data:", channelData);
            console.log("Client: [createChannel] Making request to:", `${api.defaults.baseURL}/channels`);
            const token = localStorage.getItem('auth_token');
            console.log("Client: [createChannel] Auth token present:", !!token);
            const response = await api.post('/channels', channelData);
            console.log("Client: [createChannel] Response:", response);
            return response.data;
        } catch (error) {
            console.error("Client: [createChannel] Error details:", {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers
            });
            throw error;
        }
    }

    async getChannels() {
        const response = await api.get('/channels');
        return response.data;
    }

    async getPublicChannels() {
        const response = await api.get('/channels/public');
        return response.data;
    }

    async getChannel(channelId) {
        const response = await api.get(`/channels/${channelId}`);
        return response.data;
    }

    async updateChannel(channelId, channelData) {
        const response = await api.put(`/channels/${channelId}`, channelData);
        return response.data;
    }

    async deleteChannel(channelId) {
        await api.delete(`/channels/${channelId}`);
    }

    async joinChannel(channelId) {
        const response = await api.post(`/channels/${channelId}/join`);
        return response.data;
    }

    async leaveChannel(channelId) {
        const response = await api.post(`/channels/${channelId}/leave`);
        return response.data;
    }
}

const channelService = new ChannelService();
export default channelService;
