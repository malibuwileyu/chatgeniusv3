# System Design Document (SDD)

## System Components

### Authentication System
- User registration
- Login/logout functionality
- Password reset flow
- Session management
- JWT token handling

### Messaging System
- Direct messaging
- Channel messaging
- Thread support
- Message persistence
- Message editing/deletion

### Channel Management
- Channel creation
- Channel membership
- Channel settings
- Channel discovery
- Private/public channels

### File Management
- File upload service
- File storage system
- File search functionality
- File type validation
- File access control

### User Management
- User profiles
- Status management
- Presence tracking
- User search
- User settings

### Reaction System
- Emoji reaction support
- Reaction management
- Reaction notifications

## Data Models

### User
- id (UUID)
- username (string)
- email (string)
- password_hash (string)
- avatar_url (string)
- status (enum)
- last_active (timestamp)
- created_at (timestamp)

### Channel
- id (UUID)
- name (string)
- description (string)
- is_private (boolean)
- created_by (UUID)
- created_at (timestamp)

### Message
- id (UUID)
- content (text)
- sender_id (UUID)
- channel_id (UUID)
- thread_id (UUID nullable)
- created_at (timestamp)
- updated_at (timestamp)

### Reaction
- id (UUID)
- message_id (UUID)
- user_id (UUID)
- emoji (string)
- created_at (timestamp)

### File
- id (UUID)
- name (string)
- url (string)
- type (string)
- size (integer)
- uploader_id (UUID)
- channel_id (UUID)
- message_id (UUID)
- created_at (timestamp)

### ChannelMember
- channel_id (UUID)
- user_id (UUID)
- role (enum)
- joined_at (timestamp)

## System Interactions
1. Authentication Flow
2. Message Flow
3. File Upload Flow
4. Channel Operations Flow
5. Reaction Flow 