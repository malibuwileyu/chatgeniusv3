/**
 * @file EditMessageForm.jsx
 * @description Message editing form component that provides an interface for
 * modifying existing messages. This component handles message content editing
 * with keyboard shortcuts and validation.
 * 
 * Core Functionality:
 * - Message content editing
 * - Form validation
 * - Keyboard shortcuts
 * - State management
 * 
 * Features:
 * - Content validation
 * - Save/Cancel actions
 * - Keyboard shortcuts (ESC/Enter)
 * - Unchanged content detection
 * - Auto-focus
 * - Responsive design
 * 
 * Props:
 * - message: Message object with content
 * - onSave: Function to handle message save
 * - onCancel: Function to handle edit cancellation
 * 
 * Dependencies:
 * - react
 * - prop-types
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { useState } from 'react';
import PropTypes from 'prop-types';

function EditMessageForm({ message, onSave, onCancel }) {
    const [content, setContent] = useState(message.content);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (content.trim() === message.content) {
            onCancel();
            return;
        }
        onSave(content.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-1">
            <div className="flex flex-col space-y-2">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                    autoFocus
                />
                <div className="flex space-x-2 text-sm">
                    <button
                        type="submit"
                        disabled={!content.trim() || content.trim() === message.content}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <span className="text-gray-500 ml-2 self-center">
                        ESC to cancel • Enter to save
                    </span>
                </div>
            </div>
        </form>
    );
}

EditMessageForm.propTypes = {
    message: PropTypes.shape({
        content: PropTypes.string.isRequired
    }).isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default EditMessageForm; 