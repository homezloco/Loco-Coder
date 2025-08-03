import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import ToastNotification from './ToastNotification';

// Create context for app-wide feedback
const FeedbackContext = createContext(null);

/**
 * Provider component for centralized application feedback
 * Includes multiple fallbacks for notifications and user feedback
 */
export const FeedbackProvider = ({ children, isDarkMode = false }) => {
  // Toast notification refs
  const toastRef = useRef(null);
  const [activeToast, setActiveToast] = useState(null);
  const [toastQueue, setToastQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Toast message history for fallback and debugging
  const [messageHistory, setMessageHistory] = useState([]);
  
  // Navigation history for breadcrumbs
  const [navigationPath, setNavigationPath] = useState([]);

  // Process toast queue when activeToast changes or queue updates
  const processQueue = useCallback(() => {
    if (toastQueue.length > 0 && !activeToast && !isProcessingQueue) {
      setIsProcessingQueue(true);
      
      // Get next toast from queue
      const nextToast = toastQueue[0];
      const newQueue = toastQueue.slice(1);
      setToastQueue(newQueue);
      
      // Set as active toast
      setActiveToast(nextToast);
      
      // Add to history for persistence and fallback
      setMessageHistory(prev => [
        { 
          ...nextToast, 
          timestamp: new Date().toISOString() 
        }, 
        ...prev.slice(0, 9)
      ]); // Keep last 10 messages
      
      // Complete processing
      setIsProcessingQueue(false);
    }
  }, [toastQueue, activeToast, isProcessingQueue]);

  // Show info toast
  const showInfo = useCallback((message, options = {}) => {
    const toast = {
      id: Date.now().toString(),
      message,
      type: 'info',
      ...options
    };
    
    setToastQueue(prev => [...prev, toast]);
    processQueue();
  }, [processQueue]);
  
  // Effect to process queue
  React.useEffect(() => {
    if (!activeToast) {
      processQueue();
    }
  }, [activeToast, toastQueue, processQueue]);
  
  // Show a toast notification with fallbacks
  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    // Primary approach: Use the toast ref if available
    if (toastRef.current && !activeToast) {
      setActiveToast({ message, type, duration });
      toastRef.current.show(message);
      return;
    }
    
    // Fallback 1: Queue the toast if another is active
    setToastQueue(prev => [...prev, { message, type, duration }]);
    
    // Fallback 2: Console log for debugging and API call failures
    console.log(`Toast ${type}: ${message}`);
    
    // Fallback 3: Use browser native notification if allowed
    try {
      if (Notification && Notification.permission === 'granted') {
        new Notification(type.toUpperCase(), { body: message });
      }
    } catch (err) {
      // Silent fail for unsupported browsers
    }
  }, [activeToast, setToastQueue]);
  
  // Convenience methods for different toast types
  const showSuccessToast = useCallback((message, duration = 5000) => {
    showToast(message, 'success', duration);
  }, [showToast]);
  
  const showErrorToast = useCallback((message, duration = 8000) => {
    showToast(message, 'error', duration);
  }, [showToast]);
  
  const showWarningToast = useCallback((message, duration = 6000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);
  
  const showInfoToast = useCallback((message, duration = 5000) => {
    showToast(message, 'info', duration);
  }, [showToast]);
  
  // Clear current toast
  const clearToast = useCallback(() => {
    if (toastRef.current) {
      toastRef.current.hide();
    }
    setActiveToast(null);
  }, []);
  
  // Update navigation path for breadcrumbs
  const updateNavigationPath = useCallback((paths) => {
    setNavigationPath(paths);
    
    // Store in sessionStorage as fallback
    try {
      sessionStorage.setItem('navigationPath', JSON.stringify(paths));
    } catch (err) {
      console.error('Failed to save navigation path:', err);
    }
  }, []);
  
  // Navigate to a specific path
  const navigateTo = useCallback((path, index) => {
    // If path exists in current navigation history, truncate to that point
    if (index >= 0 && index < navigationPath.length) {
      updateNavigationPath(navigationPath.slice(0, index + 1));
    }
    
    // Dispatch custom navigation event for routing components
    const navEvent = new CustomEvent('app:navigation', {
      detail: { path, index }
    });
    window.dispatchEvent(navEvent);
    
    return path;
  }, [navigationPath, updateNavigationPath]);
  
  // Add a new path to navigation history
  const addNavigationPath = useCallback((newPath) => {
    updateNavigationPath([...navigationPath, newPath]);
  }, [navigationPath, updateNavigationPath]);
  
  // Handle toast closing
  const handleToastClose = useCallback(() => {
    setActiveToast(null);
  }, []);
  
  // Context value with all feedback methods
  const contextValue = {
    // Toast notifications
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    clearToast,
    messageHistory,
    showInfo,
    // Navigation
    navigationPath,
    updateNavigationPath,
    navigateTo,
    addNavigationPath,
  };
  
  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      
      {/* Toast notification component */}
      <ToastNotification
        ref={toastRef}
        type={activeToast?.type || 'info'}
        message={activeToast?.message || ''}
        duration={activeToast?.duration || 5000}
        onClose={handleToastClose}
        isDarkMode={isDarkMode}
        position="bottom-right"
      />
    </FeedbackContext.Provider>
  );
};

FeedbackProvider.propTypes = {
  children: PropTypes.node.isRequired,
  isDarkMode: PropTypes.bool
};

// Custom hook for using feedback context
export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

export default FeedbackContext;
