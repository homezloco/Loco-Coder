import {
  getAuthToken,
  storeToken,
  clearAuthData,
  isTokenExpired,
  initAuthToken
} from '../utils/token';

describe('Token Utils', () => {
  const originalLocalStorage = global.localStorage;
  const originalSessionStorage = global.sessionStorage;
  
  beforeEach(() => {
    // Mock localStorage and sessionStorage
    let store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
    };
    
    global.sessionStorage = {
      ...global.localStorage,
    };
    
    // Reset module state
    jest.resetModules();
  });
  
  afterEach(() => {
    // Restore original implementations
    global.localStorage = originalLocalStorage;
    global.sessionStorage = originalSessionStorage;
  });
  
  describe('storeToken', () => {
    it('should store token in localStorage by default', () => {
      storeToken('test-token', 'refresh-token', 3600);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token_expires', expect.any(String));
    });
    
    it('should handle missing refresh token', () => {
      storeToken('test-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });
  });
  
  describe('getAuthToken', () => {
    it('should return null when no token is stored', () => {
      expect(getAuthToken()).toBeNull();
    });
    
    it('should return stored token from memory', () => {
      storeToken('test-token');
      expect(getAuthToken()).toBe('test-token');
    });
  });
  
  describe('isTokenExpired', () => {
    it('should return true when no expiration is set', () => {
      expect(isTokenExpired()).toBe(true);
    });
    
    it('should return false for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      storeToken('test-token', null, 3600);
      expect(isTokenExpired()).toBe(false);
    });
    
    it('should return true for expired token', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour in past
      storeToken('test-token', null, -3600);
      expect(isTokenExpired()).toBe(true);
    });
  });
  
  describe('clearAuthData', () => {
    it('should clear all auth data from storage', () => {
      storeToken('test-token', 'refresh-token', 3600);
      clearAuthData();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token_expires');
      expect(getAuthToken()).toBeNull();
    });
  });
  
  describe('initAuthToken', () => {
    it('should initialize with valid token from localStorage', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_token_expires', futureTime.toString());
      
      const token = await initAuthToken();
      expect(token).toBe('test-token');
      expect(getAuthToken()).toBe('test-token');
    });
    
    it('should return null for expired token', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      localStorage.setItem('auth_token', 'expired-token');
      localStorage.setItem('auth_token_expires', pastTime.toString());
      
      const token = await initAuthToken();
      expect(token).toBeNull();
    });
  });
});
