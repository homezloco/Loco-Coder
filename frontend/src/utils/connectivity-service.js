/**
 * Connectivity Service
 * 
 * Provides robust online/offline detection with active API health checks
 * and maintains a central source of truth for application connectivity state.
 */

// Configuration
const CONFIG = {
  healthCheckInterval: 30000,        // Check connectivity every 30 seconds
  healthCheckEndpoints: [            // Multiple endpoints to check in order
    '/api/health',
    '/health',
    '/api/status'
  ],
  healthCheckTimeout: 5000,          // 5 second timeout for health checks
  requiredConsecutiveFailures: 2,    // Require multiple failures before going offline
  requiredConsecutiveSuccesses: 1    // Require only one success to go back online
};

// State
let connectionState = {
  isOnline: navigator.onLine,        // Start with browser's online status
  lastCheck: null,
  failureCount: 0,
  successCount: 0,
  isCheckInProgress: false,
  source: 'initial'                  // Where the current status came from
};

// Listeners
const listeners = new Set();

/**
 * Subscribe to connectivity changes
 * @param {Function} listener - Callback function that receives connectionState
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToConnectivity(listener) {
  listeners.add(listener);
  
  // Immediately notify with current state
  setTimeout(() => listener(getConnectionState()), 0);
  
  // Return unsubscribe function
  return () => listeners.delete(listener);
}

/**
 * Update connection state and notify listeners
 * @param {Object} newState - New state to merge with existing state
 */
function updateConnectionState(newState) {
  const oldState = { ...connectionState };
  connectionState = { ...connectionState, ...newState };
  
  // Only notify if online status changed
  if (oldState.isOnline !== connectionState.isOnline) {
    notifyListeners();
  }
}

/**
 * Notify all listeners of current connection state
 */
function notifyListeners() {
  const state = getConnectionState();
  listeners.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.error('Error in connectivity listener:', error);
    }
  });
}

/**
 * Get current connection state
 * @returns {Object} - Current connection state
 */
export function getConnectionState() {
  return { ...connectionState };
}

/**
 * Active health check to determine true online status
 * Tests actual API connectivity rather than just network connectivity
 */
async function performHealthCheck() {
  if (connectionState.isCheckInProgress) return;
  
  try {
    connectionState.isCheckInProgress = true;
    
    // Try each endpoint in order until one succeeds
    for (const endpoint of CONFIG.healthCheckEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.healthCheckTimeout);
        
        const response = await fetch(endpoint, { 
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Any response (even errors) means we have connectivity
        connectionState.successCount++;
        connectionState.failureCount = 0;
        
        if (connectionState.successCount >= CONFIG.requiredConsecutiveSuccesses) {
          updateConnectionState({
            isOnline: true,
            lastCheck: new Date(),
            source: 'health-check-success',
            successCount: 0  // Reset after updating
          });
        }
        
        return; // Exit after first successful endpoint
      } catch (endpointError) {
        console.log(`Health check failed for endpoint ${endpoint}:`, endpointError.name);
        // Continue to next endpoint
      }
    }
    
    // If we get here, all endpoints failed
    connectionState.failureCount++;
    connectionState.successCount = 0;
    
    if (connectionState.failureCount >= CONFIG.requiredConsecutiveFailures) {
      updateConnectionState({
        isOnline: false,
        lastCheck: new Date(),
        source: 'health-check-failure',
        failureCount: 0  // Reset after updating
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
  } finally {
    connectionState.isCheckInProgress = false;
  }
}

/**
 * Handle browser online event
 */
function handleOnline() {
  console.log('Browser reports online status');
  updateConnectionState({
    isOnline: true,
    source: 'browser-event'
  });
  
  // Verify with health check
  performHealthCheck();
}

/**
 * Handle browser offline event
 */
function handleOffline() {
  console.log('Browser reports offline status');
  updateConnectionState({
    isOnline: false,
    source: 'browser-event'
  });
}

/**
 * Initialize the connectivity service
 */
export function initConnectivityService() {
  // Listen to browser online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Perform initial health check
  performHealthCheck();
  
  // Set up recurring health checks
  const intervalId = setInterval(performHealthCheck, CONFIG.healthCheckInterval);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(intervalId);
  };
}

/**
 * Force an immediate connectivity check
 * @returns {Promise<boolean>} - Promise resolving to true if online
 */
export async function checkConnectivityNow() {
  await performHealthCheck();
  return connectionState.isOnline;
}

/**
 * Force online mode regardless of actual connectivity
 * Useful for development or as a user override
 */
export function forceOnlineMode() {
  updateConnectionState({
    isOnline: true,
    source: 'force-online',
    failureCount: 0,
    successCount: CONFIG.requiredConsecutiveSuccesses
  });
  
  return getConnectionState();
}

// Initialize on import
initConnectivityService();

export default {
  subscribeToConnectivity,
  getConnectionState,
  checkConnectivityNow,
  forceOnlineMode
};
