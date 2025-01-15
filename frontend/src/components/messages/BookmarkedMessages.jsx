/**
 * @file BookmarkedMessages.jsx
 * @description Bookmarked messages modal component that displays user's saved messages.
 * This component provides a centralized view of all bookmarked messages with rich
 * formatting and interaction capabilities.
 * 
 * Core Functionality:
 * - Bookmarked message display
 * - Message formatting
 * - Loading state management
 * - Modal control
 * 
 * Features:
 * - Rich message formatting
 * - Loading indicators
 * - Empty state handling
 * - Modal visibility control
 * - Timestamp display
 * - Channel context
 * - Responsive design
 * 
 * Props:
 * - isOpen: Boolean to control modal visibility
 * - onClose: Function to handle modal close
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ../../services/bookmarkService
 * - ./FormattedMessage
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import bookmarkService from '../../services/bookmarkService';
import FormattedMessage from './FormattedMessage';
import { formatDistanceToNow } from 'date-fns';

function BookmarkedMessages({ isOpen, onClose }) {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBookmarks = async () => {
            if (!isOpen) return;
            try {
                setLoading(true);
                const data = await bookmarkService.getBookmarks();
                setBookmarks(data);
            } catch (error) {
                console.error('Error loading bookmarks:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBookmarks();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
                <div className="relative bg-[#1a1a1a] rounded-lg w-full max-w-2xl">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Bookmarked Messages</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="text-center py-4 text-gray-400">Loading...</div>
                            ) : bookmarks.length === 0 ? (
                                <div className="text-center py-4 text-gray-400">No bookmarked messages</div>
                            ) : (
                                <div className="space-y-4">
                                    {bookmarks.map((bookmark) => (
                                        <div key={bookmark.id} className="p-4 rounded-lg border border-gray-700 hover:bg-gray-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-white font-medium">{bookmark.username}</span>
                                                    <span className="text-gray-400 text-sm">
                                                        {formatDistanceToNow(new Date(bookmark.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveBookmark(bookmark.id)}
                                                    className="text-gray-400 hover:text-red-400"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="text-white">
                                                <FormattedMessage content={bookmark.content} />
                                            </div>
                                            {bookmark.channel_name && (
                                                <div className="mt-2 text-sm text-gray-400">
                                                    in #{bookmark.channel_name}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

BookmarkedMessages.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default BookmarkedMessages;