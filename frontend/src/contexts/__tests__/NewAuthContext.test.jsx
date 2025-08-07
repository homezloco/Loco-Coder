import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../NewAuthContext';
import { ApiProvider } from '../NewApiContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock API context
jest.mock('../NewApiContext', () => ({
  ...jest.requireActual('../NewApiContext'),
  useApi: () => ({
    login: jest.fn().mockResolvedValue({ 
      access_token: 'mock-token', 
      token_type: 'bearer',
      user: { username: 'testuser', email: 'test@example.com' }
    }),
    register: jest.fn().mockResolvedValue({ 
      access_token: 'mock-token', 
      token_type: 'bearer',
      user: { username: 'newuser', email: 'new@example.com' }
    }),
  }),
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    register, 
    loading, 
    error 
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-info">{user ? user.username : 'No User'}</div>
      <div data-testid="loading-state">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error-state">{error || 'No Error'}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => login('testuser', 'password')}
      >
        Login
      </button>
      <button 
        data-testid="register-btn" 
        onClick={() => register('newuser', 'new@example.com', 'password')}
      >
        Register
      </button>
      <button 
        data-testid="logout-btn" 
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
};

// Wrapper component with all required providers
const AllProviders = ({ children }) => (
  <ApiProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </ApiProvider>
);

describe('NewAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('should start with unauthenticated state', () => {
    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
  });

  test('should handle login correctly', async () => {
    const { getByTestId } = render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    // Initial state
    expect(getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
    
    // Click login button
    await act(async () => {
      userEvent.click(getByTestId('login-btn'));
    });
    
    // Check loading state during login
    expect(getByTestId('loading-state')).toHaveTextContent('Loading');
    
    // Check authenticated state after login
    await waitFor(() => {
      expect(getByTestId('auth-state')).toHaveTextContent('Authenticated');
      expect(getByTestId('user-info')).toHaveTextContent('testuser');
      expect(getByTestId('loading-state')).toHaveTextContent('Not Loading');
    });
    
    // Verify token was stored in localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('token', expect.any(String));
    expect(localStorage.setItem).toHaveBeenCalledWith('user', expect.any(String));
  });

  test('should handle logout correctly', async () => {
    // Set up initial authenticated state
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ username: 'testuser' }));
    
    const { getByTestId } = render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );
    
    // Wait for auth state to initialize from localStorage
    await waitFor(() => {
      expect(getByTestId('auth-state')).toHaveTextContent('Authenticated');
    });
    
    // Click logout button
    await act(async () => {
      userEvent.click(getByTestId('logout-btn'));
    });
    
    // Check unauthenticated state after logout
    expect(getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
    expect(getByTestId('user-info')).toHaveTextContent('No User');
    
    // Verify token was removed from localStorage
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
  });

  test('should handle registration correctly', async () => {
    const { getByTestId } = render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );
    
    // Initial state
    expect(getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
    
    // Click register button
    await act(async () => {
      userEvent.click(getByTestId('register-btn'));
    });
    
    // Check loading state during registration
    expect(getByTestId('loading-state')).toHaveTextContent('Loading');
    
    // Check authenticated state after registration
    await waitFor(() => {
      expect(getByTestId('auth-state')).toHaveTextContent('Authenticated');
      expect(getByTestId('user-info')).toHaveTextContent('newuser');
      expect(getByTestId('loading-state')).toHaveTextContent('Not Loading');
    });
    
    // Verify token was stored in localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('token', expect.any(String));
    expect(localStorage.setItem).toHaveBeenCalledWith('user', expect.any(String));
  });

  test('should handle login errors correctly', async () => {
    // Mock API error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockApi = require('../NewApiContext').useApi();
    mockApi.login.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    const { getByTestId } = render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );
    
    // Click login button
    await act(async () => {
      userEvent.click(getByTestId('login-btn'));
    });
    
    // Check error state after failed login
    await waitFor(() => {
      expect(getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
      expect(getByTestId('error-state')).not.toHaveTextContent('No Error');
      expect(getByTestId('loading-state')).toHaveTextContent('Not Loading');
    });
  });
});
