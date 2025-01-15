# Migration Guide

## Passport.js Authentication Migration

### Overview
This guide details the migration from custom JWT authentication to Passport.js with Supabase integration. Follow these steps when upgrading existing applications or implementing new features.

### Breaking Changes

1. Authentication Flow
- Token format changed to Passport JWT
- Session handling updated
- User ID retrieval method changed

2. API Changes
- Authorization header format updated
- Error response structure modified
- New endpoints added

3. Frontend Changes
- Token storage location changed
- Authentication hook interface updated
- Protected route implementation changed

### Step-by-Step Migration

1. Backend Updates

```bash
# Install required packages
npm install passport passport-jwt express-session
```

```javascript
// Update app.js
const passport = require('passport');
const session = require('express-session');
const { configurePassport } = require('./config/passport-config');

// Add session and passport middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
configurePassport(passport);
```

2. Route Updates

```javascript
// Before
router.get('/protected', auth, controller.method);

// After
router.get('/protected',
    passport.authenticate('jwt', { session: false }),
    controller.method
);
```

3. Controller Updates

```javascript
// Before
const userId = req.user.id;

// After
const userId = req.user.id; // From Passport user object
```

4. Frontend Updates

```typescript
// Update API service
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Update auth hook
const useAuth = () => {
    // ... updated implementation
};
```

### Rollback Procedure

1. Revert Backend
```bash
# Revert packages
npm uninstall passport passport-jwt express-session
```

2. Restore Files
- Restore original auth middleware
- Restore original route protection
- Remove Passport configuration

3. Update Frontend
- Restore original token handling
- Restore original auth hook
- Update API service configuration

### Testing Changes

1. Authentication Flow
```bash
# Test registration
curl -X POST http://localhost:3000/auth/register -d '{
    "email": "test@example.com",
    "password": "password123"
}'

# Test login
curl -X POST http://localhost:3000/auth/login -d '{
    "email": "test@example.com",
    "password": "password123"
}'

# Test protected route
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/protected
```

2. Frontend Testing
- Test login flow
- Test protected routes
- Test token refresh
- Test error handling

### Common Issues

1. Token Issues
- Invalid token format
- Token not being sent
- Token refresh failing

2. Route Protection
- Routes not properly protected
- Permission checks failing
- Session issues

3. Frontend Integration
- Token storage issues
- Authentication state not updating
- Protected routes not redirecting

### Support

For issues during migration:
1. Check error logs
2. Verify environment variables
3. Test authentication flow
4. Contact support team 