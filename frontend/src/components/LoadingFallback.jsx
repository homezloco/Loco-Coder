import React, { useState, useEffect } from 'react';

/**
 * LoadingFallback - Advanced loading component with multiple fallback stages
 * 
 * Features:
 * - Progressive loading states with increasing information
 * - Automatic timeouts for different loading stages
 * - Interactive retry mechanism
 * - Informative error states with possible solutions
 * - Accessibility support with aria attributes
 */
const LoadingFallback = ({
  isLoading,
  error,
  retry,
  loadingMessage = 'Loading...',
  timeout = 15000, // 15 seconds until timeout
  timedStages = true,
  showProgressBar = true,
  renderTimeout,
  renderError
}) => {
  const [stage, setStage] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Progressive loading messages based on time elapsed
  const loadingStages = [
    { threshold: 0, message: loadingMessage },
    { threshold: 3000, message: 'Still working on it...' },
    { threshold: 7000, message: 'This is taking longer than expected' },
    { threshold: 12000, message: 'Almost there, finalizing...' }
  ];
  
  // Reset states when loading state changes
  useEffect(() => {
    if (isLoading) {
      setStage(0);
      setTimedOut(false);
      setProgress(0);
    }
  }, [isLoading]);
  
  // Progress timer
  useEffect(() => {
    if (!isLoading) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Update progress percentage
      const newProgress = Math.min(Math.floor((elapsed / timeout) * 100), 99);
      setProgress(newProgress);
      
      // Check for timeout
      if (elapsed >= timeout) {
        setTimedOut(true);
        clearInterval(interval);
        return;
      }
      
      // Update message stage based on elapsed time
      if (timedStages) {
        const newStage = loadingStages.reduce((highest, current, index) => 
          elapsed >= current.threshold ? index : highest, 0);
        setStage(newStage);
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, [isLoading, timeout, timedStages]);
  
  // If not in loading state, don't render
  if (!isLoading && !error && !timedOut) {
    return null;
  }
  
  // Handle timeout scenario
  if (timedOut) {
    if (renderTimeout) {
      return renderTimeout({ retry });
    }
    
    return (
      <div className="loading-timeout" role="alert" aria-live="assertive">
        <h4>This is taking longer than expected</h4>
        <p>The operation may still be processing in the background, or there might be connectivity issues.</p>
        <div className="loading-actions">
          <button onClick={retry} className="retry-button">
            Try Again
          </button>
          <button onClick={() => window.location.reload()} className="reload-button">
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  // Handle error scenario
  if (error) {
    if (renderError) {
      return renderError({ error, retry });
    }
    
    return (
      <div className="loading-error" role="alert" aria-live="assertive">
        <h4>Something went wrong</h4>
        <p>{error.message || 'An unexpected error occurred'}</p>
        <div className="loading-actions">
          <button onClick={retry} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Standard loading state
  return (
    <div 
      className="loading-container" 
      role="status" 
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-spinner"></div>
      <div className="loading-message">
        {loadingStages[stage].message}
      </div>
      
      {showProgressBar && (
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }} 
            aria-valuenow={progress} 
            aria-valuemin="0" 
            aria-valuemax="100"
          ></div>
        </div>
      )}
      
      {stage >= 2 && (
        <button 
          onClick={retry} 
          className="loading-cancel-button"
          aria-label="Cancel loading"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default LoadingFallback;
