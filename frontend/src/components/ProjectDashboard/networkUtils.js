/**
 * Network Utilities for checking connectivity
 * Provides robust internet and API connectivity checks with multiple fallbacks
 */

/**
 * Check if the device has internet connectivity
 * Uses multiple strategies to determine connectivity status
 * 
 * @returns {Promise<{isOnline: boolean, method: string}>} Result object with connectivity status
 */
export async function checkInternetConnectivity() {
  try {
    // 1. Navigator.onLine API (not always reliable but quick check)
    const navigatorOnline = typeof navigator !== 'undefined' && navigator.onLine;
    
    if (!navigatorOnline) {
      return { isOnline: false, method: 'navigator' };
    }
    
    // 2. Try to fetch a known reliable endpoint with cache busting
    const timestamp = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      // Try multiple reliable services
      const endpoints = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
        'https://www.microsoft.com/favicon.ico'
      ];
      
      // Try each endpoint until one succeeds
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${endpoint}?_=${timestamp}`, {
            method: 'HEAD',  // HEAD is lightweight
            mode: 'no-cors',  // Avoid CORS issues
            cache: 'no-store',  // Don't use cache
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return { isOnline: true, method: 'fetch' };
        } catch (e) {
          // Continue to next endpoint
          console.log(`Connectivity check to ${endpoint} failed, trying next...`);
        }
      }
      
      // If all endpoints fail, return false
      return { isOnline: false, method: 'fetch-all-failed' };
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Connectivity fetch check failed:', error);
      
      // Fall back to navigator.onLine if fetch fails
      return { isOnline: navigatorOnline, method: 'navigator-fallback' };
    }
  } catch (error) {
    console.error('Error in connectivity check:', error);
    // Best effort: if we can execute code, we're probably online
    return { isOnline: true, method: 'error-fallback' };
  }
}
