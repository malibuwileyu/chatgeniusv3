/**
 * @file supabase.js
 * @description Supabase client configuration file that initializes and exports the Supabase
 * client instance for database operations. This file handles the connection setup with
 * Supabase using environment variables for authentication.
 * 
 * Features:
 * - Supabase client initialization
 * - Environment variable validation
 * - Error handling for missing credentials
 * 
 * Dependencies:
 * - @supabase/supabase-js
 * - dotenv
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase; 