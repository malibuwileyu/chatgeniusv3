import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

const AI_USER_ID = '00000000-0000-0000-0000-000000000000';

function ChannelSettings({ channel, onClose }) {
    const [allowAI, setAllowAI] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if AI is a member on component mount
    useEffect(() => {
        const checkAIMembership = async () => {
            try {
                const { data, error } = await supabase
                    .from('channels')
                    .select('member_ids')
                    .eq('id', channel.id)
                    .single();

                if (error) throw error;
                setAllowAI(data.member_ids?.includes(AI_USER_ID) || false);
            } catch (err) {
                console.error('Error checking AI membership:', err);
                setError('Failed to check AI status');
            } finally {
                setIsLoading(false);
            }
        };

        checkAIMembership();
    }, [channel.id]);

    const handleAIToggle = async (e) => {
        const checked = e.target.checked;
        setIsLoading(true);
        setError(null);

        try {
            // Get current member_ids
            const { data: currentData, error: fetchError } = await supabase
                .from('channels')
                .select('member_ids')
                .eq('id', channel.id)
                .single();

            if (fetchError) throw fetchError;

            let newMemberIds = [...(currentData.member_ids || [])];
            if (checked && !newMemberIds.includes(AI_USER_ID)) {
                newMemberIds.push(AI_USER_ID);
            } else if (!checked && newMemberIds.includes(AI_USER_ID)) {
                newMemberIds = newMemberIds.filter(id => id !== AI_USER_ID);
            }

            // Update channel members
            const { error: updateError } = await supabase
                .from('channels')
                .update({ member_ids: newMemberIds })
                .eq('id', channel.id);

            if (updateError) throw updateError;

            // If AI was added, send a welcome message
            if (checked && !currentData.member_ids?.includes(AI_USER_ID)) {
                const welcomeMsg = `Hello! I'm the AI assistant. I can help answer questions about past discussions in this channel. Just start your message with "@AI" to ask me anything!`;
                
                const { error: msgError } = await supabase
                    .from('messages')
                    .insert({
                        channel_id: channel.id,
                        sender_id: AI_USER_ID,
                        content: welcomeMsg,
                        type: 'user'
                    });

                if (msgError) throw msgError;
            }

            setAllowAI(checked);
        } catch (err) {
            console.error('Error toggling AI access:', err);
            setError('Failed to update AI access');
            setAllowAI(!checked); // Revert the toggle
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Channel Settings</h2>
            
            <div className="mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={allowAI}
                            onChange={handleAIToggle}
                            disabled={isLoading}
                            className="form-checkbox h-5 w-5 text-blue-600 transition-all duration-150 ease-in-out"
                        />
                        {isLoading && (
                            <div className="absolute inset-0 bg-gray-200 opacity-50 rounded"></div>
                        )}
                    </div>
                    <span className="select-none">Enable AI Assistant</span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                    When enabled, you can ask the AI questions about channel discussions by starting your message with "@AI".
                </p>
                {error && (
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
            </div>

            <div className="mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

export default ChannelSettings; 