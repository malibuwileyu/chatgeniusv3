# Migration Roadmap to Passport.js (with Documentation Updates)

Below is a refined set of steps, referencing both the ChatGenius (client code) and v3 (backend code) bases. These instructions elaborate on the Migration Roadmap to Passport.js, ensuring all integration points are covered and that presence and reactions remain (or become) fully functional. Importantly, this revision calls for adding or updating documentation (docstrings, file-level descriptions, etc.) to any previously undocumented files in both projects, following the rules defined in .cursorrules.

---

## Preliminary Cleanup & Passport Setup

### 1.0 Supabase Integration Setup
- [x] Create a Passport-Supabase strategy file (2024-01-13 17:30 EST)
  - [x] Configure Passport to use Supabase JWT verification (2024-01-13 17:30 EST)
  - [x] Set up user data fetching from Supabase (2024-01-13 17:30 EST)
  - [x] Handle token refresh and session management (2024-01-13 17:30 EST)
- [x] Update environment variables (2024-01-13 17:35 EST)
  - [x] Keep existing Supabase variables (2024-01-13 17:35 EST)
  - [x] Add Passport-specific variables while maintaining Supabase ones (2024-01-13 17:35 EST)
- [x] Document the integration approach in relevant config files (2024-01-13 17:35 EST)

### 1.1 Remove or Adapt Legacy Auth
- [x] Adapt auth middleware to use Passport.js (2024-01-13 17:45 EST)
- [x] Update routes to use passport.authenticate('jwt') (2024-01-13 17:45 EST)
- [x] Add documentation to auth files (2024-01-13 17:45 EST)
  - [x] Add file-level docstrings (2024-01-13 17:45 EST)
  - [x] Document function parameters and returns (2024-01-13 17:45 EST)

### 1.2 Add/Confirm Passport Configuration
- [x] Create and update passport.js config files (2024-01-13 18:00 EST)
  - [x] Add JWT decoding configuration (2024-01-13 18:00 EST)
  - [x] Configure environment variables (2024-01-13 18:00 EST)
- [x] Add Passport initialization to app.js (2024-01-13 18:00 EST)
- [x] Document configuration files (2024-01-13 18:00 EST)
  - [x] Add file-level docstrings (2024-01-13 18:00 EST)
  - [x] Document methods and configuration blocks (2024-01-13 18:00 EST)

### 1.3 Consolidate User Identification
- [x] Update user shape in Passport to match client expectations (2024-01-13 18:15 EST)
- [x] Update client auth service to handle both Passport and Supabase tokens (2024-01-13 18:15 EST)
- [x] Add documentation to all auth-related files (2024-01-13 18:15 EST)
  - [x] Add file-level docstrings (2024-01-13 18:15 EST)
  - [x] Document functions and configuration (2024-01-13 18:15 EST)
  - [x] Add usage notes for environment variables (2024-01-13 18:15 EST)

---

## Protected Endpoints & JWT Validation

### 2.1 Replace Custom Middlewares
- [x] Update all route files to use Passport authentication (2024-01-13 18:30 EST)
  - [x] channels.js: Replace auth middleware with passport.authenticate (2024-01-13 18:30 EST)
  - [x] messages.js: Replace auth middleware with passport.authenticate (2024-01-13 18:30 EST)
  - [x] files.js: Replace auth middleware with passport.authenticate (2024-01-13 18:30 EST)
  - [x] users.js: Replace auth middleware with passport.authenticate (2024-01-13 18:30 EST)
  - [x] reactions.js: Replace auth middleware with passport.authenticate (2024-01-13 18:30 EST)
  - [x] presence.js: Replace auth middleware with passport.authenticate (2024-01-13 18:30 EST)
- [x] Add proper documentation to all route files (2024-01-13 18:30 EST)
  - [x] Add file-level docstrings (2024-01-13 18:30 EST)
  - [x] Document route purposes and authentication requirements (2024-01-13 18:30 EST)

### 2.2 Ensure Compatibility in PresenceController & ReactionController
- [x] Update presenceController.js (2024-01-13 18:45 EST)
  - [x] Switch to Passport user ID references (2024-01-13 18:45 EST)
  - [x] Add comprehensive documentation (2024-01-13 18:45 EST)
  - [x] Improve error handling and responses (2024-01-13 18:45 EST)
