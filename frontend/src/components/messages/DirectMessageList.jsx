/**
 * @file DirectMessageList.jsx
 * @description Direct message list component that manages and displays user's direct
 * message conversations. This component provides functionality for creating and
 * managing direct message channels with other users.
 * 
 * Core Functionality:
 * - DM list display
 * - DM creation
 * - User selection
 * - Real-time updates
 * 
 * Features:
 * - Create new DMs
 * - User search/selection
 * - Real-time DM updates
 * - Multi-user DM support
 * - System message integration
 * - Error handling
 * - Loading states
 * - Empty state handling
 * - Responsive design
 * 
 * Props:
 * - onDMSelect: Function to handle DM selection
 * - selectedDMId: Currently selected DM ID
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ../supabaseClient
 * - ../services/auth
 * - ../services/messageService
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../../supabaseClient';
import { getUser } from '../../services/authService';
import messageService from '../../services/messageService';

function DirectMessageList({ onDMSelect, selectedDMId }) {
    const [directMessages, setDirectMessages] = useState([]);
    const [showCreateDM, setShowCreateDM] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const currentUser = getUser();

    useEffect(() => {
        if (!currentUser?.id) {
            console.log('No current user ID, skipping DM subscription');
            return;
        }

        console.log('Loading DMs for user:', currentUser.id);
        loadDirectMessages();

        // Subscribe to changes in direct_message_members table
        const channel = supabase
            .channel(`direct-messages-${currentUser.id}`)
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'direct_message_members',
                    filter: `user_id=eq.${currentUser.id}`
                },
                (payload) => {
                    console.log('DM member event:', payload);
                    loadDirectMessages();
                }
            );

        // Subscribe with proper error handling
        channel.subscribe(async (status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to direct messages changes');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Channel subscription error:', err);
                // Only attempt to resubscribe if we still have a valid user
                if (currentUser?.id) {
                    setTimeout(() => {
                        console.log('Attempting to resubscribe...');
                        channel.subscribe();
                    }, 5000);
                }
            } else if (status === 'TIMED_OUT') {
                console.error('Channel subscription timed out');
                // Only attempt to resubscribe if we still have a valid user
                if (currentUser?.id) {
                    channel.subscribe();
                }
            }
        });

        return () => {
            console.log('Cleaning up DM subscription');
            channel.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]); // Only re-run if the user ID changes

    const loadDirectMessages = async () => {
        try {
            // Get all DMs where the current user is a member
            const { data: myDMs, error: dmError } = await supabase
                .from('direct_message_members')
                .select('dm_id')
                .eq('user_id', currentUser.id);

            if (dmError) {
                console.error('Error loading DMs:', dmError);
                return;
            }

            // Get all participants for these DMs
            const dmIds = myDMs.map(dm => dm.dm_id);
            const { data: allMembers, error: membersError } = await supabase
                .from('direct_message_members')
                .select(`
                    dm_id,
                    user:user_id (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .in('dm_id', dmIds);

            if (membersError) {
                console.error('Error loading DM members:', membersError);
                return;
            }

            // Group members by DM
            const dmsMap = new Map();
            allMembers.forEach(member => {
                if (!dmsMap.has(member.dm_id)) {
                    dmsMap.set(member.dm_id, {
                        id: member.dm_id,
                        participants: []
                    });
                }
                dmsMap.get(member.dm_id).participants.push(member.user);
            });

            setDirectMessages(Array.from(dmsMap.values()));
        } catch (error) {
            console.error('Error in DM loading:', error);
        }
    };

    const loadAvailableUsers = async () => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, avatar_url')
                .neq('id', currentUser.id);

            if (error) {
                console.error('Error loading users:', error);
                return;
            }

            setAvailableUsers(users);
        } catch (error) {
            console.error('Error in users loading:', error);
        }
    };

    const handleCreateDMClick = () => {
        setShowCreateDM(true);
        loadAvailableUsers();
    };

    const handleUserSelect = (user) => {
        setSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === user.id);
            if (isSelected) {
                return prev.filter(u => u.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };

    const handleCreateDM = async () => {
        if (selectedUsers.length === 0) return;

        try {
            // Create the DM
            const { data: dm, error: dmError } = await supabase
                .from('direct_messages')
                .insert({})
                .select()
                .limit(1)
                .single();

            if (dmError) {
                console.error('Error creating DM:', dmError);
                return;
            }

            // Add all members to the DM
            const members = [currentUser, ...selectedUsers].map(user => ({
                dm_id: dm.id,
                user_id: user.id
            }));

            const { error: membersError } = await supabase
                .from('direct_message_members')
                .insert(members);

            if (membersError) {
                console.error('Error adding DM members:', membersError);
                return;
            }

            // Send system message about DM creation
            const systemMessage = {
                content: 'A Direct Message has been created',
                dm_id: dm.id,
                is_system_message: true
            };

            await messageService.sendMessage(systemMessage);

            setShowCreateDM(false);
            setSelectedUsers([]);
            loadDirectMessages();
            onDMSelect(dm.id);
        } catch (error) {
            console.error('Error in DM creation:', error);
        }
    };

    const getDMName = (dm) => {
        const otherParticipants = dm.participants
            .filter(p => p.id !== currentUser.id)
            .map(p => p.username)
            .sort((a, b) => a.localeCompare(b));

        const joinedNames = otherParticipants.join(', ');
        if (joinedNames.length <= 20) {
            return joinedNames;
        }

        // Find the last complete name that fits within 20 characters
        let truncatedText = '';
        let nameCount = 0;
        for (const name of otherParticipants) {
            if ((truncatedText + name + ', ').length > 17) { // 17 to leave room for "..."
                break;
            }
            truncatedText += (nameCount > 0 ? ', ' : '') + name;
            nameCount++;
        }

        return truncatedText + '...';
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Direct Messages
                </h3>
                <button
                    onClick={handleCreateDMClick}
                    className="text-sm text-white hover:text-gray-200 bg-[#1a1a1a] hover:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center"
                >
                    +
                </button>
            </div>

            {/* DM List */}
            <div className="space-y-1 min-h-[50px]">
                {directMessages.map((dm) => (
                    <button
                        key={dm.id}
                        onClick={() => onDMSelect(dm.id)}
                        className={`w-full text-left px-4 py-2 rounded-md text-sm flex items-center ${selectedDMId === dm.id
                            ? 'bg-blue-100 text-blue-900'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <span className="mr-2">🗨️</span>
                        {getDMName(dm)}
                    </button>
                ))}
                {directMessages.length === 0 && (
                    <div className="text-sm text-gray-500 italic px-4 py-2">
                        No direct messages yet
                    </div>
                )}
            </div>

            {/* Create DM Modal */}
            {showCreateDM && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Create Direct Message</h3>
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedUsers.map(user => (
                                    <span
                                        key={user.id}
                                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
                                    >
                                        {user.username}
                                        <button
                                            onClick={() => handleUserSelect(user)}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="max-h-60 overflow-y-auto border rounded">
                                {availableUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleUserSelect(user)}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedUsers.some(u => u.id === user.id)
                                            ? 'bg-blue-50'
                                            : ''
                                            }`}
                                    >
                                        {user.username}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => {
                                    setShowCreateDM(false);
                                    setSelectedUsers([]);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateDM}
                                disabled={selectedUsers.length === 0}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

DirectMessageList.propTypes = {
    onDMSelect: PropTypes.func.isRequired,
    selectedDMId: PropTypes.string
};

export default DirectMessageList; 