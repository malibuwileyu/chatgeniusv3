/**
 * @file userService.js
 * @description User service that handles user management operations integrated with
 * Clerk authentication and Supabase database. This service manages user creation,
 * updates, and deletion while maintaining consistency between Clerk and Supabase.
 * 
 * Core Functionality:
 * - User CRUD operations
 * - Clerk integration
 * - Profile management
 * - User data synchronization
 * 
 * Features:
 * - Dual-system user management (Clerk + Supabase)
 * - Profile image handling
 * - User metadata management
 * - Error handling and validation
 * - Environment configuration
 * 
 * Dependencies:
 * - @supabase/supabase-js
 * - @clerk/express
 * - dotenv
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const AI_USER_ID = '00000000-0000-0000-0000-000000000000';
const WELCOME_MESSAGE = `Hi! I'm your ChatGenius AI assistant. I can help you with:
- Answering questions about past conversations
- Drafting messages based on context
- Providing summaries of discussions

Feel free to ask me anything! I'll use my knowledge of your chat history to provide relevant and helpful responses.`;

class UserService {
    async createUser({ id, username, firstName, lastName, imageUrl }) {
        try {
            // Check if user exists in both Clerk and our database
            let clerkUser;
            try {
                clerkUser = await clerkClient.users.getUser(id);
            } catch (error) {
                // Create Clerk user if doesn't exist
                clerkUser = await clerkClient.users.createUser({
                    externalId: id,
                    username,
                    firstName,
                    lastName,
                    imageUrl
                });
            }

            // Check if user exists in our database
            const { data: existingUser } = await supabase
                .from('users')
                .select()
                .eq('id', id)
                .limit(1)
                .single();

            if (existingUser) {
                console.log('User already exists:', existingUser);
                return existingUser;
            }

            // Create new user in our database
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([{
                    id,
                    username: username || `user_${id.slice(0, 8)}`,
                    first_name: firstName,
                    last_name: lastName,
                    avatar_url: imageUrl,
                    status: 'active'
                }])
                .select()
                .limit(1)
                .single();

            if (error) throw error;

            // Create DM with AI user
            const { data: dm, error: dmError } = await supabase
                .from('direct_messages')
                .insert({
                    member_ids: [id, AI_USER_ID],
                    created_by: AI_USER_ID
                })
                .select()
                .single();

            if (dmError) throw dmError;

            // Send welcome message
            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    sender_id: AI_USER_ID,
                    content: WELCOME_MESSAGE,
                    dm_id: dm.id,
                    type: 'system'
                });

            if (msgError) throw msgError;

            return newUser;
        } catch (error) {
            console.error('Error in createUser:', error);
            throw error;
        }
    }

    async updateUser(id, updates) {
        // Update user in Clerk
        await clerkClient.users.updateUser(id, {
            firstName: updates.first_name,
            lastName: updates.last_name,
            imageUrl: updates.avatar_url
        });

        // Update user in our database
        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .limit(1)
            .single();

        if (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }

        return user;
    }

    async deleteUser(id) {
        // Delete user from Clerk
        await clerkClient.users.deleteUser(id);

        // Delete user from our database
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }
}

export default new UserService();