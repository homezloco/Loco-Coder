import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FeedbackProvider } from './components/feedback';
import AppUIProvider from './components/AppUIProvider';
import api from './services/api';
import './styles/darkMode.css';

// Initialize the API client and make it globally available
console.log('[App] Initializing API client');
window.api = api;

// Import token keys
import { TOKEN_KEYS } from './services/api/config';

// Initialize auth state
const initializeAuth = async () => {
  try {
    console.log('[Auth] Initializing authentication...');
    
    // Check if we have a valid token in storage
    const tokenKey = TOKEN_KEYS?.storageKey || 'auth_token';
    const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
    
    if (token) {
      // Basic JWT token validation
      const tokenParts = token.split('.');
      const isValidToken = tokenParts.length === 3 && 
                         tokenParts[0].length > 0 && 
                         tokenParts[1].length > 0 && 
                         tokenParts[2].length > 0;
      
      if (isValidToken) {
        console.log('[Auth] Found valid token, initializing API client');
        try {
          // Validate token with server if needed
          const isValid = await api.validateToken(token);
          if (isValid) {
            api.setAuthToken(token);
            return true;
          }
        } catch (error) {
          console.warn('[Auth] Token validation failed:', error);
        }
      }
      
      // If we get here, token is invalid or validation failed
      console.warn('[Auth] Invalid or expired token, clearing...');
      api.clearAuthToken();
    } else {
      console.log('[Auth] No token found in storage');
    }
    return false;
  } catch (error) {
    console.error('[Auth] Error initializing authentication:', error);
    return false;
  }
};

// Initialize auth state before rendering
initializeAuth().then(isAuthenticated => {
  console.log(`[App] Authentication initialized. Authenticated: ${isAuthenticated}`);
  
  // Projects will be loaded by the appropriate component after auth is complete
  // This prevents circular dependencies and race conditions
  
  // Dispatch auth state change event
  const event = new CustomEvent('auth-state-changed', { 
    detail: { isAuthenticated } 
  });
  window.dispatchEvent(event);
  
}).catch(error => {
  console.error('[App] Error initializing authentication:', error);
  
  // Still dispatch auth state change with false to handle error cases
  const event = new CustomEvent('auth-state-changed', { 
    detail: { isAuthenticated: false, error } 
  });
  window.dispatchEvent(event);
});

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
