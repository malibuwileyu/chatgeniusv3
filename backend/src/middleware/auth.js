/**
 * @file auth.js
 * @description Authentication middleware and utilities that handle JWT token
 * generation and verification. This file provides core authentication functionality
 * for protecting routes and managing user sessions.
 * 
 * Exports:
 * - generateToken: Creates JWT tokens for authenticated users
 * - authenticateJWT: Middleware to verify JWT tokens on protected routes
 * 
 * Features:
 * - JWT token generation
 * - Token verification
 * - Request authentication
 * - Error handling
 * - Secure session management
 * 
 * Dependencies:
 * - passport
 * - jsonwebtoken
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import passport from 'passport';
import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1d' }
    );
}; 

export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};