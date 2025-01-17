/**
 * @file aiHandler.js
 * @description API endpoint that processes messages and generates AI responses when triggered by Supabase Edge Functions
 */

import { createClient } from '@supabase/supabase-js';
import ragService from '../../services/ragService.js';
import OpenAI from 'openai';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateAIResponse(query, context = null) {
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

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify the request is from Supabase
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (!webhookSecret || req.headers['x-webhook-secret'] !== webhookSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const message = req.body.record;
        if (!message || !message.content) {
            return res.status(400).json({ error: 'Invalid message data' });
        }

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
                    
                    aiResponse = await generateAIResponse(query, context);
                } else {
                    // No relevant context or invalid response, use base knowledge
                    console.log('No valid RAG results, using base knowledge');
                    aiResponse = await generateAIResponse(query);
                }
            } catch (error) {
                // Any error in RAG process, fall back to base knowledge
                console.log('Error in RAG process, falling back to base knowledge:', error.message);
                aiResponse = await generateAIResponse(query);
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
                return res.status(500).json({ error: 'Failed to insert AI response' });
            }

            return res.status(200).json({ success: true, message: 'AI response generated and inserted' });
        }

        // If message doesn't start with @AI, just return success
        return res.status(200).json({ success: true, message: 'Message processed (no AI response needed)' });
    } catch (error) {
        console.error('Error handling message:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}