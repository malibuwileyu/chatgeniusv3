/**
 * @file ragService.js
 * @description Service for handling RAG (Retrieval Augmented Generation) operations
 */

import { supabase } from '../config/supabase.js';

class RAGService {
    constructor() {
        this.embeddingStatus = {
            isComplete: false,
            processedMessages: 0,
            totalMessages: 0,
            error: null
        };
    }

    /**
     * Fetches messages from the database for embedding
     * @param {Object} options Options for fetching messages
     * @param {number} options.offset Offset for pagination
     * @param {number} options.limit Maximum number of messages to fetch
     * @returns {Promise<Array>} Array of messages with their metadata
     */
    async fetchMessagesForEmbedding(options = { offset: 0, limit: 100 }) {
        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    content,
                    created_at,
                    type,
                    sender:users!sender_id (
                        id,
                        username
                    )
                `)
                .neq('type', 'system')
                .order('created_at', { ascending: true })
                .range(options.offset, options.offset + options.limit - 1);

            if (error) {
                console.error('Error fetching messages:', error);
                throw error;
            }

            if (!messages || messages.length === 0) {
                return [];
            }

            // Transform messages into the format needed for embedding
            return messages
                .filter(msg => msg && msg.content && msg.sender)
                .map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    metadata: {
                        sender_id: msg.sender.id,
                        sender_username: msg.sender.username,
                        created_at: msg.created_at,
                        type: msg.type
                    }
                }));
        } catch (error) {
            console.error('Error in fetchMessagesForEmbedding:', error);
            throw error;
        }
    }
}

export default new RAGService(); 