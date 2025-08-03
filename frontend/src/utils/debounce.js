/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @param {boolean} immediate - Whether to invoke the function immediately instead of waiting
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * 
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @returns {Function} - The throttled function
 */
export function throttle(func, wait = 300) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall < wait) {
      return;
    }
    lastCall = now;
    return func.apply(this, args);
  };
}

/**
 * Creates a function that will only be called if it hasn't been called in the last wait milliseconds
 * with the same arguments.
 * 
 * @param {Function} func - The function to memoize and debounce
 * @param {number} wait - The number of milliseconds to wait
 * @returns {Function} - The memoized and debounced function
 */
export function debouncedMemo(func, wait = 300) {
  const cache = new Map();
  
  return function(...args) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < wait) {
      return cached.result;
    }
    
    const result = func.apply(this, args);
    cache.set(key, { result, timestamp: Date.now() });
    
    // Clean up old cache entries
    for (const [k, v] of cache.entries()) {
      if (Date.now() - v.timestamp > wait * 10) {
        cache.delete(k);
      }
    }
    
    return result;
  };
}
