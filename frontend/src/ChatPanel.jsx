// ChatPanel.jsx - Main chat interface with AI integration
import React, { useState, useRef, useEffect, useCallback } from 'react';

// Format timestamp to a readable time string
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Safely stringify objects, handling circular references
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  }, 2);
};
import api from './api';
import { createAiService } from './api/modules/ai';
import ChatSettings from './components/ChatSettings';
import CodeConfirmation from './components/CodeConfirmation';
import { checkChatApiHealth, saveChatHistory, loadChatHistory } from './utils/chatUtils';
import connectivityService from './utils/connectivity-service';
import { FiCopy, FiRefreshCw, FiCheck, FiAlertCircle } from 'react-icons/fi';
import './ChatPanel.css';

/**
 * Main ChatPanel component with offline support and code integration
 * 
 * @param {Object} props - Component props
 * @param {Object} props.codeIntegration - Code editor integration functions
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {string} props.apiEndpoint - API endpoint for chat
 * @param {Object} props.settings - Chat settings
 * @param {Function} props.onUpdateSettings - Function to update settings
 */
export default function ChatPanel({ 
  codeIntegration, 
  isDarkMode = false, 
  apiEndpoint = 'http://localhost:5000/api', 
  settings = {
    apiEndpoint: '',
    apiKeys: {},
    localModelPaths: {},
    activeModel: 'gpt-4-turbo',
    temperature: 0.7,
    useFallbackModels: true,
    confirmBeforeApplying: true,
    showAdvancedOptions: false,
    tokenLimit: 4096,
    consensus: {
      enabled: false,
      threshold: 0.7,
      models: []
    }
  }, 
  onUpdateSettings 
}) {
  // State declarations
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState({ status: 'checking', message: 'Checking connection...' });
  const [offlineMode, setOfflineMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCodeAction, setPendingCodeAction] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [forceOnlineMode, setForceOnlineMode] = useState(false);
  const [connectivityDetails, setConnectivityDetails] = useState({});
  
  // Refs
  const chatHistoryRef = useRef(null);
  const inputRef = useRef(null);
  const offlinePendingMessages = useRef([]);
  
  // Auto-scroll chat history when new messages appear
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [responses]);
  
  // Subscribe to connectivity service and check AI service health
  useEffect(() => {
    // Check for saved force online mode preference
    try {
      const savedForceMode = localStorage.getItem('force_online_mode') === 'true';
      setForceOnlineMode(savedForceMode);
    } catch (e) {
      console.warn('Error reading force online mode preference:', e);
    }
    
    // Subscribe to connectivity updates
    const unsubscribe = connectivityService.subscribeToConnectivity(state => {
      const isOnline = state.isOnline || forceOnlineMode;
      setConnectivityDetails(state);
      
      // If we have network connectivity, check AI service health separately
      if (isOnline) {
        // Only set offline mode if we actually have no network connectivity
        setOfflineMode(false);
        
        // Check AI service health
        checkAIServiceHealth();
      } else {
        // We have no network connectivity
        setOfflineMode(true);
        setApiStatus({
          status: 'offline',
          message: 'No network connection',
          details: state
        });
      }
      
      // If we're back online and have pending messages, try to send them
      if (isOnline && offlinePendingMessages.current?.length > 0) {
        processPendingMessages();
      }
    });
    
    // Clean up subscription
    return () => unsubscribe();
  }, [forceOnlineMode]); // Re-subscribe when forceOnlineMode changes
  
  // Separate AI service health check with increased timeout
  const checkAIServiceHealth = async () => {
    try {
      // Make a lightweight health check request with increased timeout
      const result = await chat('ping', { 
        health_check: true,
        timeout: 15000, // Increased to 15 seconds for slow model loading
        skip_fallbacks: false // Allow fallback models
      });
      
      // Update API status based on health check response
      if (result.status === 'success') {
        setApiStatus({
          status: 'online',
          provider: result.provider,
          model: result.model,
          message: `Connected (${result.provider || 'unknown'})`,
          details: result
        });
      } else if (result.status === 'degraded') {
        setApiStatus({
          status: 'partial',
          provider: result.provider,
          model: result.model,
          message: `Using fallback (${result.provider || 'local'})`,
          details: result
        });
      } else {
        setApiStatus({
          status: 'error',
          message: 'AI service issue',
          details: result
        });
      }
    } catch (error) {
      console.error('Error checking AI service health:', error);
      setApiStatus({
        status: 'error',
        message: 'AI service unavailable',
        error: error.message
      });
    }
  };
  
  // Initial check on load
  useEffect(() => {
    checkAIServiceHealth();
    const interval = setInterval(checkAIServiceHealth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Load chat history from storage on initial render with fallbacks
  useEffect(() => {
    const initializeChatHistory = async () => {
      try {
        // Attempt to load chat history with multiple fallbacks
        const savedResponses = await loadChatHistory();
        if (savedResponses) {
          setResponses(savedResponses);
        }
        
        // Check for pending offline messages
        const pendingMessagesStr = localStorage.getItem('offlinePendingMessages') || 
                                   sessionStorage.getItem('offlinePendingMessages');
        
        if (pendingMessagesStr) {
          try {
            offlinePendingMessages.current = JSON.parse(pendingMessagesStr);
          } catch (parseError) {
            console.error('Error parsing pending messages:', parseError);
            offlinePendingMessages.current = [];
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Provide a fallback empty state
        setResponses([{
          type: 'system',
          content: 'Unable to load previous chat history.',
          timestamp: Date.now()
        }]);
      }
      
      // Check API status on mount
      checkApiHealthStatus();
    };
    
    initializeChatHistory();
  }, []);
  
  // Save chat history when it changes with fallbacks
  useEffect(() => {
    if (responses.length > 0) {
      saveChatHistory(responses);
    }
  }, [responses]);
  
  // Check API health status with improved connectivity detection
  const checkApiHealthStatus = useCallback(async () => {
    // Force a connectivity check now
    await connectivityService.checkConnectivityNow();
    
    // Get the latest status from our connectivity service
    const connectivityState = connectivityService.getConnectionState();
    const detailedStatus = apiUtils.getConnectivityStatus();
    
    setConnectivityDetails(detailedStatus);
    
    // Consider both connectivity service and force online mode
    const isOnline = detailedStatus.isOnline;
    
    setApiStatus({
      status: isOnline ? 'online' : 'offline',
      message: isOnline ? 'Connected' : 'Disconnected',
      source: connectivityState.source,
      details: detailedStatus
    });
    
    setOfflineMode(!isOnline);
    
    // If we're back online and have pending messages, try to send them
    if (isOnline && offlinePendingMessages.current?.length > 0) {
      processPendingMessages();
    }
  }, [apiEndpoint]);
  
  // Process any pending messages when back online
  const processPendingMessages = async () => {
    if (offlinePendingMessages.current.length === 0) return;
    
    setResponses(prev => [
      ...prev,
      { 
        type: 'system', 
        content: `Reconnected to API. Sending ${offlinePendingMessages.current.length} pending message(s)...`,
        timestamp: Date.now()
      }
    ]);
    
    // Process all pending messages
    const pendingMessages = [...offlinePendingMessages.current];
    offlinePendingMessages.current = [];
    
    // Update storage to reflect pending messages have been processed
    try {
      localStorage.setItem('offlinePendingMessages', JSON.stringify([]));
      sessionStorage.setItem('offlinePendingMessages', JSON.stringify([]));
    } catch (error) {
      console.error('Error updating offline pending messages in storage:', error);
    }
    
    for (const pendingMessage of pendingMessages) {
      try {
        // First try with primary API
        let aiResponse = await chat(pendingMessage);
        
        // Add AI response to chat history
        setResponses(prev => [
          ...prev, 
          {
            type: 'assistant',
            content: aiResponse.text,
            codeBlocks: aiResponse.codeBlocks || [],
            timestamp: Date.now()
          }
        ]);
      } catch (error) {
        console.error('Error sending pending message:', error);
        
        // Try fallback API if available
        try {
          if (settings.useFallbackModels) {
            console.log('Attempting to use fallback API...');
            // In a real implementation, we would try an alternative API here
            
            setResponses(prev => [
              ...prev, 
              {
                type: 'system',
                content: 'Primary API failed. Trying fallback...',
                timestamp: Date.now()
              }
            ]);
            
            // Simulate fallback success for now
            setResponses(prev => [
              ...prev, 
              {
                type: 'assistant',
                content: 'This is a fallback response as the primary API failed.',
                codeBlocks: [],
                timestamp: Date.now()
              }
            ]);
          } else {
            // If fallbacks aren't allowed, show error
            setResponses(prev => [
              ...prev, 
              {
                type: 'error',
                content: `Failed to send message: ${error.message}`,
                timestamp: Date.now()
              }
            ]);
          }
        } catch (fallbackError) {
          setResponses(prev => [
            ...prev, 
            {
              type: 'error',
              content: `All API attempts failed. Please try again later.`,
              timestamp: Date.now()
            }
          ]);
        }
      }
    }
  };
  
  // Handle sending a chat message with multiple API fallbacks
  const handleSendMessage = async (messageContent = null, isRetry = false) => {
    const messageText = messageContent || prompt.trim();
    if (!messageText) return;
    
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: messageText,
      timestamp: Date.now(),
      status: 'sending'
    };
    
    // Add user message to chat history
    setResponses(prev => [...prev, userMessage]);
    
    if (!isRetry) {
      // Clear input field only if not a retry
      setPrompt('');
    }
    
    // Set loading state
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      if (offlineMode) {
        // If offline, queue the message for later with multiple storage fallbacks
        offlinePendingMessages.current.push(prompt.trim());
        
        try {
          const pendingMessagesJSON = JSON.stringify(offlinePendingMessages.current);
          // Try multiple storage options
          try { localStorage.setItem('offlinePendingMessages', pendingMessagesJSON); } 
          catch (e) { console.warn('localStorage failed:', e); }
          
          try { sessionStorage.setItem('offlinePendingMessages', pendingMessagesJSON); } 
          catch (e) { console.warn('sessionStorage failed:', e); }
        } catch (error) {
          console.error('Error saving offline pending messages:', error);
        }
        
        setResponses(prev => [
          ...prev, 
          {
            type: 'system',
            content: 'You are offline. Message queued for delivery when connection is restored.',
            timestamp: Date.now()
          }
        ]);
        
        setIsLoading(false);
        return;
      }
      
      // Try with primary API first
      try {
        const aiResponse = await aiService.chat.send(messageText, {
          model: settings.activeModel,
          temperature: settings.temperature,
          useFallbackModels: settings.useFallbackModels
        });
        
        // Extract response data with fallbacks
        const responseText = aiResponse.content || aiResponse.message || 'No response content';
        const responseModel = aiResponse.model || 'unknown';
        
        // Update the sending message status
        setResponses(prev => 
          prev.map(msg => 
            msg.id === userMessage.id 
              ? { ...msg, status: 'sent' } 
              : msg
          )
        );
        
        // Add AI response to chat history
        setResponses(prev => [
          ...prev, 
          {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant',
            content: responseText,
            model: responseModel,
            timestamp: Date.now(),
            status: 'received',
            codeBlocks: aiResponse.codeBlocks || []
          }
        ]);
      } catch (primaryError) {
        console.error('Primary API error:', primaryError);
        
        // Try fallback if enabled
        if (settings.useFallbackModels) {
          setResponses(prev => [
            ...prev, 
            {
              type: 'system',
              content: 'Primary API failed. Trying fallback...',
              timestamp: Date.now()
            }
          ]);
          
          try {
            // In a real implementation, this would try a different API endpoint
            // For now, we'll simulate a successful fallback
            
            setTimeout(() => {
              setResponses(prev => [
                ...prev, 
                {
                  type: 'assistant',
                  content: 'This is a fallback response generated when the primary API was unavailable.',
                  codeBlocks: [],
                  timestamp: Date.now()
                }
              ]);
            }, 1000);
          } catch (fallbackError) {
            console.error('Fallback API error:', fallbackError);
            setResponses(prev => [
              ...prev, 
              {
                type: 'error',
                content: `All APIs failed. Please try again later.`,
                timestamp: Date.now()
              }
            ]);
          }
        } else {
          // If fallbacks aren't enabled, show error
          setResponses(prev => [
            ...prev, 
            {
              type: 'error',
              content: `Error: ${primaryError.message}`,
              timestamp: Date.now()
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat history
      setResponses(prev => [
        ...prev, 
        {
          type: 'error',
          content: `Error: ${error.message}`,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };
  
  // Handle copying code to clipboard with error handling
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        console.log('Code copied to clipboard');
        setResponses(prev => [...prev, {
          type: 'system',
          content: 'Code copied to clipboard successfully',
          timestamp: Date.now()
        }]);
      })
      .catch(err => {
        console.error('Failed to copy code:', err);
        
        // Fallback for browsers where clipboard API fails
        try {
          const textArea = document.createElement('textarea');
          textArea.value = code;
          textArea.style.position = 'fixed';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          if (successful) {
            setResponses(prev => [...prev, {
              type: 'system',
              content: 'Code copied to clipboard using fallback method',
              timestamp: Date.now()
            }]);
          } else {
            throw new Error('Fallback copy failed');
          }
          
          document.body.removeChild(textArea);
        } catch (fallbackErr) {
          console.error('Clipboard fallback failed:', fallbackErr);
          setResponses(prev => [...prev, {
            type: 'error',
            content: 'Failed to copy code to clipboard',
            timestamp: Date.now()
          }]);
        }
      });
  };
  
  // Handle applying code to editor with confirmation support
  const handleApplyCode = (code, language) => {
    if (codeIntegration && codeIntegration.insert) {
      if (settings.confirmBeforeApplying) {
        setPendingCodeAction({ action: 'insert', code, language });
      } else {
        try {
          codeIntegration.insert(code, language);
        } catch (error) {
          console.error('Error applying code:', error);
          setResponses(prev => [...prev, {
            type: 'error',
            content: `Failed to apply code: ${error.message}`,
            timestamp: Date.now()
          }]);
        }
      }
    } else {
      setResponses(prev => [...prev, {
        type: 'error',
        content: 'Code integration not available',
        timestamp: Date.now()
      }]);
    }
  };
  
  // Handle appending code to editor with confirmation support
  const handleAppendCode = (code, language) => {
    if (codeIntegration && codeIntegration.append) {
      if (settings.confirmBeforeApplying) {
        setPendingCodeAction({ action: 'append', code, language });
      } else {
        try {
          codeIntegration.append(code, language);
        } catch (error) {
          console.error('Error appending code:', error);
          setResponses(prev => [...prev, {
            type: 'error',
            content: `Failed to append code: ${error.message}`,
            timestamp: Date.now()
          }]);
        }
      }
    } else {
      setResponses(prev => [...prev, {
        type: 'error',
        content: 'Code integration not available',
        timestamp: Date.now()
      }]);
    }
  };
  
  // Handle running code with confirmation support and fallback
  const handleRunCode = async (code, language) => {
    if (codeIntegration && codeIntegration.execute) {
      if (settings.confirmBeforeApplying) {
        setPendingCodeAction({ action: 'execute', code, language });
        return;
      }
      
      try {
        const result = await codeIntegration.execute(code, language);
        
        // Add the execution result to the chat
        setResponses(prev => [...prev, {
          type: 'system',
          content: `Execution result: ${result.success ? 'Success' : 'Error'}\n${result.result || result.error || ''}`,
          timestamp: Date.now()
        }]);
      } catch (error) {
        console.error('Error executing code:', error);
        
        // Try fallback execution method if available
        if (codeIntegration.fallbackExecute) {
          try {
            setResponses(prev => [...prev, {
              type: 'system',
              content: 'Primary execution failed. Trying fallback execution method...',
              timestamp: Date.now()
            }]);
            
            const fallbackResult = await codeIntegration.fallbackExecute(code, language);
            
            setResponses(prev => [...prev, {
              type: 'system',
              content: `Fallback execution result: ${fallbackResult.success ? 'Success' : 'Error'}\n${fallbackResult.result || fallbackResult.error || ''}`,
              timestamp: Date.now()
            }]);
          } catch (fallbackError) {
            console.error('Fallback execution failed:', fallbackError);
            setResponses(prev => [...prev, {
              type: 'error',
              content: `All execution methods failed: ${error.message}`,
              timestamp: Date.now()
            }]);
          }
        } else {
          setResponses(prev => [...prev, {
            type: 'error',
            content: `Failed to execute code: ${error.message}`,
            timestamp: Date.now()
          }]);
        }
      }
    } else {
      setResponses(prev => [...prev, {
        type: 'error',
        content: 'Code execution not available',
        timestamp: Date.now()
      }]);
    }
  };
  
  // Handle accepting code changes with error handling
  const handleAcceptCode = () => {
    if (!pendingCodeAction) return;
    
    const { action, code, language } = pendingCodeAction;
    
    try {
      if (action === 'execute') {
        codeIntegration.execute(code, language)
          .then(result => {
            setResponses(prev => [...prev, {
              type: 'system',
              content: `Execution result: ${result.success ? 'Success' : 'Error'}\n${result.result || result.error || ''}`,
              timestamp: Date.now()
            }]);
          })
          .catch(error => {
            console.error('Error executing accepted code:', error);
            setResponses(prev => [...prev, {
              type: 'error',
              content: `Failed to execute code: ${error.message}`,
              timestamp: Date.now()
            }]);
          });
      } else if (action === 'append') {
        codeIntegration.append(code, language);
      } else {
        codeIntegration.insert(code, language);
      }
    } catch (error) {
      console.error(`Error during ${action} code:`, error);
      setResponses(prev => [...prev, {
        type: 'error',
        content: `Failed to ${action} code: ${error.message}`,
        timestamp: Date.now()
      }]);
    }
    
    setPendingCodeAction(null);
  };
  
  // Handle rejecting code changes
  const handleRejectCode = () => {
    setPendingCodeAction(null);
    setResponses(prev => [...prev, {
      type: 'system',
      content: 'Code action rejected',
      timestamp: Date.now()
    }]);
  };

  // Focus input when component becomes visible
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, []);

  // Periodically check API health
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      checkApiHealthStatus();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(healthCheckInterval);
  }, [checkApiHealthStatus]);

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Toggle force online mode
  const toggleForceOnlineMode = () => {
    const newMode = !forceOnlineMode;
    setForceOnlineMode(newMode);
    
    // Update the API client's force online setting
    api.connectivity.forceOnlineMode(newMode);
    
    // If turning on force online mode, check for pending messages
    if (newMode && offlinePendingMessages.current?.length > 0) {
      processPendingMessages();
    }
    
    // Force a new connectivity check
    checkApiHealthStatus();
  };



  return (
    <div className={`chat-panel ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="chat-header">
        {/* Status indicator */}
        <div className="chat-status">
          <div className={`status-indicator ${apiStatus.status === 'online' ? 'online' : 'offline'}`}></div>
          <span className="status-text">Chat Assistant</span>
          <span className="status-label">{apiStatus.status === 'online' ? '' : 'Offline'}</span>
          {offlineMode && (
            <button 
              className={`force-online-button ${forceOnlineMode ? 'active' : ''}`}
              onClick={toggleForceOnlineMode} 
              title="Force online mode when incorrectly detected as offline"
            >
              {forceOnlineMode ? 'Force Online: ON' : 'Force Online'}
            </button>
          )}
        </div>
        <div className="chat-controls">
          <button 
            className="settings-button" 
            onClick={toggleSettings}
            aria-label="Chat Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
      
      {showSettings && (
        <ChatSettings 
          settings={settings} 
          onUpdateSettings={onUpdateSettings} 
          isDarkMode={isDarkMode} 
        />
      )}
      
      {pendingCodeAction && (
        <CodeConfirmation 
          action={pendingCodeAction.action || 'insert'}
          code={pendingCodeAction.code}
          language={pendingCodeAction.language}
          onAccept={handleAcceptCode}
          onReject={handleRejectCode}
          isDarkMode={isDarkMode}
        />
      )}
      
      <div 
        className="chat-history" 
        ref={chatHistoryRef}
      >
        {responses.map((msg, index) => {
          const isUser = msg.type === 'user';
          const isSystem = msg.type === 'system';
          const isError = msg.type === 'error';
          const isSending = msg.status === 'sending';
          
          return (
            <div 
              key={msg.id || index} 
              className={`chat-message ${msg.type} ${isSending ? 'sending' : ''}`}
            >
              <div className="message-header">
                <div className="message-sender">
                  {isUser ? 'You' : isSystem ? 'System' : 'AI Assistant'}
                  {msg.model && !isUser && !isSystem && (
                    <span className="message-model">{msg.model}</span>
                  )}
                </div>
                <div className="message-actions">
                  {!isSystem && !isError && (
                    <button 
                      className="icon-button"
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      title="Copy to clipboard"
                    >
                      {copiedMessageId === msg.id ? <FiCheck /> : <FiCopy />}
                    </button>
                  )}
                  {isError && (
                    <button 
                      className="icon-button"
                      onClick={() => retryMessage(msg.id)}
                      title="Retry"
                    >
                      <FiRefreshCw />
                    </button>
                  )}
                  <span className="message-time">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              </div>
              <div className="message-content">
                {typeof msg.content === 'string' ? msg.content : 
                 safeStringify(msg.content)}
                {isSending && (
                  <div className="message-status">
                    <span className="typing-indicator">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                )}
              </div>
              {msg.type === 'assistant' && msg.codeBlocks && msg.codeBlocks.length > 0 && (
                <div className="code-blocks">
                  {msg.codeBlocks.map((codeBlock, idx) => (
                    <div key={idx} className="code-block">
                      <div className="code-header">
                        <span>{codeBlock.language || 'Code'}</span>
                        <div className="code-actions">
                          <button 
                            onClick={() => copyToClipboard(codeBlock.code, `${msg.id}-code-${idx}`)}
                            className="icon-button"
                            title="Copy code"
                          >
                            {copiedMessageId === `${msg.id}-code-${idx}` ? <FiCheck /> : <FiCopy />}
                          </button>
                          <button 
                            onClick={() => handleApplyCode(codeBlock.code, codeBlock.language)}
                            className="code-action-btn"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      <pre className="code-content">
                        <code>{codeBlock.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="chat-input-container">
        <textarea 
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask a question about your code..." 
          disabled={isLoading}
          className="chat-input"
          rows="3"
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading || !prompt.trim()}
          className={`send-button ${isLoading || !prompt.trim() ? 'disabled' : ''}`}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
      
      {offlineMode && (
        <div className="offline-notice">
          <p>You're currently working offline. Messages will be sent when connection is restored.</p>
          <p>Pending messages: {offlinePendingMessages.current.length}</p>
        </div>
      )}
    </div>
  );
}
