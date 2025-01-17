/**
 * @file api.js
 * @description Axios instance configuration for API requests with authentication
 * and interceptor setup. This file provides a configured HTTP client for making
 * API calls to the backend server.
 * 
 * Core Functionality:
 * - Axios client configuration
 * - Request interceptors
 * - Authentication header management
 * - Base URL configuration
 * 
 * Features:
 * - Automatic token injection
 * - CORS configuration
 * - Content-Type headers
 * - Error handling
 * - Credential handling
 * 
 * Environment Variables:
 * - VITE_API_URL: Backend API URL
 * 
 * Storage Keys:
 * - auth_token: JWT token for authentication
 * 
 * Dependencies:
 * - axios
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// Add a request interceptor to include JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api; 