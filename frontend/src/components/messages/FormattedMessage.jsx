/**
 * @file FormattedMessage.jsx
 * @description Message formatting component that renders message content with
 * markdown support, file attachments, and interactive actions. This component
 * handles rich text display and message-specific actions.
 * 
 * Core Functionality:
 * - Markdown rendering
 * - File attachment display
 * - Message actions
 * - Pin/Unpin functionality
 * 
 * Features:
 * - Rich text formatting
 * - Code block highlighting
 * - File preview integration
 * - Edit functionality
 * - Pin/Unpin actions
 * - Permission-based actions
 * - Interactive UI elements
 * 
 * Props:
 * - content: Message content string
 * - file: Optional file attachment object
 * - message: Message object with metadata
 * - onEdit: Function to handle message editing
 * - onPin: Function to handle message pinning
 * - replyButton: React node to render reply button
 * - reactionButton: React node to render reaction button
 * 
 * Dependencies:
 * - react
 * - react-markdown
 * - remark-gfm
 * - prop-types
 * - ../../services/auth
 * - ../files/FileDisplay
 * - ./EditMessageForm
 * - ../../supabaseClient
 * 
 * @version 1.1.0
 * @created 2024-01-14
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { getUser } from '../../services/authService';
import FileDisplay from '../files/FileDisplay';
import EditMessageForm from './EditMessageForm';
import { supabase } from '../../supabaseClient';

function FormattedMessage({ content, file, message, onEdit, onPin, replyButton, reactionButton }) {
    const [isEditing, setIsEditing] = useState(false);
    const currentUser = getUser();
    const isOwner = message && currentUser.id === message.sender.id;

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async (newContent) => {
        await onEdit(message.id, newContent);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handlePin = () => {
        onPin(message.id);
    };

    if (isEditing) {
        return <EditMessageForm message={message} onSave={handleSave} onCancel={handleCancel} />;
    }

    return (
        <div className="group relative">
            <div className="prose prose-sm max-w-none">
                <div className="text-white">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({node, inline, className, children, ...props}) {
                                return (
                                    <code className={`${inline ? 'bg-gray-800 px-1 rounded' : 'block bg-gray-800 p-2 rounded'} text-white`} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
            {file && <FileDisplay file={file} />}
            <div className="mt-1 flex items-center space-x-2">
                {isOwner && onEdit && (
                    <button
                        onClick={handleEdit}
                        className="text-xs text-gray-400 hover:text-gray-200 flex items-center space-x-1 transition-colors duration-150"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                    </button>
                )}
                <button
                    onClick={handlePin}
                    className={`text-xs flex items-center space-x-1 transition-colors duration-150 ${
                        message?.pinned
                            ? 'text-yellow-500 hover:text-yellow-400'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill={message?.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>{message?.pinned ? 'Unpin' : 'Pin'}</span>
                </button>
                {replyButton}
                {reactionButton}
            </div>
        </div>
    );
}

FormattedMessage.propTypes = {
    content: PropTypes.string.isRequired,
    file: PropTypes.object,
    message: PropTypes.shape({
        id: PropTypes.string,
        sender: PropTypes.shape({
            id: PropTypes.string
        }),
        pinned: PropTypes.bool
    }),
    onEdit: PropTypes.func,
    onPin: PropTypes.func,
    replyButton: PropTypes.node,
    reactionButton: PropTypes.node
};

export default FormattedMessage;