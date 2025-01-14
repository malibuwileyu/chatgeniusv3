# Configuration Guide

## Authentication Setup

### Prerequisites
- Node.js 16+
- PostgreSQL database
- Supabase account
- Environment variables configured

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Session
SESSION_SECRET=your_session_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

### Passport.js Setup

1. Install dependencies:
```bash
npm install passport passport-jwt express-session
```

2. Configure Passport in `app.js`:
```javascript
const passport = require('passport');
const session = require('express-session');
const { configurePassport } = require('./config/passport-config');

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
configurePassport(passport);
```

### Supabase Integration

1. Create Supabase project and get credentials

2. Configure Supabase client:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = supabase;
```

3. Set up Passport-Supabase strategy:
```javascript
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const supabase = require('./supabase');

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(options, async (jwt_payload, done) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select()
            .eq('id', jwt_payload.sub)
            .single();

        if (error || !user) {
            return done(null, false);
        }

        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));
```

### Database Setup

1. Required tables:
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR NOT NULL UNIQUE,
    username VARCHAR NOT NULL UNIQUE,
    full_name VARCHAR,
    avatar_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for user access
```

### Security Configuration

1. Configure CORS:
```javascript
const cors = require('cors');

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
```

2. Configure helmet for security headers:
```javascript
const helmet = require('helmet');

app.use(helmet());
```

### Deployment Considerations

1. Production environment:
- Use secure session cookies
- Enable rate limiting
- Use HTTPS
- Set appropriate CORS origins

2. Environment variables:
- Use different Supabase projects for dev/prod
- Use strong secrets
- Rotate keys periodically

3. Monitoring:
- Set up error logging
- Monitor authentication failures
- Track token usage and refresh rates 