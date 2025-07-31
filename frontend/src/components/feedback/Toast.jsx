import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast component for displaying temporary notifications
 * @param {Object} props - Component props
 * @param {string} [props.type='info'] - Type of toast ('success', 'error', 'warning', 'info')
 * @param {string} props.message - Message to display
 * @param {number} [props.duration=5000] - Duration in milliseconds before auto-dismiss
 * @param {Function} onDismiss - Callback when toast is dismissed
 * @param {string} [props.position='bottom-right'] - Position of the toast ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 */
const Toast = ({
  type = 'info',
  message,
  duration = 5000,
  onDismiss,
  position = 'bottom-right'
}) => {
  const timerRef = useRef(null);

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onDismiss?.();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onDismiss]);

  // Get appropriate icon and colors based on toast type
  const getToastStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderRadius: '4px',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
      maxWidth: '350px',
      margin: '8px',
      zIndex: 1000,
    };

    const typeStyles = {
      success: {
        backgroundColor: '#f0fdf4',
        color: '#166534',
        borderLeft: '4px solid #22c55e',
      },
      error: {
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        borderLeft: '4px solid #ef4444',
      },
      warning: {
        backgroundColor: '#fffbeb',
        color: '#92400e',
        borderLeft: '4px solid #f59e0b',
      },
      info: {
        backgroundColor: '#eff6ff',
        color: '#1e40af',
        borderLeft: '4px solid #3b82f6',
      },
    };

    return {
      ...baseStyles,
      ...(typeStyles[type] || typeStyles.info),
    };
  };

  // Get icon based on type
  const getIcon = () => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || 'ℹ️';
  };

  // Position styles
  const getPositionStyles = () => {
    const positions = {
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
    };
    return positions[position] || positions['bottom-right'];
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            ...getPositionStyles(),
            zIndex: 1000,
          }}
        >
          <div style={getToastStyles()}>
            <span style={{ marginRight: '12px', fontSize: '20px' }}>{getIcon()}</span>
            <div style={{ flex: 1 }}>{message}</div>
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                marginLeft: '12px',
                color: 'inherit',
                opacity: 0.7,
                fontSize: '18px',
                lineHeight: 1,
                '&:hover': {
                  opacity: 1,
                },
              }}
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Toast container component to manage multiple toasts
 */
const ToastContainer = ({ toasts = [], onDismiss }) => {
  // If using messageHistory from FeedbackContext
  const messages = Array.isArray(toasts) ? toasts : [];
  
  return (
    <div style={{
      position: 'fixed',
      zIndex: 1000,
      right: '20px',
      bottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none',
    }}>
      {messages.map((toast) => (
        <Toast
          key={toast.id || toast.timestamp || Math.random().toString(36).substr(2, 9)}
          type={toast.type || 'info'}
          message={toast.message || toast.text || 'Notification'}
          duration={toast.duration || 5000}
          onDismiss={() => onDismiss?.(toast.id || toast.timestamp)}
        />
      ))}
    </div>
  );
};

// Export both the Toast component and a helper function to show toasts
let toastId = 0;
const toast = (message, options = {}) => {
  const id = toastId++;
  const { duration = 5000, type = 'info', position = 'bottom-right' } = options;
  
  // This would be connected to a toast context in a real app
  const event = new CustomEvent('show-toast', {
    detail: {
      id,
      message,
      type,
      duration,
      position,
    },
  });
  
  window.dispatchEvent(event);
  return id;
};

// Helper methods for different toast types
toast.success = (message, options = {}) =>
  toast(message, { ...options, type: 'success' });

toast.error = (message, options = {}) =>
  toast(message, { ...options, type: 'error' });

toast.warning = (message, options = {}) =>
  toast(message, { ...options, type: 'warning' });

toast.info = (message, options = {}) =>
  toast(message, { ...options, type: 'info' });

export { Toast, ToastContainer, toast };

export const showToast = (message, options = {}) => {
  return toast(message, options);
};

export default Toast;
