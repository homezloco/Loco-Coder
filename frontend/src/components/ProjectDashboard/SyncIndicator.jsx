import React, { useState, useEffect } from 'react';

/**
 * Visual indicator for data synchronization status and freshness
 * Shows when data was last synchronized with the backend API
 */
const SyncIndicator = ({ dataSource, lastSyncTime, onSyncRequest, apiStatus, className }) => {
  // Check if dark mode is enabled based on className
  const isDarkMode = className?.includes('dark-mode');
  const [timeSinceSync, setTimeSinceSync] = useState('');

  // Update the time since last sync
  useEffect(() => {
    // Only show time for non-API sources (since API is already fresh)
    if (dataSource === 'API') return;
    
    const calculateTimeSince = () => {
      if (!lastSyncTime) {
        setTimeSinceSync('Never');
        return;
      }
      
      const now = Date.now();
      const diff = now - lastSyncTime;
      
      // Format based on time passed
      if (diff < 60000) { // Less than 1 minute
        setTimeSinceSync('Just now');
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        setTimeSinceSync(`${minutes}m ago`);
      } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        setTimeSinceSync(`${hours}h ago`);
      } else {
        const days = Math.floor(diff / 86400000);
        setTimeSinceSync(`${days}d ago`);
      }
    };
    
    // Calculate immediately
    calculateTimeSince();
    
    // Update every minute
    const interval = setInterval(calculateTimeSince, 60000);
    return () => clearInterval(interval);
  }, [lastSyncTime, dataSource]);
  
  // Get status color based on data freshness
  const getSyncStatusColor = () => {
    if (dataSource === 'API') return '#4caf50'; // Always green for API
    
    if (!lastSyncTime) return '#f44336'; // Red if never synced
    
    const now = Date.now();
    const diff = now - lastSyncTime;
    
    if (diff < 3600000) return '#4caf50'; // Green if less than 1 hour
    if (diff < 86400000) return '#ff9800'; // Orange if less than 1 day
    return '#f44336'; // Red if more than 1 day
  };
  
  // Get sync status text
  const getSyncStatusText = () => {
    if (dataSource === 'API') return 'Live';
    if (!lastSyncTime) return 'Never synced';
    return `Last sync: ${timeSinceSync}`;
  };
  
  // Whether the sync button should be enabled
  const canSync = apiStatus?.status === 'online' && dataSource !== 'API';
  
  return (
    <div 
      className={`sync-indicator ${className || ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '16px',
        backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
        border: isDarkMode ? '1px solid #555' : '1px solid #ddd',
        fontSize: '0.8rem',
        color: isDarkMode ? '#eee' : '#333',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Sync status icon */}
      <div 
        className="sync-status"
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: getSyncStatusColor(),
        }}
      />
      
      {/* Sync status text */}
      <div className="sync-text">
        {getSyncStatusText()}
      </div>
      
      {/* Sync button - only show for offline data */}
      {dataSource !== 'API' && (
        <button
          className="sync-button"
          onClick={onSyncRequest}
          disabled={!canSync}
          title={canSync ? 'Sync with API' : 'API is offline'}
          style={{
            backgroundColor: canSync ? '#2196f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            cursor: canSync ? 'pointer' : 'not-allowed',
            fontSize: '0.75rem'
          }}
        >
          Sync
        </button>
      )}
    </div>
  );
};

export default SyncIndicator;
