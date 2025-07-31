import React, { useState, useEffect } from 'react';
import { 
  getPersistenceStatistics, 
  resetPersistenceStatistics,
  loadDashboardPreferences
} from './projectUtils.jsx';

/**
 * Component that shows persistence monitoring stats and data source information
 * Displays health status of different storage mechanisms and recent operations
 */
const PersistenceStatus = ({ dataSource, apiStatus, className }) => {
  // Check if dark mode is enabled based on className
  const isDarkMode = className?.includes('dark-mode');
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState(null);
  const [preferencesSource, setPreferencesSource] = useState(null);
  
  // Load dashboard preferences source
  useEffect(() => {
    async function loadPreferencesSource() {
      try {
        const { source } = await loadDashboardPreferences();
        setPreferencesSource(source || 'Unknown');
      } catch (error) {
        console.error('Error loading dashboard preferences source:', error);
        setPreferencesSource('Unknown');
      }
    }
    
    loadPreferencesSource();
  }, []);

  // Refresh stats when component mounts and when dataSource changes
  useEffect(() => {
    const refreshStats = () => {
      setStats(getPersistenceStatistics());
    };
    
    refreshStats();
    
    // Set up a periodic refresh for stats while expanded
    let intervalId = null;
    if (isExpanded) {
      intervalId = setInterval(refreshStats, 3000); // Refresh every 3 seconds when expanded
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isExpanded, dataSource]);
  
  // Get status color based on health
  const getStatusColor = (source) => {
    if (!stats) return '#888';
    
    const sourceStats = stats.sources[source];
    if (!sourceStats) return '#888';
    
    const successRate = sourceStats.successRate || 0;
    if (successRate >= 80) return '#4caf50'; // green
    if (successRate >= 50) return '#ff9800'; // orange
    return '#f44336'; // red
  };
  
  // Reset statistics handler
  const handleReset = (e) => {
    e.stopPropagation();
    resetPersistenceStatistics();
    setStats(getPersistenceStatistics());
  };
  
  // Get icon for current data source
  const getDataSourceIcon = (source) => {
    switch (source) {
      case 'API': return '🌐';
      case 'IndexedDB': return '💾';
      case 'localStorage': return '📦';
      case 'sessionStorage': return '🔄';
      case 'demoData': return '🧩';
      default: return '❓';
    }
  };
  
  return (
    <div 
      className={`persistence-status ${className || ''}`}
      style={{
        border: isDarkMode ? '1px solid #444' : '1px solid #ddd',
        borderRadius: '4px',
        padding: '8px',
        backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9',
        fontSize: '0.9rem',
        color: isDarkMode ? '#eee' : '#333',
        marginBottom: '16px',
        transition: 'all 0.3s ease'
      }}
    >
      <div 
        className="persistence-summary" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="data-source" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>{getDataSourceIcon(dataSource)}</span>
            <span>
              <strong>Projects:</strong> {dataSource} 
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: apiStatus?.status === 'online' ? '#4caf50' : 
                              apiStatus?.status === 'degraded' ? '#ff9800' : '#f44336',
                marginLeft: '5px'
              }} />
            </span>
          </div>
          <div className="preferences-source" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>{getDataSourceIcon(preferencesSource)}</span>
            <span>
              <strong>Dashboard:</strong> {preferencesSource || 'Loading...'}
            </span>
          </div>
        </div>
        
        <div className="toggle" style={{ fontSize: '0.8rem' }}>
          {isExpanded ? '▲ Hide Details' : '▼ Show Details'}
        </div>
      </div>
      
      {isExpanded && stats && (
        <div className="persistence-details" style={{ marginTop: '12px' }}>
          <div className="storage-health" style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>Storage Health:</h4>
            <div className="storage-indicators" style={{ display: 'flex', gap: '12px' }}>
              {['api', 'indexedDB', 'localStorage', 'sessionStorage'].map(source => (
                <div 
                  key={source}
                  className="indicator"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1
                  }}
                >
                  <div 
                    className="status-circle" 
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(source),
                      marginBottom: '4px'
                    }}
                  ></div>
                  <div className="source-name" style={{ fontSize: '0.8rem' }}>
                    {source === 'api' ? 'API' : 
                     source === 'indexedDB' ? 'IndexedDB' : 
                     source === 'localStorage' ? 'Local' : 'Session'}
                  </div>
                  <div className="success-rate" style={{ fontSize: '0.75rem' }}>
                    {stats.sources[source]?.successRate?.toFixed(0) || 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="stats-summary" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
            <div><strong>API Status:</strong> {apiStatus?.message || 'Unknown'}</div>
            <div><strong>Fallback Events:</strong> {stats.totalFallbacks}</div>
            <div><strong>Last Updated:</strong> {new Date(stats.lastUpdate).toLocaleTimeString()}</div>
          </div>
          
          {stats.lastOperation && (
            <div className="last-operation" style={{ 
              padding: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '0.8rem',
              marginBottom: '12px'
            }}>
              <div><strong>Last Operation:</strong> {stats.lastOperation.type} ({stats.lastOperation.source})</div>
              <div><strong>Result:</strong> {stats.lastOperation.success ? 'Success' : 'Failed'}</div>
              {stats.lastOperation.responseTime && (
                <div><strong>Response Time:</strong> {stats.lastOperation.responseTime.toFixed(2)}ms</div>
              )}
            </div>
          )}
          
          <div className="actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleReset}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Reset Statistics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersistenceStatus;
