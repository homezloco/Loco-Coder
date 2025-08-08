/**
 * Persistence Monitor Service
 * 
 * Provides monitoring and analytics for the multi-tiered persistence system,
 * tracking performance, availability and success rates across different storage methods.
 */

import logger from './logger';
const log = logger.ns('monitor:persistence');

// Storage for statistics
let stats = {
  api: {
    requests: 0,
    successful: 0,
    failed: 0,
    lastSuccess: null,
    lastFailure: null,
    averageResponseTime: 0
  },
  indexedDB: {
    requests: 0,
    successful: 0,
    failed: 0,
    lastSuccess: null,
    lastFailure: null,
    averageResponseTime: 0
  },
  localStorage: {
    requests: 0,
    successful: 0,
    failed: 0,
    lastSuccess: null,
    lastFailure: null
  },
  sessionStorage: {
    requests: 0,
    successful: 0,
    failed: 0,
    lastSuccess: null,
    lastFailure: null
  },
  fallbacks: {
    apiToIndexedDB: 0,
    indexedDBToLocalStorage: 0,
    localStorageToSessionStorage: 0,
    toDemo: 0
  },
  lastSource: null,
  startTime: Date.now()
};

/**
 * Record a storage operation attempt
 * @param {string} storageType - Type of storage ('api', 'indexedDB', 'localStorage', 'sessionStorage')
 * @param {boolean} success - Whether the operation was successful
 * @param {number} responseTime - Response time in milliseconds (optional)
 */
export const recordStorageOperation = (storageType, success, responseTime = null) => {
  if (!stats[storageType]) return;
  
  // Update statistics
  stats[storageType].requests++;
  
  if (success) {
    stats[storageType].successful++;
    stats[storageType].lastSuccess = new Date().toISOString();
    
    // Update average response time if provided
    if (responseTime !== null && storageType !== 'localStorage' && storageType !== 'sessionStorage') {
      const current = stats[storageType].averageResponseTime;
      const count = stats[storageType].successful;
      stats[storageType].averageResponseTime = (current * (count - 1) + responseTime) / count;
    }
  } else {
    stats[storageType].failed++;
    stats[storageType].lastFailure = new Date().toISOString();
  }
};

/**
 * Record a fallback event
 * @param {string} fallbackType - Type of fallback that occurred
 */
export const recordFallback = (fallbackType) => {
  if (stats.fallbacks[fallbackType] !== undefined) {
    stats.fallbacks[fallbackType]++;
  }
};

/**
 * Record the data source used for a project operation
 * @param {string} source - Source of the data
 */
export const recordDataSource = (source) => {
  stats.lastSource = source;
};

/**
 * Record operation execution time
 * @param {string} operationName - Name of the operation
 * @param {number} timeMs - Time in milliseconds
 */
export const recordOperationTime = (operationName, timeMs) => {
  // Store operation timing in stats if needed
  // For now just log it if it's taking too long
  if (timeMs > 500) {
    log.warn(`⏱️ Performance: ${operationName} took ${timeMs.toFixed(2)}ms`);
  }
};

/**
 * Get current persistence statistics
 * @returns {Object} Current statistics
 */
export const getStatistics = () => {
  return {
    ...stats,
    uptime: Date.now() - stats.startTime,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get success rates for each storage type
 * @returns {Object} Success rates
 */
export const getSuccessRates = () => {
  const rates = {};
  
  Object.keys(stats).forEach(key => {
    if (typeof stats[key] === 'object' && stats[key].requests > 0) {
      rates[key] = (stats[key].successful / stats[key].requests) * 100;
    }
  });
  
  return rates;
};

/**
 * Reset monitoring statistics
 */
export const resetStatistics = () => {
  Object.keys(stats).forEach(key => {
    if (typeof stats[key] === 'object') {
      stats[key].requests = 0;
      stats[key].successful = 0;
      stats[key].failed = 0;
      stats[key].lastSuccess = null;
      stats[key].lastFailure = null;
      
      if (stats[key].averageResponseTime !== undefined) {
        stats[key].averageResponseTime = 0;
      }
    } else if (key === 'fallbacks') {
      Object.keys(stats.fallbacks).forEach(fallback => {
        stats.fallbacks[fallback] = 0;
      });
    }
  });
  
  stats.startTime = Date.now();
};

/**
 * Get a diagnostic report of the persistence system
 * @returns {Object} Diagnostic report
 */
export const getDiagnosticReport = () => {
  const successRates = getSuccessRates();
  
  return {
    statistics: getStatistics(),
    successRates,
    healthStatus: {
      api: successRates.api >= 90 ? 'healthy' : successRates.api >= 50 ? 'degraded' : 'unhealthy',
      indexedDB: successRates.indexedDB >= 90 ? 'healthy' : successRates.indexedDB >= 50 ? 'degraded' : 'unhealthy',
      localStorage: successRates.localStorage >= 90 ? 'healthy' : successRates.localStorage >= 50 ? 'degraded' : 'unhealthy',
      sessionStorage: successRates.sessionStorage >= 90 ? 'healthy' : successRates.sessionStorage >= 50 ? 'degraded' : 'unhealthy'
    },
    mostReliableStorage: Object.entries(successRates)
      .filter(([key]) => ['api', 'indexedDB', 'localStorage', 'sessionStorage'].includes(key))
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
  };
};

export default {
  recordStorageOperation,
  recordFallback,
  recordDataSource,
  getStatistics,
  getSuccessRates,
  resetStatistics,
  getDiagnosticReport
};
