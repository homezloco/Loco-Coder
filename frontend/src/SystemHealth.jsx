import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * SystemHealth component displays the status of all backend services
 * with fallback mechanisms for API failures
 */
const SystemHealth = ({ apiUrl }) => {
  const [healthStatus, setHealthStatus] = useState({
    backend: 'checking',
    ollama: 'checking',
    docker: 'checking',
    database: 'checking',
    lastChecked: null
  });
  const [expanded, setExpanded] = useState(false);

  // Fetch health status from the backend
  const checkHealth = async () => {
    try {
      const response = await axios.get(`${apiUrl}/health`, {
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data && response.status === 200) {
        setHealthStatus({
          backend: 'healthy',
          ollama: response.data.ollama_status || 'degraded',
          docker: response.data.docker_status || 'degraded',
          database: response.data.database_status || 'degraded',
          lastChecked: new Date().toLocaleTimeString()
        });
      } else {
        // API returned non-200 status
        setHealthStatus(prev => ({
          ...prev,
          backend: 'degraded',
          lastChecked: new Date().toLocaleTimeString()
        }));
      }
    } catch (error) {
      console.error('Health check error:', error);
      
      // Determine which service is down based on error
      if (error.code === 'ECONNABORTED') {
        // Timeout error
        setHealthStatus(prev => ({
          ...prev,
          backend: 'timeout',
          lastChecked: new Date().toLocaleTimeString()
        }));
      } else if (error.response) {
        // Server responded with error
        setHealthStatus(prev => ({
          ...prev,
          backend: 'error',
          lastChecked: new Date().toLocaleTimeString()
        }));
      } else if (error.request) {
        // No response received
        setHealthStatus(prev => ({
          ...prev,
          backend: 'offline',
          lastChecked: new Date().toLocaleTimeString()
        }));
      } else {
        // Something else went wrong
        setHealthStatus(prev => ({
          ...prev,
          backend: 'unknown',
          lastChecked: new Date().toLocaleTimeString()
        }));
      }
    }
  };

  // Check health status periodically
  useEffect(() => {
    // Initial check
    checkHealth();
    
    // Set up interval for periodic checks
    const intervalId = setInterval(checkHealth, 30000); // Check every 30 seconds
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [apiUrl]);

  // Get status icon based on status string
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'degraded':
        return '🟠';
      case 'offline':
        return '🔴';
      case 'error':
        return '❌';
      case 'timeout':
        return '⏱️';
      case 'checking':
        return '⏳';
      default:
        return '❓';
    }
  };

  // Get more detailed message based on status
  const getStatusMessage = (service, status) => {
    const messages = {
      backend: {
        healthy: 'Backend API is online and responsive',
        degraded: 'Backend API is experiencing issues',
        offline: 'Backend API is not available',
        error: 'Backend API returned an error',
        timeout: 'Backend API request timed out',
        checking: 'Checking backend API status...',
        unknown: 'Backend API status is unknown'
      },
      ollama: {
        healthy: 'Ollama LLM service is running normally',
        degraded: 'Ollama is responding but may be slow',
        offline: 'Ollama service is not available',
        error: 'Ollama service returned an error',
        checking: 'Checking Ollama status...',
        unknown: 'Ollama status unknown'
      },
      docker: {
        healthy: 'Docker execution environment is available',
        degraded: 'Docker is available but may have issues',
        offline: 'Docker execution is not available',
        error: 'Docker service returned an error',
        checking: 'Checking Docker status...',
        unknown: 'Docker status unknown'
      },
      database: {
        healthy: 'Database is connected and operational',
        degraded: 'Database is available but may have issues',
        offline: 'Database is not available',
        error: 'Database returned an error',
        checking: 'Checking Database status...',
        unknown: 'Database status unknown'
      }
    };
    
    return messages[service][status] || `${service} status: ${status}`;
  };

  // Get fallback options to display based on service status
  const getFallbackOptions = (service, status) => {
    if (status === 'healthy') return null;
    
    const fallbacks = {
      backend: 'Reload the page or check your network connection',
      ollama: 'AI features will use static responses as fallback',
      docker: 'Code will execute locally instead of in containers',
      database: 'Using file-based storage as fallback'
    };
    
    return fallbacks[service] || 'Using fallback mechanism';
  };

  return (
    <div className="system-health">
      <div className="health-summary" onClick={() => setExpanded(!expanded)}>
        <span className="health-indicator">
          {getStatusIcon(healthStatus.backend)} System Health
        </span>
        <span className="last-checked">
          {healthStatus.lastChecked ? `Last checked: ${healthStatus.lastChecked}` : ''}
        </span>
        <span className="expand-icon">
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      
      {expanded && (
        <div className="health-details">
          <div className="service-status">
            <div className="service">
              <div className="service-header">
                <span>{getStatusIcon(healthStatus.backend)} Backend API</span>
              </div>
              <div className="service-message">
                {getStatusMessage('backend', healthStatus.backend)}
              </div>
              {healthStatus.backend !== 'healthy' && (
                <div className="service-fallback">
                  <strong>Fallback:</strong> {getFallbackOptions('backend', healthStatus.backend)}
                </div>
              )}
            </div>
            
            <div className="service">
              <div className="service-header">
                <span>{getStatusIcon(healthStatus.ollama)} Ollama LLM</span>
              </div>
              <div className="service-message">
                {getStatusMessage('ollama', healthStatus.ollama)}
              </div>
              {healthStatus.ollama !== 'healthy' && (
                <div className="service-fallback">
                  <strong>Fallback:</strong> {getFallbackOptions('ollama', healthStatus.ollama)}
                </div>
              )}
            </div>
            
            <div className="service">
              <div className="service-header">
                <span>{getStatusIcon(healthStatus.docker)} Docker</span>
              </div>
              <div className="service-message">
                {getStatusMessage('docker', healthStatus.docker)}
              </div>
              {healthStatus.docker !== 'healthy' && (
                <div className="service-fallback">
                  <strong>Fallback:</strong> {getFallbackOptions('docker', healthStatus.docker)}
                </div>
              )}
            </div>
            
            <div className="service">
              <div className="service-header">
                <span>{getStatusIcon(healthStatus.database)} Database</span>
              </div>
              <div className="service-message">
                {getStatusMessage('database', healthStatus.database)}
              </div>
              {healthStatus.database !== 'healthy' && (
                <div className="service-fallback">
                  <strong>Fallback:</strong> {getFallbackOptions('database', healthStatus.database)}
                </div>
              )}
            </div>
          </div>
          
          <div className="health-actions">
            <button onClick={checkHealth} className="refresh-btn">
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
