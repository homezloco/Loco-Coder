import React, { useState, useCallback, useContext } from 'react';
import ModelStatusIndicator from './feedback/ModelStatusIndicator';
import AIDiagnosticTool from './AIDiagnosticTool';
import { ApiStatusContext } from '../contexts/ApiStatusContext.jsx';
import './styles/AIStatusHeader.css'; // Added dedicated CSS file for better styling control

/**
 * AIStatusHeader provides a compact header component showing AI service status
 * with quick access to diagnostics and troubleshooting tools.
 * 
 * Note: This component now uses the shared API status context to prevent
 * duplicate health checks and ensure consistent status across the app.
 */
const AIStatusHeader = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { 
    status: apiStatus, 
    lastChecked, 
    error: apiError,
    checkStatus 
  } = useContext(ApiStatusContext);
  
  // Map API status to our UI status
  const aiStatus = apiStatus === 'ok' ? 'success' : 
                  apiStatus === 'degraded' ? 'partial' : 
                  apiStatus === 'checking' ? 'checking' : 'error';
  
  // Format error message if available
  const errorMessage = apiError?.message || 
                      (apiStatus === 'error' ? 'Service unavailable' : '');
  
  // Format last check time for display
  const formatLastCheckTime = useCallback(() => {
    if (!lastChecked) return 'Never';
    
    const now = new Date();
    const diffMs = now - new Date(lastChecked);
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return new Date(lastChecked).toLocaleString();
  }, [lastChecked]);
  
  // Trigger a manual status check when requested
  const handleRefresh = useCallback(() => {
    checkStatus(true); // Force refresh with initial timeout
  }, [checkStatus]);
  
  const handleOpenDiagnostics = () => {
    setShowDiagnostics(true);
  };
  
  // Determine status classes and text
  const getStatusDisplay = () => {
    switch (aiStatus) {
      case 'success':
        return {
          icon: '✓',
          text: 'AI Ready',
          className: 'status-success',
          tooltip: 'AI services are operating normally'
        };
      case 'partial':
        return {
          icon: '⚠️',
          text: 'Degraded',
          className: 'status-partial',
          tooltip: errorMessage || 'Some AI services may be degraded'
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'AI Unavailable',
          className: 'status-error',
          tooltip: errorMessage || 'AI services are currently unavailable'
        };
      default:
        return {
          icon: '⋯',
          text: 'Checking...',
          className: 'status-checking',
          tooltip: 'Checking AI service status...'
        };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  const lastCheckDisplay = lastChecked ? `Last checked: ${formatLastCheckTime()}` : '';
  
  
  return (
    <div className="ai-status-header">
      <div className="ai-status-left-section">
        <div 
          className={`status-indicator ${statusDisplay.className}`}
          title={`${statusDisplay.tooltip} ${lastCheckDisplay}`.trim()}
        >
          <span className="status-icon">{statusDisplay.icon}</span>
          <span className="status-text">{statusDisplay.text}</span>
          
          {/* Tooltip */}
          <div className="status-tooltip">
            {statusDisplay.tooltip}
            {lastCheckDisplay && (
              <div className="tooltip-detail">
                {lastCheckDisplay}
              </div>
            )}
          </div>
        </div>
        
        {lastChecked && (
          <div className="last-checked">
            Last checked: {formatLastCheckTime()}
          </div>
        )}
      </div>
      
      <div className="ai-status-right-section">
        <ModelStatusIndicator />
        
        <button 
          onClick={handleOpenDiagnostics}
          className="diagnostic-button"
          title="Open AI diagnostic tools"
        >
          Diagnose
        </button>
      </div>
      
      <AIDiagnosticTool 
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        initialStatus={aiStatus}
        lastCheckTime={lastChecked}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default AIStatusHeader;
