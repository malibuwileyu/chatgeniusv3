/**
 * @file auth.js
 * @description Authentication service that handles user authentication operations
 * including login, registration, and session management. This service manages the
 * storage and retrieval of authentication tokens and user data.
 * 
 * Core Functionality:
 * - User authentication
 * - Token management
 * - Session handling
 * - Local storage management
 * 
 * Exports:
 * - login: Authenticate user with email/password
 * - register: Create new user account
 * - logout: Clear user session
 * - getToken: Retrieve authentication token
 * - getUser: Get current user data
 * - isAuthenticated: Check authentication status
 * 
 * Storage Keys:
 * - auth_token: JWT authentication token
 * - user: User profile data
 * 
 * Dependencies:
 * - ../api/api
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import api from '../api/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;

    // Store token and user data
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { token, user };
};

export const register = async (email, password, username) => {
    const response = await api.post('/auth/register', {
        email,
        password,
        username
    });
    const { token, user } = response.data;

    // Store token and user data
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { token, user };
};

export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const getUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
    return !!getToken();
}; 