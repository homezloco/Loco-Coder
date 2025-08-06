import React, { useState, useEffect } from 'react';
import { FiActivity, FiAlertCircle, FiCheckCircle, FiExternalLink } from 'react-icons/fi';
import ailangService from '../../services/ailangService';

/**
 * AILang Status Component
 * 
 * Displays the current status of the AILang system and provides
 * a button to open the full dashboard in a new window.
 */
const AILangStatus = () => {
  const [health, setHealth] = useState(null);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch AILang status on component mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get health and version info
        const [healthData, versionData] = await Promise.all([
          ailangService.getSystemHealth(),
          ailangService.getVersionInfo()
        ]);
        
        setHealth(healthData);
        setVersion(versionData);
      } catch (err) {
        console.error('Error fetching AILang status:', err);
        setError('Failed to connect to AILang API');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
    
    // Refresh status every 30 seconds
    const intervalId = setInterval(fetchStatus, 30000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle dashboard button click
  const handleOpenDashboard = () => {
    ailangService.openDashboard();
  };
  
  // Render loading state
  if (loading && !health) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error && !health) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-2">
          <FiAlertCircle className="text-red-500 mr-2" size={20} />
          <h3 className="text-red-800 dark:text-red-400 font-medium">AILang Connection Error</h3>
        </div>
        <p className="text-red-700 dark:text-red-300 text-sm mb-3">{error}</p>
        <button
          onClick={handleOpenDashboard}
          className="inline-flex items-center px-3 py-1.5 text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700"
        >
          <FiExternalLink className="mr-1" />
          Open Dashboard
        </button>
      </div>
    );
  }
  
  // Determine status color
  const getStatusColor = () => {
    if (!health || health.fallback) return 'gray';
    if (health.status === 'healthy') return 'green';
    return 'yellow';
  };
  
  const statusColor = getStatusColor();
  const statusColors = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-400',
      icon: <FiCheckCircle className="text-green-500 mr-2" size={20} />
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-400',
      icon: <FiAlertCircle className="text-yellow-500 mr-2" size={20} />
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-800 dark:text-gray-400',
      icon: <FiActivity className="text-gray-500 mr-2" size={20} />
    }
  };
  
  return (
    <div className={`${statusColors[statusColor].bg} border ${statusColors[statusColor].border} rounded-lg p-4 shadow-sm`}>
      <div className="flex items-center mb-2">
        {statusColors[statusColor].icon}
        <h3 className={`${statusColors[statusColor].text} font-medium`}>
          AILang {health?.fallback ? 'Status Unknown' : health?.status || 'Status'}
        </h3>
      </div>
      
      {/* Version info */}
      {version && (
        <div className="mb-3">
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Version: {version.version}
            {version.update_available && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                Update Available
              </span>
            )}
          </p>
        </div>
      )}
      
      {/* System metrics */}
      {health?.details && !health.fallback && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">CPU</div>
            <div className="font-medium">{health.details.cpu_usage}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Memory</div>
            <div className="font-medium">{health.details.memory_usage}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Disk</div>
            <div className="font-medium">{health.details.disk_usage}%</div>
          </div>
        </div>
      )}
      
      {/* Dashboard button */}
      <button
        onClick={handleOpenDashboard}
        className="w-full inline-flex items-center justify-center px-3 py-2 text-sm bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
      >
        <FiExternalLink className="mr-1" />
        Open AILang Dashboard
      </button>
    </div>
  );
};

export default AILangStatus;
