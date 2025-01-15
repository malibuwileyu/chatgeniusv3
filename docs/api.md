# API Documentation

## Authentication

### Overview
The API uses Passport.js with JWT strategy for authentication, integrated with Supabase for user data storage. All protected routes require a valid JWT token in the Authorization header.

### Authentication Flow
1. User registers or logs in through the `/auth` endpoints
2. Server validates credentials and returns a JWT token
3. Client includes token in subsequent requests
4. Server validates token using Passport.js middleware
5. Token refresh occurs automatically when close to expiration

### Endpoints

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "fullName": "Full Name"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "fullName": "Full Name"
  },
  "token": "jwt_token",
  "supabaseToken": "supabase_token"
}
```

#### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  },
  "token": "jwt_token",
  "supabaseToken": "supabase_token"
}
```

#### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "fullName": "Full Name"
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "message": "Invalid token"
}
```

#### 403 Forbidden
```json
{
  "message": "Not authorized to perform this action"
}
```

#### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### Protected Routes
All routes except `/auth/register` and `/auth/login` require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer jwt_token
```

### Token Refresh
- Tokens are automatically refreshed when within 5 minutes of expiration
- New tokens are returned in the response header
- Client should update stored token when received

### Rate Limiting
- Login attempts are limited to 5 per minute
- API calls are limited to 100 per minute per user
- Exceeded limits return 429 Too Many Requests

### Security Considerations
- Use HTTPS for all requests
- Store tokens securely (HttpOnly cookies recommended)
- Clear tokens on logout
- Handle token expiration gracefully 