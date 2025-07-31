import React from 'react';
import { FiSettings } from 'react-icons/fi';
import PropTypes from 'prop-types';

/**
 * ChatHeader component displays the chat header with title and settings button
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {boolean} props.isLoading - Loading state
 * @param {Function} props.onSettingsClick - Callback for settings button click
 * @param {Object} props.apiStatus - API status information
 */
const ChatHeader = ({ 
  isDarkMode = false, 
  isLoading = false, 
  onSettingsClick, 
  apiStatus = {} 
}) => {
  // Determine status indicator color based on API status
  const getStatusColor = () => {
    switch(apiStatus.status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'partial':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center space-x-3">
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Coder AI Assistant
        </h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {apiStatus.message || 'Connecting...'}
          </span>
        </div>
      </div>
      
      <button
        onClick={onSettingsClick}
        disabled={isLoading}
        className={`p-2 rounded-full transition-colors ${
          isDarkMode 
            ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Settings"
      >
        <FiSettings className="w-5 h-5" />
      </button>
    </div>
  );
};

ChatHeader.propTypes = {
  isDarkMode: PropTypes.bool,
  isLoading: PropTypes.bool,
  onSettingsClick: PropTypes.func.isRequired,
  apiStatus: PropTypes.shape({
    status: PropTypes.string,
    message: PropTypes.string,
    provider: PropTypes.string,
    model: PropTypes.string,
    details: PropTypes.object
  })
};

export default ChatHeader;
