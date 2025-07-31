import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChatHeader, MessageList, MessageInput, ChatStatus } from './';
import ChatSettings from '../ChatSettings';
import CodeConfirmation from '../CodeConfirmation';
import { FiCopy, FiCode, FiMic } from 'react-icons/fi';

/**
 * Format timestamp to a readable time string
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Main ChatPanel component with offline support and code integration
 */
const defaultSettings = {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  useFallback: true
};

const defaultCodeIntegration = {
  getContext: () => ({}),
  applyCode: () => {},
  getLanguage: () => 'javascript'
};

const defaultOnSendMessage = async () => {
  console.warn('No onSendMessage handler provided to ChatPanel');
};

const defaultOnRetryMessage = async () => {
  console.warn('No onRetryMessage handler provided to ChatPanel');
};

const defaultOnSettingsChange = () => {
  console.warn('No onSettingsChange handler provided to ChatPanel');
};

const ChatPanel = ({
  messages = [],
  onSendMessage = defaultOnSendMessage,
  onRetryMessage = defaultOnRetryMessage,
  isLoading = false,
  error = null,
  settings = defaultSettings,
  onSettingsChange = defaultOnSettingsChange,
  isDarkMode = false,
  codeIntegration = defaultCodeIntegration,
  className = ''
}) => {
  // Local state
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCodeAction, setPendingCodeAction] = useState(null);
  const [apiStatus, setApiStatus] = useState({
    status: 'online',
    message: 'Connected',
    lastChecked: new Date()
  });
  
  // Handle sending a message
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || !onSendMessage) return;
    
    setIsTyping(true);
    try {
      await onSendMessage(content);
      setPrompt('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsTyping(false);
    }
  }, [onSendMessage]);
  

  
  // Handle copying message to clipboard
  const handleCopyMessage = useCallback((content) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  }, []);
  
  // Handle file upload
  const handleFileUpload = useCallback((files) => {
    // In a real implementation, you would handle file uploads here
    console.log('Files to upload:', files);
    
    // For now, just add a message about the files
    if (onSendMessage) {
      onSendMessage(`[Uploaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}]`);
    }
  }, [onSendMessage]);
  
  // Handle code insertion
  const handleCodeInsert = useCallback(() => {
    // In a real implementation, this would open a code editor or insert code at cursor
    const codeSnippet = '// Your code here\nconsole.log("Hello, world!");';
    setPrompt(prev => prev + '\n```javascript\n' + codeSnippet + '\n```\n');
  }, []);
  
  // Handle voice input
  const handleVoiceInput = useCallback(() => {
    // In a real implementation, this would start/stop voice recording
    console.log('Voice input not implemented yet');
  }, []);
  
  // Handle settings update
  const handleSettingsUpdate = useCallback((newSettings) => {
    if (onSettingsChange) {
      onSettingsChange({
        ...settings,
        ...newSettings
      });
    }
    setShowSettings(false);
  }, [onSettingsChange, settings]);
  
  // Handle code confirmation
  const handleCodeConfirm = useCallback((confirmed) => {
    if (pendingCodeAction) {
      if (confirmed && pendingCodeAction.action === 'apply') {
        // Apply the code
        if (codeIntegration?.applyCode) {
          codeIntegration.applyCode(pendingCodeAction.code);
        }
      }
      setPendingCodeAction(null);
    }
  }, [pendingCodeAction, codeIntegration]);
  
  // Update typing indicator based on loading state
  useEffect(() => {
    setIsTyping(isLoading);
  }, [isLoading]);
  
  return (
    <div 
      className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} ${className}`}
    >
      {/* Chat header */}
      <ChatHeader 
        isDarkMode={isDarkMode}
        isLoading={isLoading}
        onSettingsClick={() => setShowSettings(true)}
        apiStatus={apiStatus}
      />
      
      {/* Message list */}
      <MessageList 
        messages={messages}
        isDarkMode={isDarkMode}
        onCopy={handleCopyMessage}
        onRetry={onRetryMessage}
        isLoading={isLoading}
        isTyping={isTyping}
        className="flex-1 overflow-y-auto"
      />
      
      {/* Chat status */}
      <ChatStatus 
        status={apiStatus.status}
        message={apiStatus.message}
        lastChecked={apiStatus.lastChecked}
        onRetry={() => setApiStatus({ status: 'online', message: 'Reconnected', lastChecked: new Date() })}
        isDarkMode={isDarkMode}
      />
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <MessageInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSendMessage}
          onFileUpload={handleFileUpload}
          onCodeInsert={handleCodeInsert}
          onVoiceInput={handleVoiceInput}
          isRecording={false} // Set to true when recording
          isSubmitting={isLoading}
          isDarkMode={isDarkMode}
          placeholder="Type a message..."
          disabled={isLoading}
        />
      </div>
      
      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <ChatSettings
              settings={settings}
              onSave={handleSettingsUpdate}
              onClose={() => setShowSettings(false)}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}
      
      {/* Code confirmation dialog */}
      {pendingCodeAction && (
        <CodeConfirmation
          code={pendingCodeAction.code}
          onConfirm={handleCodeConfirm}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

ChatPanel.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
  })),
  onSendMessage: PropTypes.func,
  onRetryMessage: PropTypes.func,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  settings: PropTypes.shape({
    model: PropTypes.string,
    temperature: PropTypes.number,
    maxTokens: PropTypes.number,
    useFallback: PropTypes.bool
  }),
  onSettingsChange: PropTypes.func,
  isDarkMode: PropTypes.bool,
  codeIntegration: PropTypes.shape({
    getContext: PropTypes.func,
    applyCode: PropTypes.func,
    getLanguage: PropTypes.func
  }),
  className: PropTypes.string
};

export default ChatPanel;
