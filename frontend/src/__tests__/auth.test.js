import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Mock the API module
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockStoreToken = jest.fn();
const mockClearAuthData = jest.fn();
const mockGetAuthToken = jest.fn();
const mockIsAuthenticated = jest.fn();

jest.mock('../services/api/apiV2', () => ({
  __esModule: true,
  default: {
    login: mockLogin,
    logout: mockLogout,
    getCurrentUser: mockGetCurrentUser,
    storeToken: mockStoreToken,
    clearAuthData: mockClearAuthData,
    getAuthToken: mockGetAuthToken,
    isAuthenticated: mockIsAuthenticated,
  },
}));



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

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockIsAuthenticated.mockReturnValue(false);
});

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
  it('should initialize with no user', () => {
    mockIsAuthenticated.mockReturnValue(false);
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('Not Authenticated');
    expect(screen.queryByTestId('username')).not.toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    // Mock successful login response
    mockLogin.mockResolvedValueOnce({
      user: { username: 'testuser', roles: ['user'] },
      token: 'test-token'
    });
    mockIsAuthenticated.mockReturnValue(true);

    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByTestId('login-btn'));
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for login to complete
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        { username: 'testuser', password: 'password' },
        true
      );
      expect(screen.getByTestId('status')).toHaveTextContent('Authenticated');
    });
    
    // Verify token was stored
    expect(mockStoreToken).toHaveBeenCalledWith('test-token', true);
  });

  it('should handle login error', async () => {
    // Mock failed login
    const error = new Error('Invalid credentials');
    mockLogin.mockRejectedValueOnce(error);

    renderWithProviders(<TestComponent />);
    
    // Click login button
    fireEvent.click(screen.getByTestId('login-btn'));
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Should return to not authenticated state after error
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Authenticated');
    });
    
    expect(mockLogin).toHaveBeenCalledWith(
      { username: 'testuser', password: 'password' },
      true
    );
  });

  it('should handle logout', async () => {
    // Set initial state as authenticated
    mockIsAuthenticated.mockReturnValue(true);
    mockGetCurrentUser.mockResolvedValueOnce({ username: 'testuser' });
    
    renderWithProviders(<TestComponent />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Authenticated');
    });
    
    // Mock successful logout
    mockLogout.mockResolvedValueOnce({});
    mockIsAuthenticated.mockReturnValue(false);
    
    // Click logout button
    fireEvent.click(screen.getByTestId('logout-btn'));
    
    // Should return to not authenticated state
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Not Authenticated');
      expect(screen.queryByTestId('username')).not.toBeInTheDocument();
    });
    
    // Verify auth data was cleared
    expect(mockClearAuthData).toHaveBeenCalled();
  });
});
