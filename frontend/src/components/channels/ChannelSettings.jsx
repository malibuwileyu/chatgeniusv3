import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

const AI_USER_ID = '00000000-0000-0000-0000-000000000000';

function ChannelSettings({ channel, onClose }) {
    const [allowAI, setAllowAI] = useState(channel?.member_ids?.includes(AI_USER_ID));

    const handleAIToggle = async (e) => {
        const checked = e.target.checked;
        try {
            let newMemberIds = [...channel.member_ids];
            if (checked && !newMemberIds.includes(AI_USER_ID)) {
                newMemberIds.push(AI_USER_ID);
            } else if (!checked && newMemberIds.includes(AI_USER_ID)) {
                newMemberIds = newMemberIds.filter(id => id !== AI_USER_ID);
            }

            const { error } = await supabase
                .from('channels')
                .update({ member_ids: newMemberIds })
                .eq('id', channel.id);

            if (error) throw error;

            // If AI was added, send a welcome message
            if (checked && !channel.member_ids.includes(AI_USER_ID)) {
                const welcomeMsg = `Hi! I'm ChatGenius AI. I'll be monitoring this channel and can help answer questions about past discussions. Just mention me (@ChatGenius AI) to get my attention!`;
                
                await supabase
                    .from('messages')
                    .insert({
                        channel_id: channel.id,
                        sender_id: AI_USER_ID,
                        content: welcomeMsg,
                        type: 'system'
                    });
            }

            setAllowAI(checked);
        } catch (error) {
            console.error('Error toggling AI access:', error);
            // Show error toast
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Channel Settings</h2>
            
            <div className="mb-4">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={allowAI}
                        onChange={handleAIToggle}
                        className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span>Allow AI Assistant</span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                    Enable the AI assistant to monitor and respond to messages in this channel.
                </p>
            </div>
        </div>
    );
}

export default ChannelSettings; 