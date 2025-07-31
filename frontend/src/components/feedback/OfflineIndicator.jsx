import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFeedback } from './FeedbackContext';

/**
 * OfflineIndicator Component
 * Provides a visual indicator when the application is offline
 * with multiple fallbacks for guaranteed visibility
 */
const OfflineIndicator = ({ 
  position = 'bottom-right', 
  isDarkMode = false,
  onRetryClick = null
}) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useFeedback();

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsVisible(false);
      showToast({
        type: 'success',
        message: 'You are back online!',
        autoClose: true,
        duration: 3000
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsVisible(true);
      showToast({
        type: 'warning',
        message: 'You are offline. Some features may be unavailable.',
        autoClose: false
      });
    };

    // Check connection status every 30 seconds as a fallback
    const connectionCheckInterval = setInterval(() => {
      const online = navigator.onLine;
      if (isOffline === online) {
        setIsOffline(!online);
        setIsVisible(!online);
      }
    }, 30000);

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOffline(!navigator.onLine);
    setIsVisible(!navigator.onLine);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
    };
  }, [isOffline, showToast]);

  // Handle retry button click
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    
    // Try to reconnect - attempt to fetch a small resource
    fetch('/api/health-check', { 
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
      .then(response => {
        if (response.ok) {
          setIsOffline(false);
          setIsVisible(false);
          showToast({
            type: 'success',
            message: 'Connection restored!',
            autoClose: true
          });
          if (onRetryClick) onRetryClick(true);
        } else {
          throw new Error('Still offline');
        }
      })
      .catch(() => {
        showToast({
          type: 'error',
          message: 'Still offline. Please check your connection.',
          autoClose: true
        });
        if (onRetryClick) onRetryClick(false);
      });
  };

  // Don't render if online
  if (!isOffline || !isVisible) {
    return null;
  }

  // Position styles
  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return { top: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'top-center':
        return { top: '20px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'bottom-center':
        return { bottom: '20px', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
      default:
        return { bottom: '20px', right: '20px' };
    }
  };

  // Color scheme based on dark mode
  const colors = isDarkMode ? {
    background: '#1e293b',
    text: '#e2e8f0',
    icon: '#f97316',
    border: '#334155',
    buttonBg: '#334155',
    buttonHover: '#475569',
    buttonText: '#f8fafc'
  } : {
    background: '#f8fafc',
    text: '#1e293b',
    icon: '#ea580c',
    border: '#e2e8f0',
    buttonBg: '#e2e8f0',
    buttonHover: '#cbd5e1',
    buttonText: '#1e293b'
  };

  // Styles
  const containerStyle = {
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: colors.background,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: `1px solid ${colors.border}`,
    maxWidth: '100%',
    opacity: '1 !important',
    visibility: 'visible !important',
    ...getPositionStyle()
  };

  const iconStyle = {
    color: colors.icon,
    marginRight: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const buttonStyle = {
    backgroundColor: colors.buttonBg,
    color: colors.buttonText,
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    marginLeft: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  };

  return (
    <div 
      className="offline-indicator"
      style={containerStyle}
      role="status"
      aria-live="assertive"
    >
      <div style={iconStyle} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
      <div style={{ color: colors.text, fontSize: '14px', fontWeight: 500 }}>
        You're offline
      </div>
      <button 
        onClick={handleRetry}
        style={buttonStyle}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.buttonHover}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.buttonBg}
        aria-label="Retry connection"
      >
        Retry
      </button>
    </div>
  );
};

OfflineIndicator.propTypes = {
  position: PropTypes.oneOf([
    'top-left',
    'top-right',
    'top-center',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ]),
  isDarkMode: PropTypes.bool,
  onRetryClick: PropTypes.func
};

export default OfflineIndicator;