- [x] Update reactionController.js (2024-01-13 18:45 EST)
  - [x] Switch to Passport user ID references (2024-01-13 18:45 EST)
  - [x] Add comprehensive documentation (2024-01-13 18:45 EST)
  - [x] Enhance response formatting (2024-01-13 18:45 EST)

---

## Frontend Adjustment: Client-Side Auth

### 3.1 getToken, logout, and getUser
- [x] Update token handling in API service (2024-01-13 19:00 EST)
  - [x] Change token key to 'passport_jwt' (2024-01-13 19:00 EST)
  - [x] Update error handling to clear both tokens (2024-01-13 19:00 EST)
  - [x] Add comprehensive documentation (2024-01-13 19:00 EST)
- [x] Verify useAuth hook token handling (2024-01-13 19:00 EST)
  - [x] Confirm it uses 'passport_jwt' (2024-01-13 19:00 EST)
  - [x] Verify Supabase session management (2024-01-13 19:00 EST)

### 3.2 Route Guards & Conditionals (React)
- [x] Update App.tsx routing structure (2024-01-13 19:15 EST)
  - [x] Add comprehensive documentation (2024-01-13 19:15 EST)
  - [x] Document route structure and protection (2024-01-13 19:15 EST)
- [x] Update ProtectedRoute component (2024-01-13 19:15 EST)
  - [x] Add loading state handling (2024-01-13 19:15 EST)
  - [x] Preserve redirect location (2024-01-13 19:15 EST)
  - [x] Add proper TypeScript documentation (2024-01-13 19:15 EST)

### 3.3 Session Expiration Handling
- [x] Update token refresh logic (2024-01-13 19:30 EST)
  - [x] Add token expiration check in API service (2024-01-13 19:30 EST)
  - [x] Implement token refresh in auth controller (2024-01-13 19:30 EST)
  - [x] Add graceful logout on token expiration (2024-01-13 19:30 EST)
- [x] Document session handling (2024-01-13 19:30 EST)
  - [x] Add comprehensive documentation to API service (2024-01-13 19:30 EST)
  - [x] Document token refresh logic in auth controller (2024-01-13 19:30 EST)

---

## Step 4: Presence / Status Updates

### 4.1 Switch to Passport ID in Presence Calls

▢ Environment Variables Setup:
• Critical Variables to Set:
  - [x] SESSION_SECRET in backend/.env (2024-01-19 14:30 EST)
    - Required for express-session
    - Must be a strong, unique value
    - Example: Use a 32+ character random string
  - [x] JWT_SECRET in backend/.env (2024-01-19 14:30 EST)
    - Used for signing Passport JWT tokens
    - Must be different from SESSION_SECRET
  - [x] SUPABASE_KEY and related variables (2024-01-19 14:30 EST)
    - Keep for database access only
    - Remove any auth-related Supabase variables

▢ Frontend Changes:
• Files to Update:
  - [x] frontend/src/hooks/useAuth.ts (2024-01-19 14:30 EST)
    - Remove Supabase client initialization and auth methods
    - Keep only Passport.js authentication
    - Update token handling to use 'passport_jwt'
  - [x] frontend/src/store/slices/authSlice.ts (2024-01-19 14:30 EST)
    - Remove Supabase session management and related actions
    - Update state to only track Passport JWT token
  - [x] frontend/src/services/api.ts (2024-01-19 14:30 EST)
    - Remove Supabase session handling
    - Update error handling for Passport-only auth
    - Ensure proper token refresh mechanism
  - [x] frontend/.env and .env.example (2024-01-19 14:30 EST)
    - Remove Supabase auth variables (SUPABASE_ANON_KEY)
    - Keep only API URL configuration
  - [x] frontend/src/components/Header.jsx (2024-01-19 14:30 EST)
    - Update presence triggers to use Passport JWT
    - Add "Authorization: Bearer <token>" headers
    - Verify typing indicator functionality
  - [x] frontend/src/hooks/usePresence.ts (2024-01-19 14:30 EST)
    - Remove any Supabase token references
    - Use Passport JWT from store/localStorage
    - Update SSE connection to use Passport auth
    - Ensure heartbeat mechanism uses Passport token
    - Add reconnection logic with exponential backoff

