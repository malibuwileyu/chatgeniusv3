/**
 * @file passport.js
 * @description Passport authentication configuration file that sets up local and JWT strategies
 * for user authentication. This file configures how users are authenticated using email/password
 * and JWT tokens, integrating with Supabase for user data storage.
 * 
 * Authentication Strategies:
 * - Local Strategy: Handles email/password authentication
 * - JWT Strategy: Handles token-based authentication
 * 
 * Dependencies:
 * - passport
 * - passport-local
 * - passport-jwt
 * - bcryptjs
 * - @supabase/supabase-js
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Local Strategy
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            // Find user in database
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .limit(1)
                .limit(1)
                .single();

            if (error || !user) {
                return done(null, false, { message: 'Incorrect email.' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

// JWT Strategy
passport.use(new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET || 'your-secret-key'
    },
    async (jwt_payload, done) => {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', jwt_payload.id)
                .limit(1)
                .single();

            if (error || !user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    }
));

export default passport; 