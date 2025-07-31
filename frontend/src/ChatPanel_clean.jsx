// /project-root/frontend/src/ChatPanel.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chat } from './api';
import { checkApiHealth } from './components/ProjectDashboard/projectUtils.jsx';
import './ChatPanel.css';

// ChatSettings component for code application preferences
const ChatSettings = ({ settings, onUpdateSettings, isDarkMode }) => {
  const handleToggle = (key) => {
    onUpdateSettings({ [key]: !settings[key] });
  };

  const handleEndpointChange = (e) => {
    onUpdateSettings({ apiEndpoint: e.target.value });
  };

  return (
    <div className={`chat-settings-panel ${isDarkMode ? 'dark' : 'light'}`}>
      <h3>Chat Settings</h3>
      
      <div className="settings-group">
        <h4>Code Application</h4>
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={settings.autoApplyCode} 
              onChange={() => handleToggle('autoApplyCode')} 
            />
            Auto-apply code suggestions
          </label>
          <p className="setting-description">Automatically apply code changes without confirmation</p>
        </div>

        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={settings.confirmBeforeApplying} 
              onChange={() => handleToggle('confirmBeforeApplying')} 
            />
            Ask for confirmation
          </label>
          <p className="setting-description">Show confirmation dialog before applying code changes</p>
        </div>

        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={settings.highlightChanges} 
              onChange={() => handleToggle('highlightChanges')} 
            />
            Highlight code changes
          </label>
          <p className="setting-description">Highlight changes in code suggestions</p>
        </div>
      </div>

      <div className="settings-group">
        <h4>Fallback Options</h4>
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={settings.useFallbackModels} 
              onChange={() => handleToggle('useFallbackModels')} 
            />
            Use fallback AI models
          </label>
          <p className="setting-description">Fall back to alternative models when primary is unavailable</p>
        </div>

        <div className="setting-item">
          <label>API Endpoint</label>
          <input 
            type="text" 
            value={settings.apiEndpoint} 
            onChange={handleEndpointChange} 
            className="endpoint-input" 
          />
          <p className="setting-description">URL for the chat API endpoint</p>
        </div>
      </div>
    </div>
  );
};

