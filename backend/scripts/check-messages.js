import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkMessages() {
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*');
        
        if (error) throw error;
        
        // Group messages by type
        const messagesByType = messages.reduce((acc, msg) => {
            const type = msg.type || 'unknown';
            acc[type] = acc[type] || [];
            acc[type].push(msg);
            return acc;
        }, {});
        
        console.log('\nMessage Statistics:');
        console.log('-------------------');
        console.log('Total messages:', messages.length);
        Object.entries(messagesByType).forEach(([type, msgs]) => {
            console.log(`${type} messages:`, msgs.length);
        });
        
        if (messages.length > 0) {
            Object.entries(messagesByType).forEach(([type, msgs]) => {
                console.log(`\n${type.toUpperCase()} Messages:`);
                msgs.forEach(m => {
                    console.log(`- [${m.id}] Content: ${m.content.substring(0, 100)}...`);
                });
            });
        } else {
            console.log('\nNo messages found in the database!');
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkMessages(); 