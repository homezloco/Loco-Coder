import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import api from '../services/api/apiV2';

// Mock the API module
jest.mock('../services/api/apiV2');

// Test component that uses the auth hook
const TestComponent = () => {
  const { 
    user, 
    loading, 
    login, 
    logout, 
    isAuthenticated 
  } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && <div data-testid="username">{user.username}</div>}
      <button 
        onClick={() => login({ username: 'testuser', password: 'password' })}
        data-testid="login-btn"
      >
        Login
      </button>
      <button 
        onClick={logout}
        data-testid="logout-btn"
      >
        Logout
      </button>
    </div>
  );
};

// Wrapper component to provide router context
const renderWithProviders = (ui) => {
  return render(
    <Router>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </Router>
  );
};

describe('Authentication', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage before each test
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should initialize with no user', () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('Not Authenticated');
    expect(screen.queryByTestId('username')).not.toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    // Mock successful login response
    api.login.mockResolvedValueOnce({
      user: { username: 'testuser', roles: ['user'] },
      token: 'test-token'
    });

    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByTestId('login-btn'));
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    });
    
    // Verify token was stored
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  it('should handle login error', async () => {
    // Mock failed login
    api.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    // Mock console.error to prevent error logs in test output
    const originalError = console.error;
    console.error = jest.fn();

    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByTestId('login-btn'));
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Should return to not authenticated state after error
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Authenticated');
    });
    
    console.error = originalError;
  });

  it('should handle logout', async () => {
    // Mock successful login
    api.login.mockResolvedValueOnce({
      user: { username: 'testuser' },
      token: 'test-token'
    });
    
    // Mock successful logout
    api.logout.mockResolvedValueOnce({});

    renderWithProviders(<TestComponent />);
    
    // Login first
    fireEvent.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Authenticated');
    });
    
    // Now logout
    fireEvent.click(screen.getByTestId('logout-btn'));
    
    // Should return to not authenticated state
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Authenticated');
      expect(screen.queryByTestId('username')).not.toBeInTheDocument();
    });
    
    // Verify token was cleared
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
