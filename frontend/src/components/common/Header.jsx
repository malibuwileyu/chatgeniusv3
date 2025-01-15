/**
 * @file Header.jsx
 * @description Application header component that provides navigation, search,
 * and user status management. This component serves as the main
 * navigation bar across the application.
 * 
 * Core Functionality:
 * - User status management
 * - Search functionality
 * - User authentication state
 * 
 * Features:
 * - Custom status setting
 * - Status color picker
 * - Auto status mode
 * - Search modal integration
 * - User menu dropdown
 * - Logout functionality
 * - Real-time status updates
 * 
 * Props:
 * - onLogout: Function to handle user logout
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ../../services/auth
 * - ../../services/userService
 * - ../channels/SearchModal
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getUser } from '../../services/authService';
import userService from '../../services/userService';
import SearchModal from '../channels/SearchModal';

function Header({ onLogout = () => { } }) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('offline');
    const [customStatus, setCustomStatus] = useState('');
    const [customStatusColor, setCustomStatusColor] = useState('#9333ea'); // Default purple
    const [isEditingCustomStatus, setIsEditingCustomStatus] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [hexInputValue, setHexInputValue] = useState('#9333ea');
    const [isAutoMode, setIsAutoMode] = useState(false);
    const customStatusInputRef = useRef(null);
    const cleanupAutoStatusRef = useRef(null);
    const currentUser = getUser();
    const statusMenuRef = useRef(null);

    const statusColors = [
        { name: 'green', hex: '#22c55e' },
        { name: 'yellow', hex: '#eab308' },
        { name: 'red', hex: '#ef4444' },
        { name: 'blue', hex: '#3b82f6' },
        { name: 'purple', hex: '#9333ea' },
        { name: 'pink', hex: '#ec4899' },
        { name: 'white', hex: '#ffffff' },
    ];

    useEffect(() => {
        const loadUserStatus = async () => {
            try {
                const userData = await userService.getUserStatus(currentUser.id);
                setCurrentStatus(userData.status);
                if (userData.status === 'auto') {
                    setIsAutoMode(true);
                    startAutoStatus();
                } else if (!['online', 'away', 'busy', 'offline'].includes(userData.status)) {
                    const [text, color] = userData.status.split('|');
                    setCustomStatus(text);
                    setCustomStatusColor(color || '#9333ea');
                }
            } catch (error) {
                console.error('Error loading user status:', error);
            }
        };

        loadUserStatus();

        return () => {
            if (cleanupAutoStatusRef.current) {
                cleanupAutoStatusRef.current();
            }
        };
    }, [currentUser.id]);

    const startAutoStatus = () => {
        if (cleanupAutoStatusRef.current) {
            cleanupAutoStatusRef.current();
        }

        cleanupAutoStatusRef.current = userService.startAutoStatus(async (newStatus) => {
            await handleStatusChange(newStatus, null, true);
        });
    };

    const handleStatusChange = async (status, color = null, skipAutoCheck = false) => {
        try {
            if (!skipAutoCheck && isAutoMode) {
                userService.stopAutoStatus();
                setIsAutoMode(false);
            }

            const statusToSave = color ? `${status}|${color}` : status;
            await userService.updateStatus(statusToSave);
            setCurrentStatus(statusToSave);

            // Only close the menu if it's not an auto-update
            if (!skipAutoCheck) {
                setShowStatusMenu(false);
            }

            if (!['online', 'away', 'busy', 'offline', 'auto'].includes(status)) {
                setCustomStatus(status);
                if (color) setCustomStatusColor(color);
            }

            if (status === 'auto' && !skipAutoCheck) {
                setIsAutoMode(true);
                startAutoStatus();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleCustomStatusSubmit = async (e) => {
        e.preventDefault();
        if (customStatus.trim()) {
            await handleStatusChange(customStatus.trim(), customStatusColor);
            setIsEditingCustomStatus(false);
            setShowColorPicker(false);
        }
    };

    const isCurrentStatus = (status) => {
        if (isAutoMode) return status === 'auto';
        if (currentStatus.includes('|')) return false;
        return currentStatus === status;
    };

    const handleColorChange = (e) => {
        const value = e.target.value;
        setHexInputValue(value);

        // Only update the actual color if it's a valid hex
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
            setCustomStatusColor(value);
        }
    };

    const handleHexKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexInputValue)) {
                setCustomStatusColor(hexInputValue);
            }
        }
    };

    // Update hexInputValue when customStatusColor changes
    useEffect(() => {
        setHexInputValue(customStatusColor);
    }, [customStatusColor]);

    useEffect(() => {
        if (isEditingCustomStatus && customStatusInputRef.current) {
            customStatusInputRef.current.focus();
        }
    }, [isEditingCustomStatus]);

    // Add click outside handler
    useEffect(() => {
        function handleClickOutside(event) {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
                setShowStatusMenu(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-black shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <h1 className="text-xl font-bold text-white">ChatGenius</h1>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setShowSearchModal(true)}
                            className="p-2 text-gray-300 hover:text-white focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        <div className="relative" ref={statusMenuRef}>
                            <button
                                onClick={() => setShowStatusMenu(!showStatusMenu)}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-800 focus:outline-none"
                            >
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: customStatusColor }}
                                ></div>
                                <span className="text-sm text-white">{currentUser.username}</span>
                            </button>

                            {showStatusMenu && (
                                <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-[#1a1a1a] ring-1 ring-black ring-opacity-5">
                                    <div className="py-1" role="menu">
                                        <button
                                            onClick={() => handleStatusChange('auto')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-white hover:bg-gray-800"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2 bg-gradient-to-r from-green-500 to-yellow-500" />
                                                Auto (Online/Away)
                                            </div>
                                            {isAutoMode && <span className="text-green-500">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('online')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-white hover:bg-gray-800"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#22c55e' }} />
                                                Online
                                            </div>
                                            {isCurrentStatus('online') && <span className="text-green-500">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('away')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-white hover:bg-gray-800"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#eab308' }} />
                                                Away
                                            </div>
                                            {isCurrentStatus('away') && <span className="text-green-500">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('busy')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-white hover:bg-gray-800"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#ef4444' }} />
                                                Do Not Disturb
                                            </div>
                                            {isCurrentStatus('busy') && <span className="text-green-500">✓</span>}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('offline')}
                                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-white hover:bg-gray-800"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#6b7280' }} />
                                                Offline
                                            </div>
                                            {isCurrentStatus('offline') && <span className="text-green-500">✓</span>}
                                        </button>
                                        <div className="border-t border-gray-700 my-1" />
                                        {isEditingCustomStatus ? (
                                            <form onSubmit={handleCustomStatusSubmit} className="px-4 py-2">
                                                <input
                                                    ref={customStatusInputRef}
                                                    type="text"
                                                    value={customStatus}
                                                    onChange={(e) => setCustomStatus(e.target.value)}
                                                    placeholder="What's on your mind?"
                                                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-blue-500 bg-[#1a1a1a] text-white placeholder-gray-400"
                                                    maxLength={50}
                                                />
                                                <div className="mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                                        className="flex items-center text-sm text-gray-400 hover:text-white"
                                                    >
                                                        <div className={`w-4 h-4 rounded-full mr-2`} style={{ backgroundColor: customStatusColor }} />
                                                        Choose color
                                                    </button>
                                                    {showColorPicker && (
                                                        <div className="mt-2">
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {statusColors.map(color => (
                                                                    <button
                                                                        key={color.hex}
                                                                        type="button"
                                                                        onClick={() => setCustomStatusColor(color.hex)}
                                                                        className={`w-6 h-6 rounded-full border-2 ${customStatusColor === color.hex ? 'border-blue-500' : 'border-gray-700'}`}
                                                                        style={{ backgroundColor: color.hex }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center mt-2">
                                                                <span className="text-xs text-gray-400 mr-2">Custom:</span>
                                                                <input
                                                                    type="text"
                                                                    value={hexInputValue}
                                                                    onChange={handleColorChange}
                                                                    onKeyDown={handleHexKeyDown}
                                                                    placeholder="#HEX"
                                                                    className="px-2 py-1 text-xs border rounded w-20 focus:outline-none focus:border-blue-500 bg-[#1a1a1a] text-white placeholder-gray-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-end mt-2 space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsEditingCustomStatus(false);
                                                            setShowColorPicker(false);
                                                        }}
                                                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditingCustomStatus(true)}
                                                className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-gray-800"
                                            >
                                                <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: customStatusColor }} />
                                                {customStatus || "Set a custom status"}
                                            </button>
                                        )}
                                        <div className="border-t border-gray-700 my-1" />
                                        <button
                                            onClick={onLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            {showSearchModal && (
                <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
            )}
        </header>
    );
}

Header.propTypes = {
    onLogout: PropTypes.func
};

export default Header; 