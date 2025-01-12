# ChatGenius Backend

This is the backend service for ChatGenius, a real-time chat application built with Express.js and Supabase.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Supabase account and project

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the Supabase configuration values in `.env`

3. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot reload
- `npm test`: Run tests

## Project Structure

```
backend/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middleware/     # Express middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── app.js         # Express app setup
└── server.js      # Server entry point
```

## API Documentation

API documentation can be found in the `/docs` directory. 