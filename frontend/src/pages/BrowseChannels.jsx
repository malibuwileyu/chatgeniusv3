/**
 * @file BrowseChannels.jsx
 * @description Channel browsing page component that displays a list of available
 * public channels and allows users to join them. This component provides a clean
 * interface for discovering and joining chat channels.
 * 
 * Core Functionality:
 * - Channel listing
 * - Channel joining
 * - Loading state management
 * - Error handling
 * 
 * Features:
 * - Public channel discovery
 * - One-click channel joining
 * - Loading indicators
 * - Error state handling
 * - Automatic navigation
 * - Channel metadata display
 * 
 * Dependencies:
 * - react
 * - react-router-dom
 * - ../services/channelService
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import channelService from '../services/channelService';

function BrowseChannels() {
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadChannels();
    }, []);

    const loadChannels = async () => {
        try {
            setIsLoading(true);
            const channelList = await channelService.getPublicChannels();
            setChannels(channelList);
        } catch (error) {
            setError('Error loading channels');
            console.error('Error loading channels:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinChannel = async (channelId) => {
        try {
            await channelService.joinChannel(channelId);
            navigate(`/chat?channel=${channelId}`);
        } catch (error) {
            console.error('Error joining channel:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-600">Loading channels...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">Browse Channels</h1>
                    <Link
                        to="/"
                        className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Back to Chat
                    </Link>
                </div>
                <div className="mt-8">
                    {channels.length === 0 ? (
                        <div className="text-center py-8 bg-[#1a1a1a] rounded-lg">
                            <p className="text-white">No public channels available</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow rounded-lg">
                            <ul className="divide-y divide-gray-200">
                                {channels.map((channel) => (
                                    <li key={channel.id} className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    # {channel.name}
                                                </h3>
                                                {channel.description && (
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {channel.description}
                                                    </p>
                                                )}
                                                <div className="mt-2 text-sm text-gray-500">
                                                    Created by {channel.creator?.username || 'Unknown'}
                                                    {channel.members_count && (
                                                        <span className="ml-4">
                                                            {channel.members_count} members
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleJoinChannel(channel.id)}
                                                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Join Channel
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BrowseChannels;
