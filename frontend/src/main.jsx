import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FeedbackProvider } from './components/feedback';
import AppUIProvider from './components/AppUIProvider';
import { api } from './services/api';

// Initialize the API client and make it globally available
console.log('[App] Initializing API client');
window.api = api;

// Restore authentication state if available
const token = localStorage.getItem('token');
if (token) {
  try {
    // Basic JWT token validation (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    const isValidToken = tokenParts.length === 3 && 
                        tokenParts[0].length > 0 && 
                        tokenParts[1].length > 0 && 
                        tokenParts[2].length > 0;
    
    if (isValidToken) {
      console.log('[App] Found valid token, initializing API client');
      api.setAuthToken(token);
    } else {
      console.warn('[App] Found invalid token format, clearing from storage');
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    }
  } catch (error) {
    console.error('[App] Error processing stored token:', error);
    // Clear potentially corrupted token
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }
} else {
  console.log('[App] No stored token found');
}

// Create root
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app with all necessary providers
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <FeedbackProvider>
        <AppUIProvider>
          <App />
        </AppUIProvider>
      </FeedbackProvider>
    </BrowserRouter>
  </React.StrictMode>
);

export default App;
