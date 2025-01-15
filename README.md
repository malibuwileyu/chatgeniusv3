# ChatGenius

A modern real-time messaging application with AI-powered features, inspired by Slack. ChatGenius enables seamless team communication with features like channels, direct messaging, and AI avatars.

## Tech Stack

### Frontend
- React (Vite)
- Socket.io Client
- Supabase Client

### Backend
- Node.js
- Express
- Socket.io
- Supabase

### Database & Authentication
- Supabase (PostgreSQL)
- Clerk (Authentication)

## Features
- Real-time messaging
- Channel-based communication
- Direct messaging
- File sharing
- User presence and status
- Threaded conversations
- Emoji reactions
- AI-powered digital twins

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- Supabase account
- Clerk account (for authentication)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd chatgenius
```

2. Install frontend dependencies
```bash
cd client
npm install
```

3. Install backend dependencies
```bash
cd ../server
npm install
```

4. Set up environment variables

Create a `.env` file in the server directory:
```env
PORT=3000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start the development servers

Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Project Structure
```
chatgenius/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── assets/       # Static assets
│   │   └── main.jsx      # Entry point
│   └── package.json
│
├── server/                # Backend Node.js application
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   └── index.js      # Entry point
│   └── package.json
│
└── README.md
```

## Development

### Database Schema
The application uses Supabase with the following main tables:
- `messages`: Stores all chat messages
- `channels`: Manages chat channels
- `channel_members`: Tracks channel membership

### Real-time Features
Real-time functionality is implemented using Socket.io for instant message delivery and user presence updates.

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License.