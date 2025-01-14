/**
 * @file Auth.jsx
 * @description Authentication page component that handles user login and registration.
 * This component provides a form interface for users to sign in or create new accounts,
 * with smooth transitions between modes.
 * 
 * Core Functionality:
 * - User authentication
 * - Account registration
 * - Form validation
 * - Error handling
 * 
 * Features:
 * - Toggle between sign-in/sign-up
 * - Form state management
 * - Error message display
 * - Responsive design
 * - Input validation
 * 
 * Props:
 * - onLogin: Function to handle successful authentication
 * 
 * Dependencies:
 * - react
 * - prop-types
 * - ../components/common/Footer
 * - ../services/auth
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import Footer from '../components/common/Footer';
import * as authService from '../services/authService';

const Auth = ({ onLogin }) => {
    const [showFooter, setShowFooter] = useState(true);
    const [isSignIn, setIsSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            let result;
            if (isSignIn) {
                result = await authService.login(email, password);
            } else {
                result = await authService.register(email, password, username);
            }

            onLogin(result.user);
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    const toggleMode = () => {
        setIsSignIn(!isSignIn);
        setError('');
        setEmail('');
        setPassword('');
        setUsername('');
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#1a1a1a]">
            <header className="bg-black shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-white">ChatGenius</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-start justify-center px-4 sm:px-6 lg:px-8 pt-[10vh]">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-300">
                            {isSignIn ? 'Sign in to your account' : 'Create new account'}
                        </h2>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="rounded-md shadow-sm -space-y-px flex flex-col items-center">
                            <div className="w-3/4">
                                <label htmlFor="email-address" className="sr-only">
                                    Email address
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            {!isSignIn && (
                                <div className="w-3/4">
                                    <label htmlFor="username" className="sr-only">
                                        Username
                                    </label>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            )}
                            <div className="w-3/4">
                                <label htmlFor="password" className="sr-only">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm text-center">{error}</div>
                        )}

                        <div className="flex flex-col items-center">
                            <button
                                type="submit"
                                className="w-1/2 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {isSignIn ? 'Sign in' : 'Create Account'}
                            </button>
                            <p className="mt-4 text-center text-sm text-gray-600">
                                {isSignIn ? 'Or ' : 'Already have an account? '}
                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    className="font-medium text-blue-600 hover:text-blue-500"
                                >
                                    {isSignIn ? 'create a new account' : 'sign in'}
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </main>

            {showFooter && <Footer onToggle={() => setShowFooter(!showFooter)} />}
        </div>
    );
};

Auth.propTypes = {
    onLogin: PropTypes.func.isRequired,
};

export default Auth; 