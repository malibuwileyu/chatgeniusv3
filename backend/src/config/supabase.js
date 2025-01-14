/**
 * @file supabase.js
 * @description Configures and exports the Supabase client for database operations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Service Key');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Export the client
export { supabase }; 