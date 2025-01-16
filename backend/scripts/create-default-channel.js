/**
 * @file create-default-channel.js
 * @description Script to create a default channel for document imports
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createDefaultChannel() {
    try {
        console.log('Creating default channel for document imports...');

        // First check if default channel already exists
        const { data: existingChannel, error: checkError } = await supabase
            .from('channels')
            .select('id')
            .eq('name', 'documents')
            .limit(1)
            .single();

        if (existingChannel) {
            console.log('Default channel already exists with ID:', existingChannel.id);
            // Update environment variable if needed
            if (process.env.DEFAULT_CHANNEL_ID !== existingChannel.id) {
                console.log('Please update your .env file with:');
                console.log(`DEFAULT_CHANNEL_ID=${existingChannel.id}`);
            }
            return existingChannel.id;
        }

        // Create the channel
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .insert({
                name: 'documents',
                description: 'Channel for imported documents',
                is_private: false,
                created_by: process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .limit(1)
            .single();

        if (channelError) {
            throw new Error(`Failed to create channel: ${channelError.message}`);
        }

        console.log('Created default channel with ID:', channel.id);
        console.log('Please update your .env file with:');
        console.log(`DEFAULT_CHANNEL_ID=${channel.id}`);

        // Add system user as member
        const { error: memberError } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channel.id,
                user_id: process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000',
                role: 'owner'
            });

        if (memberError) {
            throw new Error(`Failed to add system user as member: ${memberError.message}`);
        }

        // Create welcome message
        const { error: messageError } = await supabase
            .from('messages')
            .insert({
                content: 'Welcome to the documents channel. This channel contains imported documents that can be searched and referenced.',
                channel_id: channel.id,
                type: 'system',
                sender_id: process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000',
                dm_id: null // Explicitly set dm_id to null to satisfy check constraint
            });

        if (messageError) {
            throw new Error(`Failed to create welcome message: ${messageError.message}`);
        }

        return channel.id;
    } catch (error) {
        console.error('Error creating default channel:', error);
        process.exit(1);
    }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    createDefaultChannel().catch(error => {
        console.error('Failed to create default channel:', error);
        process.exit(1);
    });
}

export default createDefaultChannel; 