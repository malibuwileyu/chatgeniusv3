# Development Roadmap

## Frontend Development
- [x] Set up React with Vite (2024-01-12 17:00 EST)
- [x] Configure TypeScript (2024-01-12 17:00 EST)
- [x] Set up Material-UI theming (2024-01-12 17:00 EST)
- [x] Implement login form (2024-01-12 17:00 EST)
- [x] Set up Redux store (2024-01-12 17:00 EST)
- [x] Configure authentication slice (2024-01-12 17:00 EST)
- [x] Create homepage layout (2024-01-12 17:00 EST)
- [x] Implement channel list (2024-01-12 19:00 EST)
- [x] Connect to Supabase for real-time updates (2024-01-12 19:00 EST)
- [x] Create message components (2024-01-13 01:30 EST)
- [x] Implement basic chat layout (2024-01-13 01:30 EST)
- [x] Add file upload UI (2024-01-13 01:30 EST)
- [x] Implement message search UI (2024-01-13 02:30 EST)
- [x] Add user presence UI (2024-01-13 02:30 EST)
- [x] Add DM creation and navigation (2024-01-13 03:30 EST)
- [ ] Create emoji reaction UI
- [x] Add file preview/download UI (2024-01-17 15:00 EST)
- [ ] Implement typing indicators
- [ ] Add search result highlighting
- [ ] Add online/offline indicators
- [x] Implement file upload progress UI (2024-01-17 15:00 EST)
- [ ] Add real-time reaction updates

## Non-MVP Todo
- [x] Fix chat message right side cutoff issue (2024-01-17 16:00 EST)
- [x] Add channel creation UI (2024-01-13 03:00 EST)
- [x] Implement channel deletion with confirmation (2024-01-13 05:30 EST)
- [x] Create channel settings modal (name, description, permissions) (2024-01-13 05:30 EST)
- [x] Add channel member management (2024-01-17 17:00 EST)
- [ ] Add message highlighting and scrolling to message when clicked in search results
- [ ] Implement "move to top" functionality for existing DMs
- [ ] Add registration screen accessible from login
- [ ] Implement custom file upload progress tracking with XMLHttpRequest or fetch API

## Backend Development
- [x] Set up Express server with TypeScript (2024-01-12 17:00 EST)
- [x] Configure database connection with Supabase (2024-01-12 17:00 EST)
- [x] Implement user authentication with JWT (2024-01-12 17:00 EST)
- [x] Create protected routes middleware (2024-01-12 17:00 EST)
- [x] Set up user management endpoints (2024-01-12 20:30 EST)
- [x] Implement channel CRUD operations (2024-01-12 20:30 EST)
- [x] Add reaction endpoints (2024-01-12 20:30 EST)
- [x] Create file upload/download endpoints (structure only) (2024-01-12 20:30 EST)
- [x] Implement file storage with Supabase (2024-01-17 15:00 EST)
  - [x] Configure storage buckets (2024-01-17 15:00 EST)
  - [x] Set up file access controls (2024-01-17 15:00 EST)
  - [ ] Add file versioning
  - [ ] Implement cleanup routines
- [ ] Add real-time message updates with WebSocket
  - [ ] Set up WebSocket server
  - [ ] Implement message subscriptions
  - [ ] Handle message edits/deletes
  - [ ] Add presence channel
- [ ] Implement message search functionality
  - [ ] Set up search indexing
  - [ ] Add full-text search queries
  - [ ] Implement search pagination
  - [ ] Add result ranking
- [ ] Add user presence tracking
  - [ ] Implement heartbeat system
  - [ ] Handle session management
  - [ ] Track user status changes
  - [ ] Add presence timeouts

## Database
- [x] Design schema (2024-01-12 17:30 EST)
- [x] Set up Supabase project (2024-01-12 17:30 EST)
- [x] Create initial migrations (2024-01-12 17:30 EST)
- [x] Configure real-time capabilities (2024-01-12 20:00 EST)
- [ ] Create message search indexes
  - [ ] Set up full-text search
  - [ ] Add content indexing
  - [ ] Configure search weights
  - [ ] Add metadata indexing
- [x] Add file metadata table (2024-01-17 15:00 EST)
  - [x] Create file schema (2024-01-17 15:00 EST)
  - [x] Set up access controls (2024-01-17 15:00 EST)
  - [ ] Add version tracking
  - [ ] Add file relationships
- [ ] Set up presence tracking table
  - [ ] Add heartbeat columns
  - [ ] Create status tracking
  - [ ] Set up session management
  - [ ] Add timeout handling
- [x] Add DM table and relationships (2024-01-17 14:00 EST)
- [x] Create file storage structure (2024-01-17 15:00 EST)
- [ ] Create thread relationships
- [ ] Add reaction table
- [ ] Add user status table
- [ ] Set up backup strategy

### Database Schema
- [x] Create user table (2024-01-12 17:00 EST)
- [x] Add channel table (2024-01-12 17:00 EST)
- [x] Create message table (2024-01-12 17:00 EST)
- [x] Add reactions table (2024-01-12 20:30 EST)
- [ ] Create file storage structure
- [ ] Add user presence tracking table