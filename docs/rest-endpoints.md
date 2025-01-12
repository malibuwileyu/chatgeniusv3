# REST API Endpoints

## Authentication

- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- POST /api/auth/refresh - Refresh token
- POST /api/auth/reset-password - Request password reset

## Users

- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- PUT /api/users/:id - Update user
- PUT /api/users/:id/status - Update user status
- GET /api/users/:id/presence - Get user presence

## Channels

- GET /api/channels - Get all channels
- POST /api/channels - Create channel
- GET /api/channels/:id - Get channel by ID
- PUT /api/channels/:id - Update channel
- DELETE /api/channels/:id - Delete channel
- POST /api/channels/:id/members - Add channel member
- DELETE /api/channels/:id/members/:userId - Remove channel member

## Messages

- GET /api/channels/:channelId/messages - Get channel messages
- POST /api/channels/:channelId/messages - Create message
- PUT /api/messages/:id - Update message
- DELETE /api/messages/:id - Delete message
- GET /api/messages/:id/thread - Get thread messages
- POST /api/messages/:id/thread - Create thread message

## Files

- POST /api/files/upload - Upload file
- GET /api/files/:id - Get file
- DELETE /api/files/:id - Delete file
- GET /api/files/search - Search files

## Reactions

- POST /api/messages/:id/reactions - Add reaction
- DELETE /api/messages/:id/reactions/:emoji - Remove reaction
- GET /api/messages/:id/reactions - Get message reactions