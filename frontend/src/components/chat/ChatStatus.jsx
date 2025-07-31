import React from 'react';
import PropTypes from 'prop-types';
import { 
  FiWifi, 
  FiWifiOff, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiRefreshCw 
} from 'react-icons/fi';

/**
 * ChatStatus component displays the current connection status and provides actions
 */
const ChatStatus = ({
  status = 'checking',
  message = 'Checking connection...',
  lastChecked,
  onRetry,
  isDarkMode = false,
  className = ''
}) => {
  // Status indicators
  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <FiWifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <FiWifiOff className="w-4 h-4 text-red-500" />;
      case 'error':
        return <FiAlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'checking':
        return <FiRefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <FiCheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Status text
  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Connection Error';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  // Last checked time
  const getLastChecked = () => {
    if (!lastChecked) return null;
    
    const now = new Date();
    const checkedTime = new Date(lastChecked);
    const diffInSeconds = Math.floor((now - checkedTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return checkedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <div 
      className={`flex items-center justify-between px-4 py-2 text-sm border-t ${bgColor} ${borderColor} ${textColor} ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span>{message || getStatusText()}</span>
      </div>
      
      <div className="flex items-center space-x-3">
        {lastChecked && (
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {getLastChecked()}
          </span>
        )}
        
        {status !== 'checking' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`px-2 py-1 text-xs rounded ${hoverBg} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            aria-label="Retry connection"
          >
            <FiRefreshCw className="inline-block w-3 h-3 mr-1" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

ChatStatus.propTypes = {
  status: PropTypes.oneOf(['online', 'offline', 'error', 'checking']),
  message: PropTypes.string,
  lastChecked: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date)
  ]),
  onRetry: PropTypes.func,
  isDarkMode: PropTypes.bool,
  className: PropTypes.string
};

export default ChatStatus;
