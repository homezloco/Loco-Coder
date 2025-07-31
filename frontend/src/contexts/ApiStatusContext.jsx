import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../api';

// Configuration for API health checks
const API_HEALTH_CHECK_CONFIG = {
  initialTimeout: 10000,      // 10 seconds for initial check
  normalTimeout: 5000,        // 5 seconds for regular checks
  maxRetries: 2,              // Maximum number of retry attempts
  retryDelay: 1000,           // Initial delay between retries in ms
  backoffFactor: 2,           // Exponential backoff factor
  checkInterval: 30000,       // 30 seconds between checks
  offlineThreshold: 2,        // Number of consecutive failures before going offline
  componentCheckInterval: 60000, // 60 seconds between component health checks
  criticalComponents: ['database', 'ollama', 'filesystem'], // Critical components that affect overall status
};

// Status types
const STATUS = {
  CHECKING: 'checking',
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  RATE_LIMITED: 'rate_limited',
  ERROR: 'error',
  OFFLINE: 'offline'
};

// Create the context
const ApiStatusContext = createContext();

// Provider component
export const ApiStatusProvider = ({ children }) => {
  const [status, setStatus] = useState(STATUS.CHECKING);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [components, setComponents] = useState({});
  const [metrics, setMetrics] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const isMounted = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Update component status and determine overall status
  const updateComponentStatus = useCallback((component, status, details = {}) => {
    setComponents(prev => {
      const updated = { ...prev, [component]: { status, ...details, lastUpdated: new Date() } };
      
      // Check if any critical components are down
      const criticalStatus = API_HEALTH_CHECK_CONFIG.criticalComponents.some(
        comp => updated[comp]?.status === 'down'
      ) ? 'degraded' : 'healthy';
      
      return updated;
    });
  }, []);

  // Check a specific component's health
  const checkComponentHealth = useCallback(async (component) => {
    if (!isMounted.current) return;
    
    try {
      const result = await api.checkHealth({
        component,
        timeout: API_HEALTH_CHECK_CONFIG.normalTimeout,
        retries: 1
      });
      
      if (isMounted.current) {
        updateComponentStatus(component, result.status, {
          responseTime: result.responseTime,
          details: result.details,
          error: null
        });
      }
      
      return result;
    } catch (error) {
      if (isMounted.current) {
        updateComponentStatus(component, 'down', {
          error: error.message,
          lastError: new Date()
        });
      }
      throw error;
    }
  }, [updateComponentStatus]);

  // Check all components' health
  const checkAllComponents = useCallback(async () => {
    if (!isMounted.current) return;
    
    const componentChecks = API_HEALTH_CHECK_CONFIG.criticalComponents.map(component => 
      checkComponentHealth(component).catch(() => null)
    );
    
    await Promise.all(componentChecks);
  }, [checkComponentHealth]);

  // Check API status with retry logic
  const checkStatus = useCallback(async (isInitialCheck = false) => {
    if (!isMounted.current) return;

    const { 
      initialTimeout, 
      normalTimeout, 
      maxRetries, 
      retryDelay, 
      backoffFactor,
      offlineThreshold
    } = API_HEALTH_CHECK_CONFIG;

    const timeout = isInitialCheck ? initialTimeout : normalTimeout;
    let lastError = null;
    let retryCount = 0;

    // Set checking state
    setStatus(STATUS.CHECKING);
    setError(null);

    // Try with retries
    while (retryCount <= maxRetries) {
      try {
        const startTime = Date.now();
        const result = await api.checkHealth({ 
          checkType: isInitialCheck ? 'startup' : 'readiness',
          timeout,
          retries: 0 // We handle retries manually
        });
        
        const responseTime = Date.now() - startTime;
        
        if (!isMounted.current) return;
        
        // Update last checked time and metrics
        const now = new Date();
        setLastChecked(now);
        setMetrics(prev => ({
          ...prev,
          lastResponseTime: responseTime,
          lastCheck: now,
          uptime: result.uptime,
          version: result.version
        }));
        
        // Update component statuses if available
        if (result.components) {
          Object.entries(result.components).forEach(([name, component]) => {
            updateComponentStatus(name, component.status, {
              ...component,
              lastUpdated: now
            });
          });
        }
        
        // Determine overall status based on result and component health
        let overallStatus = result.status;
        let statusMessage = result.message;
        
        // Check if any critical components are down
        const criticalComponentsDown = API_HEALTH_CHECK_CONFIG.criticalComponents.some(
          comp => components[comp]?.status === 'down'
        );
        
        if (criticalComponentsDown) {
          overallStatus = 'degraded';
          statusMessage = 'Critical components are experiencing issues';
        }
        
        // Update status
        setStatus(overallStatus);
        
        if (overallStatus === 'healthy') {
          setConsecutiveFailures(0);
          if (!isInitialized) setIsInitialized(true);
        } else if (overallStatus === 'degraded') {
          setError({ 
            message: statusMessage,
            checks: result.checks || {},
            components: result.components || {}
          });
          setConsecutiveFailures(0);
          if (!isInitialized) setIsInitialized(true);
        } else if (overallStatus === 'rate_limited') {
          const retryAfter = result.retryAfter || 5;
          setError({
            message: `Rate limited. Please try again in ${retryAfter} seconds.`,
            retryAfter
          });
          setStatus(STATUS.RATE_LIMITED);
          return { 
            status: STATUS.RATE_LIMITED, 
            responseTime, 
            timestamp: now,
            retryAfter
          };
        }
        
        return { 
          status: overallStatus, 
          responseTime, 
          timestamp: now,
          checks: result.checks || {},
          components: result.components || {}
        };
        
      } catch (err) {
        lastError = err;
        
        if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
          console.warn(`API check timed out (attempt ${retryCount + 1}/${maxRetries + 1})`);
        } else {
          console.error('API check failed:', err);
        }
        
        // Update error state
        if (isMounted.current) {
          setError({
            message: err.message || 'Failed to check API status',
            code: err.code,
            status: err.status,
            response: err.response?.data
          });
        }
        
        // Calculate delay with exponential backoff
        const delay = retryDelay * Math.pow(backoffFactor, retryCount);
        
        // Wait before retry or fail if max retries reached
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
        } else {
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    if (isMounted.current) {
      const newFailures = consecutiveFailures + 1;
      setConsecutiveFailures(newFailures);
      
      if (newFailures >= offlineThreshold) {
        setStatus(STATUS.OFFLINE);
      } else {
        setStatus(STATUS.ERROR);
      }
      
      throw lastError || new Error('API check failed after multiple attempts');
    }
  }, [consecutiveFailures, components, isInitialized, updateComponentStatus]);

  // Set up polling for API status
  useEffect(() => {
    let statusIntervalId;
    let componentsIntervalId;
    
    const setupPolling = async () => {
      try {
        // Initial checks
        await Promise.all([
          checkStatus(true), // Initial status check with longer timeout
          checkAllComponents() // Initial component health check
        ]);
        
        if (isMounted.current) {
          // Start status polling
          statusIntervalId = setInterval(() => {
            checkStatus().catch(console.error);
          }, API_HEALTH_CHECK_CONFIG.checkInterval);
          
          // Start component health polling (less frequent)
          componentsIntervalId = setInterval(() => {
            checkAllComponents().catch(console.error);
          }, API_HEALTH_CHECK_CONFIG.componentCheckInterval);
        }
      } catch (error) {
        console.error('Failed to set up API monitoring:', error);
      }
    };
    
    setupPolling();
    
    return () => {
      if (statusIntervalId) clearInterval(statusIntervalId);
      if (componentsIntervalId) clearInterval(componentsIntervalId);
    };
  }, [checkStatus, checkAllComponents]);
  
  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored. Refreshing API status...');
      Promise.all([
        checkStatus(true),
        checkAllComponents()
      ]).catch(console.error);
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [checkStatus, checkAllComponents]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    status,
    lastChecked,
    error,
    components,
    metrics,
    isInitialized,
    isOnline: status === STATUS.HEALTHY || status === STATUS.DEGRADED,
    isLoading: status === STATUS.CHECKING,
    isDegraded: status === STATUS.DEGRADED,
    isRateLimited: status === STATUS.RATE_LIMITED,
    isOffline: status === STATUS.OFFLINE,
    checkStatus,
    checkComponent: checkComponentHealth,
    refreshAll: async () => {
      await Promise.all([
        checkStatus(),
        checkAllComponents()
      ]);
    }
  }), [
    status, 
    lastChecked, 
    error, 
    components, 
    metrics, 
    isInitialized, 
    checkStatus, 
    checkComponentHealth, 
    checkAllComponents
  ]);

  // Context value

  return (
    <ApiStatusContext.Provider value={contextValue}>
      {children}
    </ApiStatusContext.Provider>
  );
};

/**
 * Custom hook for using the API status
 * @returns {Object} API status context with the following properties:
 * - status: Current status ('checking' | 'healthy' | 'degraded' | 'rate_limited' | 'error' | 'offline')
 * - lastChecked: Date of last successful check
 * - error: Error object if any
 * - components: Object with status of individual components
 * - metrics: Performance and version metrics
 * - isOnline: Boolean indicating if API is reachable
 * - isLoading: Boolean indicating if a check is in progress
 * - isDegraded: Boolean indicating if API is in degraded state
 * - isRateLimited: Boolean indicating if API is rate limited
 * - isOffline: Boolean indicating if API is offline
 * - checkStatus: Function to manually trigger a status check
 * - checkComponent: Function to check a specific component's health
 * - refreshAll: Function to refresh all statuses
 */
const useApiStatus = () => {
  const context = useContext(ApiStatusContext);
  if (context === undefined) {
    throw new Error('useApiStatus must be used within an ApiStatusProvider');
  }
  return context;
};

export { ApiStatusContext, useApiStatus };
