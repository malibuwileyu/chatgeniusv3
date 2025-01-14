/**
 * @file Footer.jsx
 * @description Footer component that displays copyright information and provides
 * toggle functionality. This component serves as a consistent footer across the
 * application with interactive features.
 * 
 * Core Functionality:
 * - Copyright display
 * - Footer visibility toggle
 * - Responsive layout
 * 
 * Features:
 * - Toggle button
 * - Responsive design
 * - Shadow effects
 * - Hover interactions
 * 
 * Props:
 * - onToggle: Function to handle footer visibility toggle
 * 
 * Dependencies:
 * - prop-types
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import PropTypes from 'prop-types';

const Footer = ({ onToggle }) => {
    return (
        <footer className="bg-white shadow-sm p-4 mt-auto">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <p className="text-sm text-gray-600">© 2024 ChatGenius. All rights reserved.</p>
                <button
                    onClick={onToggle}
                    className="text-sm text-gray-600 hover:text-gray-900"
                >
                    Toggle Footer
                </button>
            </div>
        </footer>
    );
};

Footer.propTypes = {
    onToggle: PropTypes.func.isRequired,
};

export default Footer; 