import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { getUser } from '../../services/authService';
import api from '../../api/api';

function MessageInput({ channelId, dmId }) {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const currentUser = getUser();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            // Check if this is a query for the AI (starts with @AI or similar trigger)
            const isAIQuery = message.trim().toLowerCase().startsWith('@ai');
            
            if (isAIQuery) {
                // Strip the @AI prefix and send to AI
                const query = message.replace(/^@ai\s*/i, '').trim();
                
                console.log('Sending AI query:', query);
                
                // First insert the user's query as a message
                const { error: queryError } = await supabase
                    .from('messages')
                    .insert({
                        content: message,
                        channel_id: channelId,
                        dm_id: dmId,
                        type: 'user',
                        sender_id: currentUser.id
                    });

                if (queryError) throw queryError;

                // Send to AI endpoint
                console.log('Making API call to /rag/ask');
                const { data } = await api.post('/rag/ask', { query });
                console.log('AI response:', data);

                if (!data?.answer) {
                    throw new Error('No response received from AI');
                }

                // Insert AI's response as a system message
                const { error: responseError } = await supabase
                    .from('messages')
                    .insert({
                        content: data.answer,
                        channel_id: channelId,
                        dm_id: dmId,
                        type: 'system'
                    });

                if (responseError) throw responseError;
            } else {
                // Regular message handling
                const { error: msgError } = await supabase
                    .from('messages')
                    .insert({
                        content: message,
                        channel_id: channelId,
                        dm_id: dmId,
                        type: 'user',
                        sender_id: currentUser.id
                    });

                if (msgError) throw msgError;
            }

            setMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 border-t">
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <form onSubmit={handleSubmit} className="flex items-center">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isLoading ? "AI is thinking..." : "Type a message... (Use @AI to ask the AI)"}
                    disabled={isLoading}
                    className="flex-1 p-2 border rounded-lg mr-2"
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !message.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

export default MessageInput; 