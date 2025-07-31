import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { TransitionContainer } from '../transitions';

/**
 * Enhanced error state for project dashboard with fallback options
 * Provides visual feedback and multiple recovery options
 */
const ErrorState = ({ 
  error, 
  isDarkMode = false, 
  onRetry = null,
  dataSource = '',
  showFallbackOptions = true 
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorDetails, setErrorDetails] = useState({});
  const [expanded, setExpanded] = useState(false);
  
  // Parse error for better display
  useEffect(() => {
    if (error) {
      const details = {
        message: typeof error === 'string' ? error : 
                 error.message || 'An unknown error occurred',
        type: typeof error === 'string' ? 'Error' : 
              error.name || 'Unknown Error',
        code: typeof error === 'object' ? (error.code || error.status || '') : '',
        stack: typeof error === 'object' ? (error.stack || '') : ''
      };
      setErrorDetails(details);
    }
  }, [error]);
  
  // Handle retry countdown if retry is in progress
  useEffect(() => {
    let timer;
    if (isRetrying && retryTimer > 0) {
      timer = setTimeout(() => setRetryTimer(t => t - 1), 1000);
    } else if (isRetrying && retryTimer === 0) {
      setIsRetrying(false);
      if (onRetry) onRetry();
    }
    return () => clearTimeout(timer);
  }, [isRetrying, retryTimer, onRetry]);
  
  // Handle retry button click
  const handleRetry = () => {
    if (onRetry && !isRetrying) {
      setRetryCount(c => c + 1);
      
      // If we've tried a few times, add a small delay
      if (retryCount > 2) {
        setIsRetrying(true);
        setRetryTimer(3);
      } else {
        onRetry();
      }
    } else if (!onRetry) {
      window.location.reload();
    }
  };

  // Get button style by variant
  const getButtonStyle = (variant = 'primary') => {
    const baseStyle = {
      border: 'none',
      borderRadius: '6px',
      padding: '8px 16px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      visibility: 'visible !important',
      opacity: '1 !important'
    };
    
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
          color: '#ffffff'
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
          color: isDarkMode ? '#f8fafc' : '#1e293b'
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#7f1d1d' : '#dc2626',
          color: '#ffffff'
        };
      default:
        return baseStyle;
    }
  };

  // Fallback options based on error type
  const renderFallbackOptions = () => {
    if (!showFallbackOptions) return null;
    
    // Only show fallback options after first retry
    if (retryCount === 0) return null;
    
    return (
      <TransitionContainer
        isVisible={retryCount > 0}
        type="slide-up"
        duration={300}
        delay={200}
      >
        <div style={{
          marginTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center',
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(241, 245, 249, 0.7)',
          padding: '16px',
          borderRadius: '8px',
          maxWidth: '500px'
        }}>
          <p style={{ 
            fontSize: '14px',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            marginBottom: '8px',
            fontWeight: 500
          }}>
            Try these alternatives:
          </p>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                // Try to load from localStorage as a fallback
                if (window.localStorage) {
                  const projectsStr = localStorage.getItem('projects');
                  if (projectsStr) {
                    try {
                      const projects = JSON.parse(projectsStr);
                      alert(`Found ${projects.length} projects in localStorage. Using cached data.`);
                    } catch (e) {
                      alert('Failed to parse cached projects. Please try other options.');
                    }
                  } else {
                    alert('No cached projects found in localStorage.');
                  }
                }
              }}
              style={getButtonStyle('secondary')}
              onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? '#334155' : '#cbd5e1'}
              onMouseOut={(e) => e.target.style.backgroundColor = isDarkMode ? '#1e293b' : '#e2e8f0'}
            >
              Use Cached Data
            </button>
            
            <button
              onClick={() => {
                // Reset all stored data and retry
                if (window.localStorage) {
                  localStorage.removeItem('projects');
                  sessionStorage.removeItem('projects');
                }
                if (window.indexedDB) {
                  try {
                    const req = indexedDB.deleteDatabase('projectsDB');
                    req.onsuccess = () => {
                      window.location.reload();
                    };
                    req.onerror = () => {
                      window.location.reload();
                    };
                  } catch (e) {
                    window.location.reload();
                  }
                } else {
                  window.location.reload();
                }
              }}
              style={getButtonStyle('danger')}
              onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? '#b91c1c' : '#ef4444'}
              onMouseOut={(e) => e.target.style.backgroundColor = isDarkMode ? '#7f1d1d' : '#dc2626'}
            >
              Reset & Reload
            </button>
          </div>
        </div>
      </TransitionContainer>
    );
  };

  // Get hint text based on error type
  const getHintText = () => {
    const errorMsg = errorDetails.message || '';
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      return 'We will automatically use cached projects if available when offline.';
    } else if (errorMsg.includes('timeout')) {
      return 'The server might be experiencing high load. Please try again in a moment.';
    } else if (errorMsg.includes('API rate')) {
      return 'You may have hit an API rate limit. Please wait a moment before trying again.';
    }
    return 'We\'ll try to load your projects from alternative sources.';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      textAlign: 'center',
      minHeight: '300px',
      width: '100%'
    }}>
      <svg 
        width="64" 
        height="64" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={isDarkMode ? '#ef4444' : '#dc2626'} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{
          animation: 'pulseError 2s infinite',
          transformOrigin: 'center'
        }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      
      <h3 style={{
        marginTop: '24px',
        color: isDarkMode ? '#e2e8f0' : '#334155',
        fontWeight: 500,
        fontSize: '20px'
      }}>
        Error Loading Projects
      </h3>
      
      <p style={{
        color: isDarkMode ? '#94a3b8' : '#64748b',
        maxWidth: '500px',
        margin: '8px 0 24px'
      }}>
        {errorDetails.message || 'Failed to load projects. Please try again.'}
      </p>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleRetry}
          disabled={isRetrying}
          style={{
            ...getButtonStyle('primary'),
            opacity: isRetrying ? 0.7 : 1,
            cursor: isRetrying ? 'not-allowed' : 'pointer'
          }}
          onMouseOver={(e) => {
            if (!isRetrying) e.target.style.backgroundColor = isDarkMode ? '#1d4ed8' : '#2563eb';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = isDarkMode ? '#2563eb' : '#3b82f6';
          }}
        >
          {isRetrying ? `Retrying (${retryTimer})` : retryCount > 0 ? 'Retry Again' : 'Retry'}
        </button>
        
        <button 
          onClick={() => setExpanded(!expanded)}
          style={getButtonStyle('secondary')}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = isDarkMode ? '#334155' : '#cbd5e1';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = isDarkMode ? '#1e293b' : '#e2e8f0';
          }}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {renderFallbackOptions()}
      
      {/* Solution hint */}
      <div style={{
        padding: '14px',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: '10px',
        maxWidth: '500px',
        marginTop: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <span role="img" aria-label="light bulb" style={{
          fontSize: '16px',
          marginTop: '2px'
        }}>💡</span>
        <p style={{
          margin: '0',
          fontSize: '14px',
          lineHeight: '1.5',
          color: isDarkMode ? '#cbd5e1' : '#64748b',
          textAlign: 'left'
        }}>
          {getHintText()}
        </p>
      </div>

      {/* Error details section */}
      <TransitionContainer
        isVisible={expanded}
        type="slide-down"
        duration={300}
      >
        <div style={{
          marginTop: '24px',
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(241, 245, 249, 0.7)',
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'left',
          maxWidth: '600px',
          width: '100%',
          overflowX: 'auto'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: isDarkMode ? '#e2e8f0' : '#334155' }}>Type:</span>
            <span style={{ color: isDarkMode ? '#cbd5e1' : '#64748b', marginLeft: '8px' }}>
              {errorDetails.type}
            </span>
          </div>
          
          {errorDetails.code && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: isDarkMode ? '#e2e8f0' : '#334155' }}>Code:</span>
              <span style={{ color: isDarkMode ? '#cbd5e1' : '#64748b', marginLeft: '8px' }}>
                {errorDetails.code}
              </span>
            </div>
          )}
          
          {errorDetails.stack && (
            <div>
              <span style={{ fontWeight: 600, color: isDarkMode ? '#e2e8f0' : '#334155' }}>Stack:</span>
              <pre style={{
                color: isDarkMode ? '#cbd5e1' : '#64748b',
                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.9)',
                padding: '8px',
                borderRadius: '4px',
                overflowX: 'auto',
                fontSize: '12px',
                maxHeight: '200px',
                margin: '8px 0 0'
              }}>
                {errorDetails.stack}
              </pre>
            </div>
          )}
          
          {/* Display data source if available */}
          {dataSource && (
            <div style={{ marginTop: '16px' }}>
              <span style={{ fontWeight: 600, color: isDarkMode ? '#e2e8f0' : '#334155' }}>Data Source:</span>
              <span style={{ color: isDarkMode ? '#cbd5e1' : '#64748b', marginLeft: '8px' }}>
                {dataSource}
              </span>
            </div>
          )}
        </div>
      </TransitionContainer>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes pulseError {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

ErrorState.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string
  ]),
  isDarkMode: PropTypes.bool,
  onRetry: PropTypes.func,
  dataSource: PropTypes.string,
  showFallbackOptions: PropTypes.bool
};

export default ErrorState;
