import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiCopy, FiCheck, FiAlertCircle, FiUser, FiMessageSquare } from 'react-icons/fi';
import { formatTimestamp } from '../../utils/dateUtils';

/**
 * Message component displays a single chat message
 */
const Message = ({
  id,
  type: propType = 'system',  // Default type if not provided
  role,
  content,
  timestamp: propTimestamp,
  status = 'sent',
  isDarkMode = false,
  onCopy,
  onRetry,
  isLastMessage = false,
  error,
  metadata
}) => {
  
  // Use type from props, fall back to role, then default to 'system'
  const type = propType || role || 'system';
  
  // Ensure timestamp is a valid date or number
  const timestamp = propTimestamp ? 
    (isNaN(new Date(propTimestamp).getTime()) ? new Date() : new Date(propTimestamp)) : 
    new Date();
  const [isCopied, setIsCopied] = useState(false);
  
  // Determine message styling based on type and status
  const getMessageStyles = () => {
    const baseStyles = 'p-4 rounded-lg max-w-3xl mx-4 my-2 relative break-words';
    
    switch(type) {
      case 'user':
        return `${baseStyles} ${isDarkMode ? 'bg-blue-900 text-white ml-auto' : 'bg-blue-100 text-gray-900 ml-auto'}`;
      case 'assistant':
        return `${baseStyles} ${isDarkMode ? 'bg-gray-700 text-white mr-auto' : 'bg-white text-gray-900 mr-auto border border-gray-200'}`;
      case 'system':
        return `${baseStyles} ${isDarkMode ? 'bg-gray-800 text-gray-400 mx-auto text-center' : 'bg-gray-100 text-gray-600 mx-auto text-center'}`;
      case 'error':
        return `${baseStyles} ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'} border-l-4 border-red-500`;
      default:
        return `${baseStyles} ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`;
    }
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    if (typeof onCopy === 'function') {
      onCopy(content);
    } else {
      navigator.clipboard.writeText(content);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Render message content with proper formatting
  const renderContent = () => {
    if (typeof content !== 'string') return content;
    
    // Simple markdown-style formatting for code blocks
    const parts = content.split(/```(\w*\n?)([\s\S]*?)```/g);
    
    return parts.map((part, i) => {
      if (i % 3 === 2) {
        // This is a code block
        const language = parts[i-1]?.trim() || '';
        return (
          <pre key={i} className={`my-2 p-3 rounded overflow-x-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <code className={`language-${language}`}>
              {part}
            </code>
          </pre>
        );
      } else if (i % 3 === 0) {
        // This is normal text
        return part.split('\n').map((line, j, arr) => (
          <React.Fragment key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </React.Fragment>
        ));
      }
      return null;
    });
  };

  // Render message status indicator
  const renderStatus = () => {
    if (type === 'user' && status === 'sending') {
      return (
        <span className="text-xs opacity-70 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
          Sending...
        </span>
      );
    }
    
    if (type === 'assistant' && status === 'streaming') {
      return (
        <span className="text-xs opacity-70 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1 animate-pulse"></span>
          Typing...
        </span>
      );
    }
    
    if (status === 'error') {
      return (
        <button 
          onClick={onRetry} 
          className="text-xs text-red-500 hover:text-red-700 flex items-center mt-1"
        >
          <FiAlertCircle className="mr-1" />
          Failed to send. Tap to retry.
        </button>
      );
    }
    
    return null;
  };

  // Don't render empty messages
  if (!content) return null;

  return (
    <div 
      className={`${getMessageStyles()} ${isLastMessage ? 'animate-fade-in' : ''}`}
      data-message-type={type}
      data-message-status={status}
    >
      {/* Message header with icon and timestamp */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          {type === 'user' ? (
            <FiUser className="mr-2 text-blue-500" />
          ) : type === 'assistant' ? (
            <FiMessageSquare className="mr-2 text-green-500" />
          ) : null}
          
          <span className="text-xs opacity-70">
            {type === 'user' ? 'You' : type === 'assistant' ? 'Assistant' : 'System'}
            {timestamp && ` • ${formatTimestamp(timestamp)}`}
          </span>
        </div>
        
        {/* Copy button for assistant messages */}
        {type === 'assistant' && (
          <button 
            onClick={handleCopy}
            className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
            aria-label="Copy to clipboard"
            title="Copy to clipboard"
          >
            {isCopied ? <FiCheck className="text-green-500" /> : <FiCopy />}
          </button>
        )}
      </div>
      
      {/* Message content */}
      <div className="prose prose-sm max-w-none">
        {renderContent()}
      </div>
      
      {/* Message status */}
      {renderStatus()}
    </div>
  );
};

Message.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  type: PropTypes.oneOf(['user', 'assistant', 'system', 'error']),
  role: PropTypes.oneOf(['user', 'assistant', 'system', 'error']),
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  timestamp: PropTypes.oneOfType([
    PropTypes.number, 
    PropTypes.string, 
    PropTypes.instanceOf(Date)
  ]),
  status: PropTypes.oneOf(['sending', 'sent', 'received', 'error', 'streaming']),
  isDarkMode: PropTypes.bool,
  onCopy: PropTypes.func,
  onRetry: PropTypes.func,
  isLastMessage: PropTypes.bool,
  error: PropTypes.string,
  metadata: PropTypes.object
};



export default Message;