▢ Backend Changes:
• Files to Update:
  - [x] backend/controllers/authController.js (2024-01-19 14:30 EST)
    - Remove Supabase auth methods (signUp, signIn)
    - Add direct database operations using Supabase client
    - Implement password hashing with bcrypt
    - Add JWT token generation and validation
    - Implement proper session handling
  - [x] backend/config/passport-supabase.js (2024-01-19 14:30 EST)
    - Remove Supabase auth strategy
    - Add Passport JWT strategy
    - Configure Supabase client for database-only access
  - [x] backend/config/database.js (2024-01-19 14:30 EST)
    - Update Supabase client initialization to use service role key
    - Add connection pooling if needed
    - Implement database connection error handling
  - [x] backend/.env and .env.example (2024-01-19 14:30 EST)
    - Add service account credentials
    - Update Supabase configuration for database-only access
    - Remove Supabase JWT variables
    - Add SESSION_SECRET (required for express-session)
  - [x] backend/controllers/presenceController.js (2024-01-19 14:30 EST)
    - Remove custom token checks
    - Use req.user.id from Passport
    - Add comprehensive error handling
    - Update SSE authentication
    - Verify heartbeat endpoint authentication
    - Add proper cleanup for stale presence data

▢ Database Access Strategy:
• Implementation Steps:
  - [x] Create a service account in Supabase (2024-01-19 14:30 EST)
  - [x] Set up proper RLS policies for service account (2024-01-19 14:30 EST)
  - [x] Configure backend to use service account for all database operations (2024-01-19 14:30 EST)
  - [x] Remove any Supabase auth triggers or functions (2024-01-19 14:30 EST)
  - [x] Update database schema to handle password storage (2024-01-19 14:30 EST)
  - [x] Add indexes for user lookup by email (2024-01-19 14:30 EST)
  - [x] Set up proper cascading for user-related tables (2024-01-19 14:30 EST)
  - [x] Add presence-specific indexes if needed (2024-01-19 14:30 EST)

▢ Authentication Flow Updates:
• Changes Required:
  - [x] Implement local user registration with password hashing (2024-01-19 14:30 EST)
  - [x] Create JWT signing/verification with custom secret (2024-01-19 14:30 EST)
  - [x] Set up token refresh mechanism (2024-01-19 14:30 EST)
  - [x] Update session handling to use Passport.js only (2024-01-19 14:30 EST)
  - [x] Implement proper error handling for auth failures (2024-01-19 14:30 EST)
  - [x] Add rate limiting for auth endpoints (2024-01-19 14:30 EST)
  - [x] Ensure proper session secret configuration (2024-01-19 14:30 EST)

### 4.2 Auto-Status & Heartbeat

▢ Frontend Implementation:
  - [x] Update userService.startAutoStatus to use Passport JWT (2024-01-19 15:34 EST)
    - Verify token is included in heartbeat requests
    - Add proper error handling for failed heartbeats
    - Implement reconnection logic
  - [x] Implement proper cleanup on component unmount (2024-01-19 15:34 EST)
    - Clear all intervals and timeouts
    - Close SSE connections properly
  - [x] Add error handling for failed presence updates (2024-01-19 15:34 EST)
    - Implement retry mechanism
    - Show user feedback for connection issues
  - [x] Document heartbeat frequency and timeout logic (2024-01-19 15:34 EST)
    - Add clear documentation about timing
    - Document reconnection strategy
  - [x] Test presence with network interruptions (2024-01-19 15:34 EST)
    - Verify reconnection works
    - Check presence is accurate after reconnect

▢ Backend Implementation:
  - [x] Verify SSE endpoints use passport.authenticate('jwt') (2024-01-19 15:34 EST)
    - Check all presence-related endpoints
    - Ensure proper error responses
  - [x] Update broadcast logic to use req.user.id (2024-01-19 15:34 EST)
    - Remove any legacy user ID references
    - Verify channel-specific broadcasts
  - [x] Add proper error handling for disconnections (2024-01-19 15:34 EST)
    - Implement cleanup for stale connections
    - Log disconnection events
  - [x] Implement reconnection strategy (2024-01-19 15:34 EST)
    - Handle duplicate connections
    - Clean up old presence data
  - [x] Document SSE implementation details (2024-01-19 15:34 EST)
    - Add timing configurations
    - Document cleanup procedures

