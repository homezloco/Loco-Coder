import {
  getFromCache,
  setInCache,
  removeFromCache,
  clearCache,
  cleanupExpiredCache,
  createCacheKey,
  withCache
} from '../utils/cache';

describe('Cache Utilities', () => {
  const originalConsole = global.console;
  
  beforeEach(() => {
    // Reset the cache
    clearCache();
    
    // Mock console to avoid test noise
    global.console = {
      ...originalConsole,
      error: jest.fn(),
      warn: jest.fn()
    };
    
    // Mock Date.now()
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });
  
  afterEach(() => {
    // Restore console and timers
    global.console = originalConsole;
    jest.useRealTimers();
  });
  
  describe('Basic Cache Operations', () => {
    it('should store and retrieve data from cache', () => {
      const testData = { id: 1, name: 'Test' };
      setInCache('test-key', testData);
      
      const cachedData = getFromCache('test-key');
      expect(cachedData).toEqual(testData);
    });
    
    it('should return undefined for non-existent keys', () => {
      const cachedData = getFromCache('non-existent');
      expect(cachedData).toBeUndefined();
    });
    
    it('should remove items from cache', () => {
      setInCache('to-remove', { data: 'test' });
      expect(getFromCache('to-remove')).toBeDefined();
      
      removeFromCache('to-remove');
      expect(getFromCache('to-remove')).toBeUndefined();
    });
    
    it('should clear all items from cache', () => {
      setInCache('key1', { data: 'test1' });
      setInCache('key2', { data: 'test2' });
      
      expect(getFromCache('key1')).toBeDefined();
      expect(getFromCache('key2')).toBeDefined();
      
      clearCache();
      
      expect(getFromCache('key1')).toBeUndefined();
      expect(getFromCache('key2')).toBeUndefined();
    });
  });
  
  describe('Cache Expiration', () => {
    it('should respect TTL for cache entries', () => {
      // Set cache with 1 minute TTL
      setInCache('temp-data', { id: 1 }, 60000);
      
      // Should be in cache
      expect(getFromCache('temp-data')).toBeDefined();
      
      // Fast-forward 59 seconds
      jest.advanceTimersByTime(59000);
      
      // Should still be in cache
      expect(getFromCache('temp-data')).toBeDefined();
      
      // Fast-forward 2 more seconds (past TTL)
      jest.advanceTimersByTime(2000);
      
      // Should be expired
      expect(getFromCache('temp-data')).toBeUndefined();
    });
    
    it('should clean up expired entries', () => {
      // Set up test data
      setInCache('expired-1', { data: 'expired' }, 1000);
      setInCache('valid-1', { data: 'valid' }, 60000);
      
      // Fast-forward to expire first entry
      jest.advanceTimersByTime(2000);
      
      // Clean up expired
      cleanupExpiredCache();
      
      // Check results
      expect(getFromCache('expired-1')).toBeUndefined();
      expect(getFromCache('valid-1')).toBeDefined();
    });
  });
  
  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const key1 = createCacheKey('test', { a: 1, b: 2 });
      const key2 = createCacheKey('test', { b: 2, a: 1 }); // Same params, different order
      const key3 = createCacheKey('test', { a: 2, b: 2 }); // Different params
      
      expect(key1).toBe(key2); // Same keys for same params
      expect(key1).not.toBe(key3); // Different keys for different params
      expect(key1).toMatch(/^test:/); // Should be prefixed with endpoint
    });
    
    it('should handle different parameter types', () => {
      const testCases = [
        { params: { a: 1, b: 'test' } },
        { params: { b: 'test', a: 1 } }, // Same as above, different order
        { params: { nested: { x: 1, y: 2 } } },
        { params: { arr: [1, 2, 3] } },
        { params: { date: new Date('2023-01-01') } },
        { params: { a: undefined, b: null } },
        { params: {} },
        { params: null },
        { params: undefined },
      ];
      
      const keys = new Set();
      
      testCases.forEach(({ params }) => {
        const key = createCacheKey('test', params);
        keys.add(key);
        expect(key).toMatch(/^test:/);
      });
      
      // All keys should be unique
      expect(keys.size).toBe(testCases.length);
    });
  });
  
  describe('withCache Decorator', () => {
    it('should cache function results', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const cachedFn = withCache(mockFn);
      
      // First call - should call the function
      const result1 = await cachedFn('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result');
      
      // Second call with same args - should use cache
      const result2 = await cachedFn('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result2).toBe('result');
      
      // Call with different args - should call function again
      const result3 = await cachedFn('different');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result3).toBe('result');
    });
    
    it('should respect TTL', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const cachedFn = withCache(mockFn, { ttl: 1000 });
      
      // First call
      await cachedFn('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Second call before TTL - should use cache
      await cachedFn('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Fast-forward past TTL
      jest.advanceTimersByTime(2000);
      
      // Should call function again after TTL
      await cachedFn('test');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
    
    it('should use custom cache key function', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const getKey = jest.fn().mockReturnValue('custom-key');
      
      const cachedFn = withCache(mockFn, { getKey });
      
      await cachedFn('test', 123);
      expect(getKey).toHaveBeenCalledWith('test', 123);
      
      // Second call with different args but same key - should use cache
      await cachedFn('different', 456);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    it('should handle function errors', async () => {
      const mockError = new Error('Test error');
      const mockFn = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce('success');
      
      const cachedFn = withCache(mockFn);
      
      // First call fails - should not cache the error
      await expect(cachedFn('test'))
        .rejects
        .toThrow('Test error');
      
      // Second call - should retry the function
      const result = await cachedFn('test');
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});
