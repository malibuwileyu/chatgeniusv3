import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: {
            getItem: (key) => {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            },
            setItem: (key, value) => {
                localStorage.setItem(key, JSON.stringify(value));
                // Also set the token in localStorage for other parts of the app
                if (key === 'sb-access-token') {
                    localStorage.setItem('token', value);
                }
            },
            removeItem: (key) => {
                localStorage.removeItem(key);
                if (key === 'sb-access-token') {
                    localStorage.removeItem('token');
                }
            }
        }
    }
}); 