## Step 5: Emoji Reactions

### 5.1 Storage & Service Calls

▢ Backend Changes:
  - [x] Update reactionController.js (2024-01-18 16:01 EST)
    - Use req.user.id from Passport
    - Add proper error handling
    - Implement rate limiting
    - Add comprehensive documentation
    - Verify channel membership before allowing reactions
    - Add validation for reaction types
  - [x] Update database queries to use service account (2024-01-18 16:01 EST)
    - Remove any direct Supabase auth calls
    - Use proper database role
  - [x] Implement proper validation for reaction types (2024-01-18 16:01 EST)
    - Add reaction type constraints
    - Validate emoji format
  - [x] Add cleanup for orphaned reactions (2024-01-18 16:01 EST)
    - Implement cascade deletes
    - Add cleanup job for invalid reactions

▢ Frontend Changes:
  - [x] Update messageService/reactionService (2024-01-18 16:01 EST)
    - Use Passport JWT for all requests
    - Add proper error handling
    - Implement optimistic updates
    - Handle race conditions
  - [x] Update UI components (2024-01-18 16:01 EST)
    - Use Passport user ID for reaction checks
    - Add loading states
    - Implement error feedback
    - Handle network failures gracefully
  - [x] Add comprehensive documentation (2024-01-18 16:01 EST)
    - Document all exported functions
    - Add usage examples
    - Document error handling

### 5.2 UI Consistency

▢ Component Updates:
  - [x] Update FormattedMessage.jsx (2024-01-18 16:42 EST)
    - Use Passport user ID for reaction checks
    - Add proper loading states
    - Implement error handling
    - Verify reaction counts update correctly
  - [x] Update reaction tooltips (2024-01-18 16:42 EST)
    - Show proper user information
    - Handle loading states
    - Show error states when needed
  - [x] Add accessibility features (2024-01-18 16:42 EST)
    - Keyboard navigation
    - Screen reader support
    - ARIA labels for reactions
  - [x] Test edge cases (2024-01-18 16:42 EST)
    - Multiple rapid reactions
    - Concurrent users reacting
    - Network interruptions

▢ Documentation:
  - [x] Add component-level documentation (2024-01-18 16:42 EST)
    - Document props and state
    - Add usage examples
  - [x] Document state management (2024-01-18 16:42 EST)
    - Explain optimistic updates
    - Document error handling
  - [x] Document error handling (2024-01-18 16:42 EST)
    - List possible error states
    - Document recovery procedures
  - [x] Add usage examples (2024-01-18 16:42 EST)
    - Include code snippets
    - Document common patterns

### General Requirements

▢ Testing:
  - [x] Add unit tests for auth flow (2024-01-18 16:42 EST)
    - Test registration process
    - Test login/logout
    - Test token refresh
  - [x] Add integration tests for presence (2024-01-18 16:42 EST)
    - Test heartbeat mechanism
    - Test reconnection logic
    - Test presence accuracy
  - [x] Add tests for reaction handling (2024-01-18 16:42 EST)
    - Test concurrent reactions
    - Test error cases
    - Test cleanup
  - [x] Document test coverage requirements (2024-01-18 16:42 EST)
    - Specify minimum coverage
    - List critical paths to test

▢ Documentation:
  - [x] Update API documentation (2024-01-18 16:42 EST)
    - Document all endpoints
    - Include authentication requirements
    - Add request/response examples
  - [x] Document authentication flow (2024-01-18 16:42 EST)
    - Detail registration process
    - Explain token handling
    - Document session management
  - [x] Add troubleshooting guide (2024-01-18 16:42 EST)
    - Common issues and solutions
    - Debug procedures
  - [x] Update deployment guide (2024-01-18 16:42 EST)
    - Environment variable setup
    - Database migration steps
    - Deployment checklist

