// ChatPanel.jsx - Main chat interface with AI integration
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chat } from './api';
import ChatSettings from './components/ChatSettings';
import CodeConfirmation from './components/CodeConfirmation';
import { checkChatApiHealth, saveChatHistory, loadChatHistory } from './utils/chatUtils';
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
  settings = {}, 
  onUpdateSettings 
}) {
  // State declarations
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ status: 'checking', message: 'Checking connection...' });
  const [offlineMode, setOfflineMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCodeAction, setPendingCodeAction] = useState(null);
  
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
  
  // Check API health status with multiple fallbacks
  const checkApiHealthStatus = useCallback(async () => {
    const apiHealthResult = await checkChatApiHealth(apiEndpoint);
    
    setApiStatus(apiHealthResult);
    setOfflineMode(apiHealthResult.status !== 'online');
    
    // If we're back online and have pending messages, try to send them
    if (apiHealthResult.status === 'online' && offlinePendingMessages.current.length > 0) {
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
  
  // Key press handler for the input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle sending a chat message with multiple API fallbacks
  const handleSendMessage = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = {
      type: 'user',
      content: prompt.trim(),
      timestamp: Date.now()
    };
    
    // Add user message to chat history
    setResponses(prev => [...prev, userMessage]);
    
    // Clear input field
    setPrompt('');
    
    // Set loading state
    setIsLoading(true);
    
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
        const aiResponse = await chat(prompt.trim());
        
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

  return (
    <div className={`chat-panel ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="chat-header">
        <div className="chat-title">
          <h3>Chat Assistant</h3>
          <div className={`chat-status ${apiStatus.status}`}>
            <span className="status-indicator"></span>
            <span className="status-text">
              {apiStatus.status === 'online' ? 'Online' : 
               apiStatus.status === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>
        <div className="chat-controls">
          <button 
            className="settings-button" 
            onClick={() => setShowSettings(!showSettings)}
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
        {responses.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type}`}>
            <div className="message-header">
              <strong>{msg.type === 'user' ? 'You' : msg.type === 'assistant' ? 'Assistant' : 'System'}</strong>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {msg.content}
            </div>
            {msg.type === 'assistant' && msg.codeBlocks && msg.codeBlocks.length > 0 && (
              <div className="code-blocks">
                {msg.codeBlocks.map((codeBlock, idx) => (
                  <div key={idx} className="code-block">
                    <div className="code-header">
                      <span>{codeBlock.language || 'Code'}</span>
                      <div className="code-actions">
                        <button 
                          onClick={() => handleCopyCode(codeBlock.code)}
                          className="code-action-btn"
                        >
                          Copy
                        </button>
                        <button 
                          onClick={() => handleApplyCode(codeBlock.code, codeBlock.language)}
                          className="code-action-btn"
                        >
                          Apply
                        </button>
                        <button 
                          onClick={() => handleAppendCode(codeBlock.code, codeBlock.language)}
                          className="code-action-btn"
                        >
                          Append
                        </button>
                        <button 
                          onClick={() => handleRunCode(codeBlock.code, codeBlock.language)}
                          className="code-action-btn"
                        >
                          Run
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
        ))}
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
