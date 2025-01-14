/**
 * @file main.jsx
 * @description Application entry point that initializes the React application and
 * renders the root component. This file sets up the React environment with strict
 * mode enabled for development best practices.
 * 
 * Core Functionality:
 * - React application initialization
 * - Root component rendering
 * - Strict mode configuration
 * 
 * Dependencies:
 * - react
 * - react-dom
 * - ./App
 * - ./index.css
 * 
 * @version 1.0.0
 * @created 2024-01-13
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