▢ Security:
  - [x] Implement rate limiting (2024-01-18 16:42 EST)
    - Add limits for auth endpoints
    - Add limits for presence updates
    - Add limits for reactions
  - [x] Add request validation (2024-01-18 16:42 EST)
    - Validate all input data
    - Add proper error responses
  - [x] Document security measures (2024-01-18 16:42 EST)
    - List security features
    - Document best practices
  - [x] Add audit logging (2024-01-18 16:42 EST)
    - Log authentication events
    - Log security-related actions
    - Implement proper log rotation

### 6.1 Local Tests & Build
▢ Development Environment Setup:
• Required Environment Variables:
  - [x] SESSION_SECRET (express-session) (2024-01-18 17:13 EST)
  - [x] JWT_SECRET (Passport authentication) (2024-01-18 17:13 EST)
  - [x] SUPABASE_KEY (database access) (2024-01-18 17:13 EST)
  - [x] Other variables as specified in .env.example (2024-01-18 17:13 EST)

▢ Start Development Servers:
• Frontend (ChatGenius client):
```bash
cd client
yarn install
yarn dev  # Runs on localhost:5173 by default
```

• Backend (v3):
```bash
cd backend
npm install
npm run dev  # Runs on localhost:3000
```

▢ Test Suite Execution:
• Frontend Tests:
```bash
cd client
yarn test        # Run unit tests
yarn test:e2e    # Run end-to-end tests
```

• Backend Tests:
```bash
cd backend
npm test         # Run unit tests
npm run test:e2e # Run integration tests
```

▢ Feature Testing Checklist:
• Authentication:
  - [x] Registration with password (2024-01-18 17:13 EST)
  - [x] Login with credentials (2024-01-18 17:13 EST)
  - [x] Token refresh (2024-01-18 17:13 EST)
  - [x] Session management (2024-01-18 17:13 EST)

• Real-time Features:
  - [x] Presence indicators (2024-01-18 17:13 EST)
  - [x] Typing indicators (2024-01-18 17:13 EST)
  - [x] Message delivery (2024-01-18 17:13 EST)
  - [x] Emoji reactions (2024-01-18 17:13 EST)
  - [x] File uploads (2024-01-18 17:13 EST)

• Error Scenarios:
  - [x] Network disconnection (2024-01-18 17:13 EST)
  - [x] Token expiration (2024-01-18 17:13 EST)
  - [x] Invalid inputs (2024-01-18 17:13 EST)
  - [x] Rate limiting (2024-01-18 17:13 EST)

### 6.2 Commit Following ChatGenius/.cursorrules
• Use the recommended step-by-step approach:
1. Check status: `git status`
2. Stage changes: `git add <files>`
3. Commit with message:
   ```
   feat(auth): switch to passport authentication [Feature ID: AUTH-123]
   
   - Remove Supabase auth
   - Implement password-based auth
   - Update presence handling
   ```
4. Push changes: `git push`

• Document all changes in:
  - implementation.md (API changes)
  - SDD.md (architecture updates)
  - TDD.md (test coverage)

### 6.3 Merge/Deploy
▢ Pre-deployment Checklist:
  - [ ] All tests pass
  - [ ] Environment variables documented
  - [ ] Database migrations ready
  - [ ] Documentation updated
  - [ ] Security measures verified

▢ Deployment Steps:
1. Update environment variables on deployment platform
2. Run database migrations
3. Deploy backend changes
4. Deploy frontend changes
5. Verify all features in production

▢ Post-deployment:
  - [ ] Monitor error rates
  - [ ] Check presence accuracy
  - [ ] Verify reaction functionality
  - [ ] Test authentication flow
  - [ ] Update status in todo.md

---

## After Completing These Steps
Your ChatGenius client and v3 backend should fully rely on Passport.js for authentication, maintain consistent user presence, and handle emoji reactions properly. All previously undocumented files should now include docstrings and file-level documentation that adhere to .cursorrules.

Remember:
1. Never alter existing DB structures unless explicitly instructed
2. Only use API endpoints listed in rest-endpoints.md
3. Keep environment variables secure and documented
4. Test thoroughly, especially presence and reaction features
5. Monitor for any authentication-related errors after deployment

For any ambiguous items (e.g., token refresh strategy), create a new entry in todo.md for future iteration or further clarification.