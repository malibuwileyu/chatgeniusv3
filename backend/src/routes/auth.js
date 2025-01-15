/**
 * @file auth.js
 * @description Authentication routes handler that manages user registration and login endpoints.
 * This file implements the core authentication functionality using Passport.js and JWT tokens,
 * integrated with Supabase for user data storage.
 * 
 * Endpoints:
 * - POST /api/auth/register: User registration with email, password, and username
 * - POST /api/auth/login: User login with email and password
 * 
 * Features:
 * - Password hashing with bcrypt
 * - JWT token generation
 * - Duplicate email/username checking
 * - Error handling and validation
 * 
 * Dependencies:
 * - express
 * - passport
 * - bcryptjs
 * - @supabase/supabase-js
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import express from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Check if user exists
        const { data: existingUsers } = await supabase
            .from('users')
            .select('email, username')
            .or(`email.eq.${email},username.eq.${username}`);

        if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            return res.status(400).json({
                message: existingUser.email === email
                    ? 'Email already exists'
                    : 'Username already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email,
                password_hash,
                username,
                status: 'offline'
            })
            .select()
            .limit(1)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // Generate JWT
        const token = generateToken(user);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: info.message });
        }

        // Generate JWT
        const token = generateToken(user);

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });
    })(req, res, next);
});

export default router; 