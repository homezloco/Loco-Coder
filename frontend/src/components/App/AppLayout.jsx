import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useAuth } from '../../contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi } from '../../contexts/NewApiContext';
import FileBrowser from '../../FileBrowser';
import CodeEditor from '../../Editor';
import Terminal from '../../Terminal';
import ChatPanel from '../chat/ChatPanel';
import FlexibleOutput from './FlexibleOutput';
import LayoutPresets from './LayoutPresets';
import AppHeader from './AppHeader';

const AppLayout = (props) => {
  // Create refs with fallbacks for undefined refs from props
  const fileBrowserPanelRef = useRef(null);
  const editorPanelRef = useRef(null);
  const outputPanelRef = useRef(null);
  const terminalPanelRef = useRef(null);
  const chatPanelRef = useRef(null);
  
  // Forward refs if provided in props, otherwise use local refs
  const fileBrowserRef = props.fileBrowserRef || fileBrowserPanelRef;
  const editorRef = props.editorRef || editorPanelRef;
  const outputRef = props.outputRef || outputPanelRef;
  const terminalRef = props.terminalRef || terminalPanelRef;
  const chatRef = props.chatRef || chatPanelRef;
  
  // Destructure props with defaults
  const {
    layoutConfig: initialLayoutConfig = {
      sidebarWidth: 20,
      editorHeight: 60,
      outputHeight: 40,
      chatWidth: 30
    },
    onLayoutChange = () => {},
    onFileSelect = () => {},
    onFileCreate = () => {},
    onFileDelete = () => {},
    onFileRename = () => {},
    onFileUpload = () => {},
    onFileDownload = () => {},
    onRunCode = () => {},
    onStopCode = () => {},
    onClearOutput = () => {},
    onSave = () => {},
    onLoad = () => {},
    handleSaveAs = () => {},
    currentFile = null,
    projectRoot = '/',
    code = '',
    setCode = () => {},
    output = '',
    chatPanelVisible = true,
    codeIntegration = {}
  } = props;
  
  // State for layout configuration
  const [layoutConfig, setLayoutConfig] = useState(initialLayoutConfig);
  
  // Effect to notify parent of layout changes
  useEffect(() => {
    onLayoutChange(layoutConfig);
  }, [layoutConfig, onLayoutChange]);
  
  // Destructure layout config with defaults
  const {
    sidebarWidth = 20,
    editorHeight = 60,
    outputHeight = 40,
    chatWidth = 30
  } = layoutConfig;
  
  // Theme context
  const { isDarkMode } = useTheme();
  
  // Auth and navigation
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // API context
  const api = useApi();
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest('.profile-menu')) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);
  
  const [chatSettings, setChatSettings] = useState({
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    useFallback: true
  });

  // Handle sending a new message
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim()) return;
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    setChatError(null);
    
    try {
      console.log('[AppLayout] Checking if AI service is available...');
      
      // First, check if AI service is available
      const isAiAvailable = await api.isAiAvailable();
      if (!isAiAvailable) {
        throw new Error('AI service is not available. Please check your connection and try again.');
      }
      
      // Wait for AI service to be ready with timeout
      console.log('[AppLayout] Waiting for AI service to be ready...');
      await api.waitForAiService().catch(err => {
        console.error('[AppLayout] Error waiting for AI service:', err);
        throw new Error('Failed to initialize AI service. Please try again.');
      });
      
      // Now get the AI service instance
      console.log('[AppLayout] Getting AI service instance...');
      const ai = api.ai;
      
      if (!ai) {
        console.error('[AppLayout] AI service is not available after waiting');
        throw new Error('AI service is not available. Please try again later.');
      }
      
      // Get the chat method (support both ai.chat and ai.chat.send)
      let chatMethod = null;
      
      if (typeof ai.chat === 'function') {
        chatMethod = ai.chat;
      } else if (ai.chat && typeof ai.chat.send === 'function') {
        chatMethod = ai.chat.send;
      }
      
      if (typeof chatMethod !== 'function') {
        console.error('[AppLayout] AI chat method is not available or not a function', {
          hasChat: 'chat' in ai,
          chatType: typeof ai.chat,
          hasChatSend: !!(ai.chat && 'send' in ai.chat)
        });
        throw new Error('Chat functionality is currently unavailable. Please try again later.');
      }
      
      console.log('[AppLayout] Using chat method:', chatMethod.name || 'anonymous function');
      
      // Call the chat method with appropriate parameters
      const response = await chatMethod(content, {
        model: chatSettings.model,
        temperature: chatSettings.temperature,
        max_tokens: chatSettings.maxTokens,
        use_fallback: chatSettings.useFallback
      });
      
      // Handle the response
      const assistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.content || response.message || 'No response from AI',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsChatLoading(false);
      
    } catch (error) {
      console.error('[AppLayout] Error in handleSendMessage:', {
        error: error.toString(),
        message: error.message,
        stack: error.stack
      });
      
      setChatError(error.message || 'Failed to send message. Please try again.');
      setIsChatLoading(false);
      
      // Add error message to chat
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error.message || 'Failed to process your request'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [chatSettings]);
  
  // Handle retrying a failed message
  const handleRetryMessage = useCallback((message) => {
    if (message.role === 'user') {
      handleSendMessage(message.content);
    }
  }, [handleSendMessage]);
  
  // Handle chat settings changes
  const handleChatSettingsChange = useCallback((newSettings) => {
    setChatSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  // Calculate panel sizes ensuring they don't exceed 100% total
  const calculatePanelSizes = () => {
    // Fixed sidebar width (20%)
    const sidebarSize = 20;
    
    // Calculate available space for main content and chat
    const availableSpace = 100 - sidebarSize;
    
    // Calculate chat panel size (30% of available space, min 15%, max 30%)
    const chatSize = chatPanelVisible 
      ? Math.max(15, Math.min(30, chatWidth))
      : 0;
    
    // Main content takes remaining space after sidebar and chat
    const mainContentSize = availableSpace - (chatPanelVisible ? chatSize : 0);
    
    // Calculate editor and output panel sizes within main content
    const editorSize = Math.max(40, Math.min(70, editorHeight));
    const outputSize = 100 - editorSize; // Ensures they add up to 100% of main content
    
    return {
      sidebarSize,
      mainContentSize,
      chatSize,
      editorSize,
      outputSize
    };
  };
  
  const {
    sidebarSize,
    mainContentSize,
    chatSize,
    editorSize,
    outputSize
  } = calculatePanelSizes();

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Coder AI
          </h1>
        </div>
        
        {/* User Profile Dropdown */}
        <div className="profile-menu">
          <Menu as="div" className="relative">
            <Menu.Button 
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-500 dark:bg-blue-600 text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.username || 'User'}
              </span>
              <ChevronDownIcon 
                className={`h-5 w-5 transition-transform ${isProfileOpen ? 'transform rotate-180' : ''} text-gray-500 dark:text-gray-400`} 
                aria-hidden="true" 
              />
            </Menu.Button>
            
            <Transition
              show={isProfileOpen}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items 
                static 
                className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
              >
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.email || user?.username || 'User'}
                  </p>
                </div>
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200`}
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate('/settings');
                        }}
                      >
                        Settings
                      </button>
                    )}
                  </Menu.Item>
                </div>
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } group flex w-full items-center px-4 py-2 text-sm text-red-500 dark:text-red-400`}
                        onClick={handleLogout}
                      >
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </nav>
      
      {/* Main content area with resizable panels */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Sidebar - File Browser - Fixed width */}
          <Panel 
            ref={fileBrowserPanelRef}
            defaultSize={sidebarWidth}
            minSize={15}
            maxSize={30}
            className="flex flex-col border-r border-gray-200 dark:border-gray-700"
            onResize={(size) => {
              setLayoutConfig(prev => ({ 
                ...prev, 
                sidebarWidth: size 
              }));
            }}
          >
            <FileBrowser
              currentFile={currentFile}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              onFileUpload={onFileUpload}
              onFileDownload={onFileDownload}
              projectRoot={projectRoot}
              isDarkMode={isDarkMode}
            />
          </Panel>
          
          <PanelResizeHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
          
          {/* Main Content - Editor and Output */}
          <Panel 
            ref={editorPanelRef}
            defaultSize={mainContentSize}
            minSize={30}
            className="flex flex-col"
            onResize={(size) => {
              setLayoutConfig(prev => ({
                ...prev,
                mainContentSize: size,
                chatWidth: 100 - size - layoutConfig.sidebarWidth
              }));
            }}
          >
            <PanelGroup direction="vertical" className="flex-1">
              {/* Editor Panel */}
              <Panel 
                defaultSize={editorSize}
                minSize={30}
                className="flex flex-col"
                onResize={(size) => {
                  setLayoutConfig(prev => ({
                    ...prev,
                    editorHeight: size,
                    outputHeight: 100 - size
                  }));
                }}
              >
                <CodeEditor
                  code={code}
                  onChange={setCode}
                  onSave={onSave}
                  onRun={onRunCode}
                  onStop={onStopCode}
                  currentFile={currentFile}
                  isDarkMode={isDarkMode}
                />
              </Panel>
              
              <PanelResizeHandle className="h-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              
              {/* Output Panel */}
              <Panel 
                ref={outputRef}
                defaultSize={outputSize}
                minSize={10}
                className="flex flex-col"
              >
                <FlexibleOutput
                  output={output}
                  onClear={onClearOutput}
                  isDarkMode={isDarkMode}
                >
                  <Terminal
                    onCommand={onRunCode}
                    isDarkMode={isDarkMode}
                  />
                </FlexibleOutput>
              </Panel>
            </PanelGroup>
          </Panel>
          
          {/* Right Sidebar - Chat Panel - Fixed width when visible */}
          {chatPanelVisible && (
            <>
              <PanelResizeHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              <Panel 
                defaultSize={chatSize}
                minSize={15}
                maxSize={40}
                className="flex flex-col border-l border-gray-200 dark:border-gray-700"
                onResize={(size) => {
                  setLayoutConfig(prev => ({
                    ...prev,
                    chatWidth: size,
                    mainContentSize: 100 - size - prev.sidebarWidth
                  }));
                }}
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Assistant</h3>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatPanel 
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onRetryMessage={handleRetryMessage}
                      isLoading={isChatLoading}
                      error={chatError}
                      settings={chatSettings}
                      onSettingsChange={handleChatSettingsChange}
                      isDarkMode={isDarkMode}
                      codeIntegration={codeIntegration}
                      className="h-full"
                    />
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
};

// Helper function to get language from filename
function getLanguageFromFilename(filename) {
  if (!filename) return 'plaintext';
  
  const extension = filename.split('.').pop().toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'm': 'objective-c',
    'sh': 'shell',
    'ps1': 'powershell',
    'bat': 'batch',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'graphql': 'graphql',
    'dockerfile': 'dockerfile'
  };
  
  return languageMap[extension] || 'plaintext';
}

AppLayout.propTypes = {
  layoutConfig: PropTypes.shape({
    sidebarWidth: PropTypes.number,
    editorHeight: PropTypes.number,
    outputHeight: PropTypes.number,
    chatWidth: PropTypes.number
  }),
  onLayoutChange: PropTypes.func,
  onFileSelect: PropTypes.func,
  onFileCreate: PropTypes.func,
  onFileDelete: PropTypes.func,
  onFileRename: PropTypes.func,
  onFileUpload: PropTypes.func,
  onFileDownload: PropTypes.func,
  onRunCode: PropTypes.func,
  onStopCode: PropTypes.func,
  onClearOutput: PropTypes.func,
  onSave: PropTypes.func,
  onLoad: PropTypes.func,
  handleSaveAs: PropTypes.func,
  currentFile: PropTypes.string,
  projectRoot: PropTypes.string,
  code: PropTypes.string,
  setCode: PropTypes.func,
  output: PropTypes.string,
  chatPanelVisible: PropTypes.bool,
  codeIntegration: PropTypes.object,
  fileBrowserRef: PropTypes.object,
  editorRef: PropTypes.object,
  outputRef: PropTypes.object,
  terminalRef: PropTypes.object,
  chatRef: PropTypes.object
};

export default AppLayout;
