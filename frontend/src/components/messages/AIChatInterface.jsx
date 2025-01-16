import React, { useState } from 'react';
import api from '../../api/api';

function AIChatInterface({ channelId, dmId }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAskAI = async (query) => {
        try {
            setIsLoading(true);
            setError(null);

            // Call the RAG endpoint
            const { data } = await api.post('/rag/ask', { 
                query,
                channelId,
                dmId 
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to get AI response');
            }

            // Insert AI's response as a new message
            const { error: msgError } = await api.post('/messages', {
                content: data.answer,
                sender_id: '00000000-0000-0000-0000-000000000000',
                channel_id: channelId,
                dm_id: dmId,
                type: 'system'
            });

            if (msgError) throw msgError;

        } catch (err) {
            setError('Failed to get AI response. Please try again.');
            console.error('AI chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        askAI: handleAskAI
    };
}

export default AIChatInterface; 