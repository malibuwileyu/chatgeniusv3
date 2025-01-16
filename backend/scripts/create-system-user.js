/**
 * @file create-system-user.js
 * @description Script to create the system user for automated operations
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// Generate a random password hash for the system user
function generatePasswordHash() {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('system-password', salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

async function createSystemUser() {
    try {
        console.log('Creating system user...');

        // First check if system user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', SYSTEM_USER_ID)
            .limit(1)
            .single();

        if (existingUser) {
            console.log('System user already exists');
            return SYSTEM_USER_ID;
        }

        // Create the system user
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: SYSTEM_USER_ID,
                username: 'system',
                email: 'system@chatgenius.local',
                avatar_url: null,
                password_hash: generatePasswordHash()
            })
            .select()
            .limit(1)
            .single();

        if (userError) {
            throw new Error(`Failed to create system user: ${userError.message}`);
        }

        console.log('Created system user with ID:', user.id);
        console.log('Please ensure your .env file has:');
        console.log(`SYSTEM_USER_ID=${SYSTEM_USER_ID}`);

        return user.id;
    } catch (error) {
        console.error('Error creating system user:', error);
        process.exit(1);
    }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    createSystemUser().catch(error => {
        console.error('Failed to create system user:', error);
        process.exit(1);
    });
}

export default createSystemUser; 