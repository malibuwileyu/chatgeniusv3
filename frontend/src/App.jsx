/**
 * @file App.jsx
 * @description Root application component that handles routing and authentication
 * state management. This component serves as the main layout container and manages
 * protected routes based on authentication status.
 * 
 * Core Functionality:
 * - Route configuration
 * - Authentication state management
 * - Protected route handling
 * - Navigation management
 * 
 * Features:
 * - Authentication-based routing
 * - Automatic redirect for protected routes
 * - Logout handling
 * - Session persistence
 * 
 * Routes:
 * - /: Authentication page (public)
 * - /chat: Main chat interface (protected)
 * - /browse-channels: Channel browser (protected)
 * 
 * Dependencies:
 * - react-router-dom
 * - react
 * - ./pages/Auth
 * - ./components/Chat
 * - ./pages/BrowseChannels
 * - ./services/auth
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Chat from './components/common/Chat';
import BrowseChannels from './pages/BrowseChannels';
import { getToken, logout } from './services/authService';
import userService from './services/userService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);

    // Set AI user to be permanently online
    userService.setAIStatus().catch(error => {
      console.error('Failed to set AI status:', error);
    });

    // Subscribe to AI status changes to ensure it stays online
    const subscription = userService.subscribeToUserStatus('00000000-0000-0000-0000-000000000000', async (status) => {
      if (status !== 'online') {
        try {
          await userService.setAIStatus();
        } catch (error) {
          console.error('Failed to reset AI status to online:', error);
        }
      }
    });

    return () => {
      subscription.then(sub => sub.unsubscribe()).catch(console.error);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/chat" replace />
            ) : (
              <Auth onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/chat"
          element={
            isAuthenticated ? (
              <Chat onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/browse-channels"
          element={
            isAuthenticated ? (
              <BrowseChannels />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
