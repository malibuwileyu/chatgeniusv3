/**
 * @file create-ai-user.js
 * @description Script to create the AI user for automated chat responses
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const AI_USER_ID = '00000000-0000-0000-0000-000000000000';

// Generate a random password hash for the AI user
function generatePasswordHash() {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('ai-password', salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

async function createAIUser() {
    try {
        console.log('Creating AI user...');

        // First check if AI user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', AI_USER_ID)
            .limit(1)
            .single();

        if (existingUser) {
            console.log('AI user already exists');
            return AI_USER_ID;
        }

        // Create the AI user
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: AI_USER_ID,
                username: 'ChatGenius AI',
                email: 'ai@chatgenius.local',
                avatar_url: '/ai-avatar.png', // Default AI avatar
                password_hash: generatePasswordHash(),
                status: 'online', // AI is always online
                type: 'ai' // Custom type for AI user
            })
            .select()
            .limit(1)
            .single();

        if (userError) {
            throw new Error(`Failed to create AI user: ${userError.message}`);
        }

        console.log('Created AI user with ID:', user.id);
        console.log('Please ensure your .env file has:');
        console.log(`AI_USER_ID=${AI_USER_ID}`);

        return user.id;
    } catch (error) {
        console.error('Error creating AI user:', error);
        process.exit(1);
    }
}

createAIUser().catch(console.error); 