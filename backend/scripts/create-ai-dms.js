/**
 * @file create-ai-dms.js
 * @description Script to create DM channels between users and the AI assistant
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const AI_USER_ID = '00000000-0000-0000-0000-000000000000';

const WELCOME_MESSAGE = `Hi! I'm your ChatGenius AI assistant. I can help you with:
- Answering questions about past conversations
- Drafting messages based on context
- Providing summaries of discussions

Feel free to ask me anything! I'll use my knowledge of your chat history to provide relevant and helpful responses.`;

async function createAIDMs() {
    try {
        console.log('Creating AI DMs for all users...');

        // Get all non-AI users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .neq('id', AI_USER_ID);

        if (userError) throw userError;

        console.log(`Found ${users.length} users to create DMs for`);

        for (const user of users) {
            // Check if DM already exists by checking direct_message_members
            const { data: existingDMs, error: dmError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('user_id', user.id);

            if (dmError) throw dmError;

            // For each DM this user is in, check if the AI is also a member
            let hasExistingDM = false;
            if (existingDMs && existingDMs.length > 0) {
                const dmIds = existingDMs.map(dm => dm.dm_id);
                const { data: aiMemberships, error: aiError } = await supabase
                    .from('direct_message_members')
                    .select('dm_id')
                    .eq('user_id', AI_USER_ID)
                    .in('dm_id', dmIds);

                if (aiError) throw aiError;
                hasExistingDM = aiMemberships && aiMemberships.length > 0;
            }

            if (hasExistingDM) {
                console.log(`DM already exists for user ${user.username}`);
                continue;
            }

            // Create new DM
            const { data: dm, error: createError } = await supabase
                .from('direct_messages')
                .insert({})
                .select()
                .single();

            if (createError) throw createError;

            // Add both users to direct_message_members
            const { error: membersError } = await supabase
                .from('direct_message_members')
                .insert([
                    { dm_id: dm.id, user_id: user.id },
                    { dm_id: dm.id, user_id: AI_USER_ID }
                ]);

            if (membersError) throw membersError;

            // Send welcome message
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    content: WELCOME_MESSAGE,
                    dm_id: dm.id,
                    type: 'system'  // System message type doesn't need sender_id
                });

            if (msgError) throw msgError;

            console.log(`Created DM and sent welcome message for user ${user.username}`);
        }

        console.log('Finished creating AI DMs');
    } catch (error) {
        console.error('Error creating AI DMs:', error);
        process.exit(1);
    }
}

createAIDMs().catch(console.error); 