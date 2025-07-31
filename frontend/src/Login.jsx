import React, { useState, useEffect } from 'react';
import { login, verifyToken } from './api';
import './Login.css';

/**
 * Login component for authentication with fallback mechanisms
 */
const Login = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user already has valid session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await verifyToken();
        if (result.success) {
          onLoginSuccess(result.username, result.isAdmin);
        }
      } catch (err) {
        console.error('Token verification error:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [onLoginSuccess]);

  // Handle login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Attempt to login
      const result = await login(username, password);
      
      if (result.success) {
        onLoginSuccess(result.username, result.isAdmin);
      } else {
        setError(result.message || 'Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle demo login (dev mode only)
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await login('admin', 'adminpass');
      if (result.success) {
        onLoginSuccess(result.username, result.isAdmin);
      } else {
        setError(result.message || 'Demo login not available');
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo login failed. Please try manual login.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="login-container loading">
        <div className="login-checking">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Local AI Coding Platform</h2>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>
          
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="login-actions">
            {onCancel && (
              <button 
                type="button" 
                className="login-cancel" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
            )}
            
            <button 
              type="submit" 
              className="login-button" 
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        
        <div className="login-demo">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            Demo Login
          </button>
          <span className="login-note">
            Default credentials: admin / adminpass
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
