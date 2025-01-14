/**
 * @file supabaseClient.js
 * @description Supabase client configuration and initialization for the frontend
 * application. This file sets up the Supabase client with realtime capabilities
 * and authentication configuration.
 * 
 * Core Functionality:
 * - Supabase client initialization
 * - Realtime subscription configuration
 * - Authentication setup
 * 
 * Features:
 * - Realtime event handling
 * - Connection heartbeat monitoring
 * - Session persistence
 * - Token auto-refresh
 * - Configurable event throttling
 * 
 * Environment Variables:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * 
 * Dependencies:
 * - @supabase/supabase-js
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single Supabase client instance with realtime options
export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        params: {
            eventsPerSecond: 10
        },
        timeout: 30000, // Increase timeout to 30 seconds
        heartbeat: {
            interval: 15000, // Send heartbeat every 15 seconds
            maxRetries: 3    // Retry 3 times before considering connection dead
        }
    },
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Initialize realtime client
supabase.realtime.setAuth(supabaseKey);

export default supabase; 