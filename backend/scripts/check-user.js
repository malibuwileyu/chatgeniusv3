import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkUser() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', process.env.TEST_USER_EMAIL)
        .single();

    if (error) {
        console.error('Error checking user:', error);
        return;
    }

    if (!data) {
        console.log('Test user not found. Creating...');
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                email: process.env.TEST_USER_EMAIL,
                password: process.env.TEST_USER_PASSWORD,
                username: 'testuser1'
            }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating user:', createError);
            return;
        }

        console.log('Test user created:', newUser);
    } else {
        console.log('Test user exists:', data);
    }
}

checkUser().catch(console.error); 