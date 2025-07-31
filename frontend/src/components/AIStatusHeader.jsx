import React, { useState, useEffect, useCallback, useContext } from 'react';
import ModelStatusIndicator from './feedback/ModelStatusIndicator';
import AIDiagnosticTool from './AIDiagnosticTool';
import { ApiStatusContext } from '../contexts/ApiStatusContext.jsx';

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
          className: 'text-green-600',
          tooltip: 'AI services are operating normally'
        };
      case 'partial':
        return {
          icon: '⚠️',
          text: 'Degraded',
          className: 'text-yellow-600',
          tooltip: errorMessage || 'Some AI services may be degraded'
        };
      case 'error':
        return {
          icon: '⚠️',
          text: 'AI Unavailable',
          className: 'text-red-600',
          tooltip: errorMessage || 'AI services are currently unavailable'
        };
      default:
        return {
          icon: '⋯',
          text: 'Checking...',
          className: 'text-gray-600',
          tooltip: 'Checking AI service status...'
        };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  const lastCheckDisplay = lastChecked ? `Last checked: ${formatLastCheckTime()}` : '';
  
  return (
    <div className="ai-status-header flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div 
        className={`status-indicator flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${statusDisplay.className} group relative`}
        title={`${statusDisplay.tooltip} ${lastCheckDisplay}`.trim()}
      >
        <span className="inline-block w-4 text-center">{statusDisplay.icon}</span>
        <span>{statusDisplay.text}</span>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {statusDisplay.tooltip}
          {lastCheckDisplay && (
            <div className="text-gray-300 text-2xs mt-0.5">
              {lastCheckDisplay}
            </div>
          )}
        </div>
      </div>
      
      <ModelStatusIndicator className="hidden md:block" />
      
      <button 
        onClick={handleOpenDiagnostics}
        className="diagnostic-button text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
        title="Open AI diagnostic tools"
      >
        Diagnose
      </button>
      
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
