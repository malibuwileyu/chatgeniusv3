/**
 * @file messageListenerService.js
 * @description Service that listens for new messages and triggers AI responses when needed
 */

import { createClient } from '@supabase/supabase-js';
import ragService from './ragService.js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class MessageListenerService {
    constructor() {
        this.setupMessageListener();
    }

    setupMessageListener() {
        const channel = supabase
            .channel('message-changes')
            .on('postgres_changes', 
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                this.handleNewMessage.bind(this)
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Listening for new messages...');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Channel subscription error:', err);
                }
            });
    }

    async generateAIResponse(query, context = null) {
        try {
            let messages = [
                {
                    role: "system",
                    content: "You are a helpful AI assistant. Answer the user's question clearly and concisely."
                }
            ];

            if (context) {
                messages.push({
                    role: "user",
                    content: `Use this context to help answer the question:\n\n${context}\n\nQuestion: ${query}`
                });
            } else {
                messages.push({
                    role: "user",
                    content: query
                });
            }

            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Error generating AI response:', error);
            return "I apologize, but I'm having trouble generating a response right now. Please try again later.";
        }
    }

    async handleNewMessage(payload) {
        try {
            console.log('New message received:', payload);
            
            const message = payload.new;
            if (!message || !message.content) return;

            // Check if message starts with @AI
            if (message.content.trim().toLowerCase().startsWith('@ai')) {
                console.log('AI query detected:', message.content);

                // Strip @AI prefix
                const query = message.content.replace(/^@ai\s*/i, '').trim();
                let aiResponse;

                try {
                    // Try RAG first
                    const response = await ragService.search(query);
                    console.log('RAG response:', response);

                    // Only use RAG results if we have a valid successful response with results
                    if (response && 
                        typeof response === 'object' && 
                        response.success === true && 
                        Array.isArray(response.results) && 
                        response.results.length > 0) {
                        
                        // We have relevant context from RAG
                        console.log('Using RAG context for response');
                        const context = response.results
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 3)
                            .map(r => r.content)
                            .join('\n\n');
                        
                        aiResponse = await this.generateAIResponse(query, context);
                    } else {
                        // No relevant context or invalid response, use base knowledge
                        console.log('No valid RAG results, using base knowledge');
                        aiResponse = await this.generateAIResponse(query);
                    }
                } catch (error) {
                    // Any error in RAG process, fall back to base knowledge
                    console.log('Error in RAG process, falling back to base knowledge:', error.message);
                    aiResponse = await this.generateAIResponse(query);
                }

                if (!aiResponse) {
                    console.log('No AI response generated, using fallback message');
                    aiResponse = "I apologize, but I'm having trouble processing your request right now. Please try again later.";
                }

                // Insert AI's response
                const { error: responseError } = await supabase
                    .from('messages')
                    .insert({
                        content: aiResponse,
                        channel_id: message.channel_id,
                        dm_id: message.dm_id,
                        type: 'user',
                        sender_id: '00000000-0000-0000-0000-000000000000' // AI user ID
                    });

                if (responseError) {
                    console.error('Error inserting AI response:', responseError);
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
}

// Create and export a singleton instance
export default new MessageListenerService(); 