/**
 * @file aiHandler.js
 * @description API endpoint that processes messages and generates AI responses when triggered by Supabase Edge Functions
 */

import { createClient } from '@supabase/supabase-js';
import ragService from '../../services/ragService.js';
import OpenAI from 'openai';

// Initialize clients
let supabase;
let openai;
try {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
} catch (error) {
    console.error('Failed to initialize clients:', error);
    throw error; // Critical error - can't proceed without clients
}

async function generateAIResponse(query, context = null, channelContext = null) {
    console.log('Generating AI response:', {
        queryLength: query.length,
        hasContext: !!context,
        channelContext,
        timestamp: new Date().toISOString()
    });

    try {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid query provided to generateAIResponse');
        }

        let messages = [
            {
                role: "system",
                content: channelContext 
                    ? "You are a helpful AI assistant with access to this channel's message history. Answer questions about the channel's content and discussions clearly and concisely."
                    : "You are a helpful AI assistant. Answer the user's question clearly and concisely."
            }
        ];

        if (context) {
            messages.push({
                role: "user",
                content: `Use this context from the channel's history to help answer the question:\n\n${context}\n\nQuestion: ${query}`
            });
        } else {
            messages.push({
                role: "user",
                content: query
            });
        }

        console.log('Sending request to OpenAI:', {
            model: "gpt-3.5-turbo",
            messageCount: messages.length,
            timestamp: new Date().toISOString()
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        });

        if (!completion.choices || completion.choices.length === 0) {
            throw new Error('OpenAI returned empty response');
        }

        console.log('Received response from OpenAI:', {
            responseLength: completion.choices[0].message.content.length,
            timestamp: new Date().toISOString()
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error in generateAIResponse:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Provide more specific error messages based on the error type
        if (error.code === 'insufficient_quota') {
            return "I apologize, but I'm currently unable to process requests due to API limits. Please try again later.";
        } else if (error.code === 'context_length_exceeded') {
            return "I apologize, but the provided context is too long for me to process. Please try asking about a more specific topic.";
        } else if (error.code === 'rate_limit_exceeded') {
            return "I apologize, but I'm receiving too many requests right now. Please try again in a moment.";
        }

        return "I apologize, but I'm having trouble generating a response right now. Please try again later.";
    }
}

export default async function handler(req, res) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    console.log('Received webhook request:', {
        requestId,
        method: req.method,
        headers: {
            'content-type': req.headers['content-type'],
            'x-webhook-secret': req.headers['x-webhook-secret'] ? '[PRESENT]' : '[MISSING]'
        },
        timestamp: new Date().toISOString()
    });

    // Only allow POST requests
    if (req.method !== 'POST') {
        console.warn('Invalid method:', {
            requestId,
            method: req.method,
            timestamp: new Date().toISOString()
        });
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify the request is from Supabase
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (!webhookSecret || req.headers['x-webhook-secret'] !== webhookSecret) {
        console.warn('Unauthorized request:', {
            requestId,
            hasSecret: !!webhookSecret,
            timestamp: new Date().toISOString()
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const message = req.body.record;
        if (!message || !message.content) {
            throw new Error('Invalid message data received');
        }

        console.log('Processing message:', {
            requestId,
            messageId: message.id,
            contentLength: message.content.length,
            channelId: message.channel_id || '[NONE]',
            dmId: message.dm_id || '[NONE]',
            timestamp: new Date().toISOString()
        });

        // Check if message starts with @AI
        if (message.content.trim().toLowerCase().startsWith('@ai')) {
            console.log('AI query detected:', {
                requestId,
                messageId: message.id,
                timestamp: new Date().toISOString()
            });

            // Strip @AI prefix
            const query = message.content.replace(/^@ai\s*/i, '').trim();
            if (!query) {
                throw new Error('Empty query after stripping @AI prefix');
            }

            let aiResponse;
            try {
                // Get channel context if this is a channel message
                const channelContext = message.channel_id ? 'channel' : message.dm_id ? 'direct message' : null;
                
                // Try RAG first with channel filtering
                console.log('Initiating RAG search:', {
                    requestId,
                    channelContext,
                    timestamp: new Date().toISOString()
                });

                const response = await ragService.search(query, { 
                    topK: 5,
                    filter: message.channel_id 
                        ? { channel_id: message.channel_id }
                        : message.dm_id 
                            ? { dm_id: message.dm_id }
                            : null
                });

                console.log('RAG search completed:', {
                    requestId,
                    success: response.success,
                    resultCount: response.results?.length || 0,
                    timestamp: new Date().toISOString()
                });

                // Only use RAG results if we have a valid successful response with results
                if (response && 
                    typeof response === 'object' && 
                    response.success === true && 
                    Array.isArray(response.results) && 
                    response.results.length > 0) {
                    
                    // We have relevant context from RAG
                    console.log('Using RAG context for response:', {
                        requestId,
                        contextSize: response.results.length,
                        timestamp: new Date().toISOString()
                    });

                    const context = response.results
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3)
                        .map(r => r.content)
                        .join('\n\n');
                    
                    aiResponse = await generateAIResponse(query, context, channelContext);
                } else {
                    // No relevant context or invalid response, use base knowledge
                    console.log('No valid RAG results, using base knowledge:', {
                        requestId,
                        timestamp: new Date().toISOString()
                    });
                    aiResponse = await generateAIResponse(query, null, channelContext);
                }
            } catch (error) {
                console.error('Error in RAG process:', {
                    requestId,
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                // Any error in RAG process, fall back to base knowledge
                aiResponse = await generateAIResponse(query, null, channelContext);
            }

            if (!aiResponse) {
                console.warn('No AI response generated:', {
                    requestId,
                    timestamp: new Date().toISOString()
                });
                aiResponse = "I apologize, but I'm having trouble processing your request right now. Please try again later.";
            }

            // Insert AI's response
            console.log('Inserting AI response:', {
                requestId,
                responseLength: aiResponse.length,
                timestamp: new Date().toISOString()
            });

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
                console.error('Error inserting AI response:', {
                    requestId,
                    error: responseError,
                    timestamp: new Date().toISOString()
                });
                return res.status(500).json({ error: 'Failed to insert AI response' });
            }

            const processingTime = Date.now() - startTime;
            console.log('Request completed successfully:', {
                requestId,
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            });

            return res.status(200).json({ 
                success: true, 
                message: 'AI response generated and inserted',
                processingTimeMs: processingTime
            });
        }

        // If message doesn't start with @AI, just return success
        console.log('Message processed (no AI response needed):', {
            requestId,
            timestamp: new Date().toISOString()
        });
        return res.status(200).json({ success: true, message: 'Message processed (no AI response needed)' });
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('Error handling message:', {
            requestId,
            error: error.message,
            stack: error.stack,
            processingTimeMs: processingTime,
            timestamp: new Date().toISOString()
        });
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            processingTimeMs: processingTime
        });
    }
}