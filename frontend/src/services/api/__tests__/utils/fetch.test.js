import { fetchWithTimeout } from '../utils/fetch';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock response helper
const createResponse = (data, status = 200, statusText = 'OK') => ({
  ok: status >= 200 && status < 300,
  status,
  statusText,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  clone: function() {
    return createResponse(data, status, statusText);
  }
});

describe('Fetch Utils', () => {
  const originalConsole = global.console;
  
  beforeEach(() => {
    // Reset mocks
    mockFetch.mockClear();
    
    // Mock console to avoid test noise
    global.console = {
      ...originalConsole,
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };
  });
  
  afterEach(() => {
    // Restore console
    global.console = originalConsole;
  });
  
  describe('fetchWithTimeout', () => {
    it('should successfully fetch data', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce(createResponse(mockData));
      
      const response = await fetchWithTimeout('https://api.example.com/test');
      const data = await response.json();
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(data).toEqual(mockData);
    });
    
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(fetchWithTimeout('https://api.example.com/error'))
        .rejects
        .toThrow('Network error');
    });
    
    it('should respect timeout', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(createResponse({})), 2000)
        )
      );
      
      await expect(fetchWithTimeout('https://api.example.com/slow', { timeout: 1000 }))
        .rejects
        .toThrow('Request timed out');
    });
    
    it('should retry failed requests', async () => {
      const mockData = { success: true };
      
      // First two requests fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createResponse(mockData));
      
      const response = await fetchWithTimeout('https://api.example.com/retry', {
        maxRetries: 3,
        retryDelay: 100
      });
      
      const data = await response.json();
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(data).toEqual(mockData);
    });
    
    it('should add auth header when token exists', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValueOnce(createResponse(mockData));
      
      // Mock getAuthToken
      jest.mock('../utils/token', () => ({
        getAuthToken: jest.fn().mockReturnValue('test-token')
      }));
      
      // Re-import to apply the mock
      const { fetchWithTimeout: fetchWithMockedToken } = require('../utils/fetch');
      
      await fetchWithMockedToken('https://api.example.com/auth');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
    
    it('should skip auth header when skipAuth is true', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValueOnce(createResponse(mockData));
      
      // Mock getAuthToken
      jest.mock('../utils/token', () => ({
        getAuthToken: jest.fn().mockReturnValue('test-token')
      }));
      
      // Re-import to apply the mock
      const { fetchWithTimeout: fetchWithMockedToken } = require('../utils/fetch');
      
      await fetchWithMockedToken('https://api.example.com/no-auth', { skipAuth: true });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/no-auth',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.anything()
          })
        })
      );
    });
    
    it('should handle JSON parsing errors', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Invalid JSON response')
      };
      
      mockFetch.mockResolvedValueOnce(errorResponse);
      
      const response = await fetchWithTimeout('https://api.example.com/bad-json');
      const text = await response.text();
      
      expect(text).toBe('Invalid JSON response');
    });
  });
});
