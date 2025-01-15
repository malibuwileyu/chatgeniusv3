import { getToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const uploadFile = async (file, { channelId, dmId }, messageContent = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (channelId) {
        formData.append('channelId', channelId);
    }
    if (dmId) {
        formData.append('dmId', dmId);
    }
    if (messageContent) {
        formData.append('messageContent', messageContent);
    }

    const token = getToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Unauthorized: Please log in again');
        }
        const errorText = await response.text();
        try {
            const error = JSON.parse(errorText);
            throw new Error(JSON.stringify(error) || 'Error uploading file');
        } catch {
            throw new Error(errorText || 'Error uploading file');
        }
    }

    return response.json();
};

export default {
    uploadFile
};

