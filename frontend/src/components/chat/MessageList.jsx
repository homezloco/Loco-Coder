import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Message from './Message';

/**
 * MessageList component displays a scrollable list of chat messages
 */
const MessageList = ({
  messages = [],
  isDarkMode = false,
  onCopy,
  onRetry,
  isLoading = false,
  isTyping = false,
  className = ''
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive or when typing indicator changes
  useEffect(() => {
    if (!messagesEndRef.current) return;
    
    // Only auto-scroll if:
    // 1. New message was added
    // 2. User was already scrolled to bottom (or close to it)
    // 3. Or it's a typing indicator update
    const container = containerRef.current;
    if (!container) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    const isNewMessage = messages.length > prevMessagesLength.current;
    
    if (isNearBottom || isNewMessage || isTyping) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages, isTyping]);

  // Scroll to bottom on initial render
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, []);

  // Handle scroll event to detect when user scrolls up (for infinite loading)
  const handleScroll = (e) => {
    // TODO: Implement infinite loading when user scrolls to top
    // const { scrollTop } = e.target;
    // if (scrollTop < 100 && onLoadMore) {
    //   onLoadMore();
    // }
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className={`flex-1 overflow-y-auto p-4 ${className}`}
    >
      {/* Loading indicator at top when loading more messages */}
      {isLoading && messages.length === 0 && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Messages */}
      <div className="space-y-2">
        {messages.map((message, index) => {
          // Ensure type is always provided, default to 'system' if not specified
          const messageType = message.type || message.role || 'system';
          
          return (
            <Message
              key={message.id || index}
              type={messageType}
              isLastMessage={index === messages.length - 1}
              isDarkMode={isDarkMode}
              onCopy={onCopy}
              onRetry={() => onRetry && onRetry(message)}
              {...message}
            />
          );
        })}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start p-4">
            <div className="flex-shrink-0 mr-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <svg 
                  className="w-5 h-5 text-gray-600 dark:text-gray-300" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M8 18c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm8-12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm-8 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm8 2c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {messages.length === 0 && !isLoading && !isTyping && (
          <div className={`text-center py-12 px-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-4xl mb-4">👋</div>
            <h3 className="text-lg font-medium mb-1">Welcome to Coder AI Assistant</h3>
            <p className="text-sm">Ask me anything about your code or project!</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

MessageList.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
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
      error: PropTypes.string,
      metadata: PropTypes.object
    })
  ).isRequired,
  isDarkMode: PropTypes.bool,
  onCopy: PropTypes.func,
  onRetry: PropTypes.func,
  isLoading: PropTypes.bool,
  isTyping: PropTypes.bool,
  className: PropTypes.string
};

export default MessageList;