// CodeConfirmation component for confirming code changes
const CodeConfirmation = ({ action, code, language, onAccept, onReject, isDarkMode }) => {
  return (
    <div className={`code-confirmation ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="confirmation-header">
        <h4>{action === 'execute' ? 'Run Code?' : 'Apply Code Change?'}</h4>
        <div className="confirmation-buttons">
          <button onClick={onAccept} className="accept-button">Apply</button>
          <button onClick={onReject} className="reject-button">Reject</button>
        </div>
      </div>
      <pre className="code-preview">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Main ChatPanel component
export default function ChatPanel({ codeIntegration, isDarkMode = false, apiEndpoint = 'http://localhost:5000/api', settings = {}, onUpdateSettings }) {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ status: 'checking', message: 'Checking connection...' });
  const [offlineMode, setOfflineMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingCodeAction, setPendingCodeAction] = useState(null);
  const chatHistoryRef = useRef(null);
  const inputRef = useRef(null);
  const offlinePendingMessages = useRef([]);
  
  // Auto-scroll chat history when new messages appear
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [responses]);
  
  // Load chat history from local storage on initial render
  useEffect(() => {
    try {
      // Attempt to load chat history from localStorage
      const savedResponses = localStorage.getItem('chatHistory');
      if (savedResponses) {
        setResponses(JSON.parse(savedResponses));
      }
      
      // Check for pending offline messages
      const pendingMessages = localStorage.getItem('offlinePendingMessages');
      if (pendingMessages) {
        offlinePendingMessages.current = JSON.parse(pendingMessages);
      }
    } catch (error) {
      console.error('Error loading chat history from localStorage:', error);
    }
    
    // Check API status on mount
    checkChatApiStatus();
  }, []);
  
  // Save chat history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(responses));
    } catch (error) {
      console.error('Error saving chat history to localStorage:', error);
    }
  }, [responses]);
  
  // Check API health status
  const checkChatApiStatus = useCallback(async () => {
    try {
      // First check if browser reports we have internet connection
      const hasNavigatorConnection = typeof navigator !== 'undefined' && navigator.onLine;
      
      if (!hasNavigatorConnection) {
        setApiStatus({
          status: 'offline',
          message: 'No internet connection detected'
        });
        setOfflineMode(true);
        return;
      }
      
      // Try a lightweight fetch to a reliable public endpoint to verify actual internet connectivity
      try {
        // Use a basic ping test with a short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        // Try multiple reliable endpoints in case one is blocked
        const endpoints = [
          'https://www.google.com/favicon.ico',
          'https://www.cloudflare.com/favicon.ico'
        ];
        
        let internetAvailable = false;
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(`${endpoint}?_=${Date.now()}`, {
              method: 'HEAD',
              mode: 'no-cors',
              cache: 'no-store',
              signal: controller.signal
            });
            
            internetAvailable = true;
            break;
          } catch (e) {
            // Try next endpoint
          }
        }
        
        clearTimeout(timeoutId);
        
        if (!internetAvailable) {
          setApiStatus({
            status: 'offline',
            message: 'Internet connection test failed'
          });
          setOfflineMode(true);
          return;
        }
      } catch (netError) {
        console.warn('Internet connectivity test failed:', netError);
        // Continue with API health check even if the internet test fails
      }
      
      // If we reach here, we have internet - now check API
      const apiHealth = await checkApiHealth(apiEndpoint, true);
      setApiStatus({
        status: apiHealth.status,
        message: apiHealth.message
      });
      setOfflineMode(apiHealth.status === 'offline');
      
      // If we're back online and have pending messages, try to send them
      if (apiHealth.status === 'online' && offlinePendingMessages.current.length > 0) {
        processPendingMessages();
      }
    } catch (error) {
      console.error('Error checking chat API status:', error);
      setApiStatus({
        status: 'error',
        message: 'Error checking connection'
      });
      setOfflineMode(true);
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
    
    try {
      localStorage.setItem('offlinePendingMessages', JSON.stringify(offlinePendingMessages.current));
    } catch (error) {
      console.error('Error updating offline pending messages in localStorage:', error);
    }
    
    for (const pendingMessage of pendingMessages) {
      try {
        // Get AI response
        const aiResponse = await chat(pendingMessage);
        
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
        setResponses(prev => [
          ...prev, 
          {
            type: 'error',
            content: `Failed to send message: ${error.message}`,
            timestamp: Date.now()
          }
        ]);
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
  
  // Handle sending a chat message
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
        // If offline, queue the message for later
        offlinePendingMessages.current.push(prompt.trim());
        
        try {
          localStorage.setItem('offlinePendingMessages', JSON.stringify(offlinePendingMessages.current));
        } catch (error) {
          console.error('Error saving offline pending messages to localStorage:', error);
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
      
      // Get AI response
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
  
  // Handle copying code to clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        console.log('Code copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy code:', err);
      });
  };
  
  // Handle applying code to editor
  const handleApplyCode = (code, language) => {
    if (codeIntegration && codeIntegration.insert) {
      if (settings.confirmBeforeApplying) {
        setPendingCodeAction({ action: 'insert', code, language });
      } else {
        codeIntegration.insert(code, language);
      }
    }
  };
  
  // Handle appending code to editor
  const handleAppendCode = (code, language) => {
    if (codeIntegration && codeIntegration.append) {
      if (settings.confirmBeforeApplying) {
        setPendingCodeAction({ action: 'append', code, language });
      } else {
        codeIntegration.append(code, language);
      }
    }
  };
  
  // Handle running code
  const handleRunCode = async (code, language) => {
    if (codeIntegration && codeIntegration.execute) {
      if (settings.confirmBeforeApplying) {
        setPendingCodeAction({ action: 'execute', code, language });
        return;
      }
      
      const result = await codeIntegration.execute(code, language);
      
      // Add the execution result to the chat
      if (result) {
        const resultMessage = {
          type: 'system',
          content: `Execution result: ${result.success ? 'Success' : 'Error'}\n${result.result || result.error || ''}`,
          timestamp: Date.now()
        };
        setResponses(prev => [...prev, resultMessage]);
      }
    }
  };
  
  // Handle accepting code changes
  const handleAcceptCode = () => {
    if (!pendingCodeAction) return;
    
    const { action, code, language } = pendingCodeAction;
    
    if (action === 'execute') {
      codeIntegration.execute(code, language);
    } else if (action === 'append') {
      codeIntegration.append(code, language);
    } else {
      codeIntegration.insert(code, language);
    }
    
    setPendingCodeAction(null);
  };
  
  // Handle rejecting code changes
  const handleRejectCode = () => {
    setPendingCodeAction(null);
  };

  // Focus input when component becomes visible
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, []);

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
