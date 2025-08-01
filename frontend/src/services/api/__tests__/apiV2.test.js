import api from '../apiV2';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('API V2 Service', () => {
  const mockToken = 'test-token';
  const mockUser = { id: 1, username: 'testuser' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset API state
    api.clearAuthData();
  });

  describe('Token Management', () => {
    it('should store and retrieve token', () => {
      api.storeToken(mockToken, true);
      expect(api.getAuthToken()).toBe(mockToken);
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
    });

    it('should store token in sessionStorage when remember is false', () => {
      api.storeToken(mockToken, false);
      expect(sessionStorage.getItem('auth_token')).toBe(mockToken);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should clear auth data', () => {
      api.storeToken(mockToken, true);
      api.clearAuthData();
      expect(api.getAuthToken()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ token: 'new-token', user: mockUser })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await api.login({ username: 'test', password: 'pass' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'test', password: 'pass' })
        })
      );
      
      expect(result).toEqual({ token: 'new-token', user: mockUser });
      expect(api.getAuthToken()).toBe('new-token');
    });

    it('should handle login error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid credentials' })
      });

      await expect(api.login({ username: 'test', password: 'wrong' }))
        .rejects
        .toThrow('Invalid credentials');
    });
  });

  describe('API Requests', () => {
    it('should include auth token in requests', async () => {
      api.storeToken(mockToken, true);
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.fetch('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
    });

    it('should handle 401 Unauthorized', async () => {
      api.storeToken(mockToken, true);
      
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      // Second call is the test request that will fail
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Spy on window.dispatchEvent
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      // This should trigger a 401 and clear the token
      await expect(api.fetch('/protected')).rejects.toThrow('Unauthorized');
      
      // Verify token was cleared
      expect(api.getAuthToken()).toBeNull();
      
      // Verify auth state change was dispatched
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'authStateChanged',
          detail: { isAuthenticated: false }
        })
      );
      
      dispatchSpy.mockRestore();
    });
  });
});
