import {
  getCurrentBaseUrl,
  tryNextFallbackUrl,
  createFormData,
  debounce,
  clearCacheAfterTTL,
  cleanExpiredCache
} from '../utils/url';

// Mock global objects
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalCaches = global.caches;

describe('URL Utils', () => {
  beforeEach(() => {
    // Reset module state
    jest.resetModules();
    
    // Mock timers
    jest.useFakeTimers();
    
    // Mock caches
    global.caches = {
      delete: jest.fn().mockResolvedValue(true),
      keys: jest.fn().mockResolvedValue([
        'cache-123',
        'cache-expired-1',
        'other-cache'
      ])
    };
  });
  
  afterEach(() => {
    // Restore original implementations
    jest.useRealTimers();
    global.caches = originalCaches;
  });
  
  describe('getCurrentBaseUrl', () => {
    it('should return the current base URL', () => {
      const url = getCurrentBaseUrl();
      expect(url).toBe(process.env.REACT_APP_API_URL || 'http://localhost:3001');
    });
  });
  
  describe('tryNextFallbackUrl', () => {
    it('should switch to the next fallback URL', () => {
      const originalUrl = getCurrentBaseUrl();
      const result = tryNextFallbackUrl();
      
      expect(result).toBe(true);
      expect(getCurrentBaseUrl()).not.toBe(originalUrl);
    });
    
    it('should cycle back to the first URL after reaching the end', () => {
      const firstUrl = getCurrentBaseUrl();
      
      // Cycle through all fallbacks
      const fallbackCount = process.env.REACT_APP_FALLBACK_URLS 
        ? JSON.parse(process.env.REACT_APP_FALLBACK_URLS).length 
        : 0;
      
      for (let i = 0; i < fallbackCount; i++) {
        tryNextFallbackUrl();
      }
      
      // Next call should cycle back to first URL
      tryNextFallbackUrl();
      expect(getCurrentBaseUrl()).toBe(firstUrl);
    });
  });
  
  describe('createFormData', () => {
    it('should create FormData from object', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const formData = createFormData({
        name: 'test',
        count: 42,
        file,
        nested: { key: 'value' },
        array: [1, 2, 3]
      });
      
      expect(formData.get('name')).toBe('test');
      expect(formData.get('count')).toBe('42');
      expect(formData.get('file')).toBe(file);
      expect(formData.get('nested')).toBe('{"key":"value"}');
      expect(formData.getAll('array')).toEqual(['1', '2', '3']);
    });
    
    it('should skip null and undefined values', () => {
      const formData = createFormData({
        name: 'test',
        empty: null,
        undef: undefined
      });
      
      expect(formData.get('name')).toBe('test');
      expect(formData.get('empty')).toBeNull();
      expect(formData.get('undef')).toBeNull();
    });
  });
  
  describe('debounce', () => {
    it('should delay function execution', () => {
      const mockFn = jest.fn();
      const debounced = debounce('test', mockFn, 1000);
      
      debounced();
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(500);
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(600);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    it('should debounce multiple calls', () => {
      const mockFn = jest.fn();
      const debounced = debounce('test', mockFn, 1000);
      
      debounced();
      jest.advanceTimersByTime(500);
      debounced();
      
      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('clearCacheAfterTTL', () => {
    it('should schedule cache cleanup', () => {
      clearCacheAfterTTL('test-cache', 1000);
      
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      expect(caches.delete).toHaveBeenCalledWith('test-cache');
    });
  });
  
  describe('cleanExpiredCache', () => {
    it('should clean up expired caches', async () => {
      const now = Date.now();
      const expiredCacheName = `cache-expired-${now - 3600000}`; // 1 hour old
      
      global.caches.keys = jest.fn().mockResolvedValue([
        'cache-valid',
        expiredCacheName,
        'other-cache'
      ]);
      
      await cleanExpiredCache();
      
      expect(caches.delete).toHaveBeenCalledWith(expiredCacheName);
      expect(caches.delete).not.toHaveBeenCalledWith('cache-valid');
      expect(caches.delete).not.toHaveBeenCalledWith('other-cache');
    });
  });
});
