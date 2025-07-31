import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

// Define toast types for consistent usage across the app
export const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Toast Notification Component with multiple fallbacks and guaranteed visibility
 * Provides a consistent way to show feedback across the application
 */
const ToastNotification = forwardRef(({
  type = 'info',
  message = '',
  duration = 5000,
  position = 'bottom-right',
  onClose,
  isDarkMode = false
}, ref) => {
  const [visible, setVisible] = useState(false);
  const [animation, setAnimation] = useState('');
  const timeoutRef = useRef(null);
  const toastRef = useRef(null);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    show: (msg = message) => {
      setMessage(msg);
      showToast();
    },
    hide: () => hideToast()
  }));
  
  // Internal state for message to allow dynamic updates
  const [internalMessage, setInternalMessage] = useState(message);
  
  // Update message if prop changes
  useEffect(() => {
    setInternalMessage(message);
  }, [message]);
  
  // Set message function with fallback
  const setMessage = (msg) => {
    // Primary approach
    setInternalMessage(msg);
    
    // Fallback: direct DOM update if state updates fail
    try {
      if (toastRef.current) {
        const messageEl = toastRef.current.querySelector('.toast-message');
        if (messageEl) {
          messageEl.textContent = msg;
        }
      }
    } catch (err) {
      console.error('Toast fallback message update failed:', err);
    }
  };
  
  // Show toast with animation
  const showToast = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Make toast visible with slide-in animation
    setVisible(true);
    setAnimation('toast-slide-in');
    
    // Auto-dismiss after duration (if positive)
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }
    
    // Guaranteed visibility fallback
    try {
      if (toastRef.current) {
        toastRef.current.style.setProperty('visibility', 'visible', 'important');
        toastRef.current.style.setProperty('opacity', '1', 'important');
        toastRef.current.style.setProperty('display', 'flex', 'important');
      }
    } catch (err) {
      console.error('Toast visibility fallback failed:', err);
    }
  };
  
  // Hide toast with animation
  const hideToast = () => {
    // Slide-out animation before hiding
    setAnimation('toast-slide-out');
    
    // Actually hide after animation completes
    setTimeout(() => {
      setVisible(false);
      
      // Call onClose callback if provided
      if (onClose) {
        onClose();
      }
    }, 300); // Match animation duration
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Auto-show if message is provided initially
  useEffect(() => {
    if (message) {
      showToast();
    }
  }, []);
  
  // Position styles
  const getPositionStyle = () => {
    switch(position) {
      case 'top-left':
        return { top: '16px', left: '16px' };
      case 'top-center':
        return { top: '16px', left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { top: '16px', right: '16px' };
      case 'bottom-left':
        return { bottom: '16px', left: '16px' };
      case 'bottom-center':
        return { bottom: '16px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
      default:
        return { bottom: '16px', right: '16px' };
    }
  };
  
  // Type-specific icon and styles
  const getTypeStyles = () => {
    switch(type) {
      case 'success':
        return {
          icon: '✓',
          backgroundColor: isDarkMode ? '#065f46' : '#d1fae5',
          color: isDarkMode ? '#d1fae5' : '#065f46',
          borderColor: isDarkMode ? '#059669' : '#a7f3d0'
        };
      case 'error':
        return {
          icon: '✕',
          backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
          color: isDarkMode ? '#fee2e2' : '#7f1d1d',
          borderColor: isDarkMode ? '#ef4444' : '#fecaca'
        };
      case 'warning':
        return {
          icon: '⚠',
          backgroundColor: isDarkMode ? '#78350f' : '#fef3c7',
          color: isDarkMode ? '#fef3c7' : '#78350f',
          borderColor: isDarkMode ? '#f59e0b' : '#fde68a'
        };
      case 'info':
      default:
        return {
          icon: 'ℹ',
          backgroundColor: isDarkMode ? '#1e40af' : '#dbeafe',
          color: isDarkMode ? '#dbeafe' : '#1e40af',
          borderColor: isDarkMode ? '#3b82f6' : '#bfdbfe'
        };
    }
  };
  
  const typeStyles = getTypeStyles();
  
  // Only render when visible
  if (!visible) {
    return null;
  }
  
  // Base styles with fallback visibility
  const styles = {
    toastContainer: {
      position: 'fixed',
      zIndex: 9999,
      minWidth: '280px',
      maxWidth: '450px',
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: typeStyles.backgroundColor,
      color: typeStyles.color,
      border: `1px solid ${typeStyles.borderColor}`,
      visibility: 'visible !important', // Guarantee visibility
      opacity: '1 !important',
      ...getPositionStyle()
    },
    icon: {
      marginRight: '12px',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
      visibility: 'visible !important', // Guarantee visibility
    },
    message: {
      flex: 1,
      fontSize: '14px',
      visibility: 'visible !important', // Guarantee visibility
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: typeStyles.color,
      marginLeft: '12px',
      cursor: 'pointer',
      fontSize: '16px',
      padding: '4px',
      visibility: 'visible !important', // Guarantee visibility
    }
  };
  
  // CSS Animations
  const animationStyles = `
    @keyframes toast-slide-in {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes toast-slide-out {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100%); opacity: 0; }
    }
    
    .toast-slide-in {
      animation: toast-slide-in 0.3s forwards;
    }
    
    .toast-slide-out {
      animation: toast-slide-out 0.3s forwards;
    }
  `;
  
  return (
    <>
      <style>{animationStyles}</style>
      <div 
        ref={toastRef}
        className={`toast-notification ${animation}`}
        style={styles.toastContainer}
        role="alert"
        aria-live="assertive"
      >
        <div style={styles.icon}>{typeStyles.icon}</div>
        <div className="toast-message" style={styles.message}>
          {internalMessage}
        </div>
        <button 
          style={styles.closeButton}
          onClick={hideToast}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </>
  );
});

ToastNotification.displayName = 'ToastNotification';

ToastNotification.propTypes = {
  type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  message: PropTypes.string,
  duration: PropTypes.number,
  position: PropTypes.oneOf([
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ]),
  onClose: PropTypes.func,
  isDarkMode: PropTypes.bool
};

export default ToastNotification;
