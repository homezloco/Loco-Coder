import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SettingsProvider, useSettings } from './settings/SettingsContext';
import { ProjectProvider, useProjects } from './project/ProjectContext';
import MainLayout from './layout/MainLayout';
import LoginModal from './auth/LoginModal';
import { showToast } from '../feedback/Toast';
import { useApiStatus } from '../../contexts/ApiStatusContext';
import './App.css';

// Main App Component - Wraps everything in necessary providers
const AppWithProviders = () => (
  <ThemeProvider>
    <SettingsProvider>
      <AuthProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </AuthProvider>
    </SettingsProvider>
  </ThemeProvider>
);

// Main App component with all the logic
const App = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { 
    authenticated, 
    username, 
    isAdmin, 
    login, 
    logout 
  } = useAuth();
  
  const { 
    projects, 
    currentProject, 
    loadProjects, 
    setCurrentProject,
    saveFile: saveProjectFile
  } = useProjects();
  
  const { status: apiStatus } = useApiStatus();
  
  // Local state
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [chatPanelVisible, setChatPanelVisible] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Refs
  const autosaveTimer = useRef(null);
  const fileVersion = useRef(0);
  
  // Layout state
  const [layoutConfig, setLayoutConfig] = useState({
    sidebarWidth: 250,
    fileBrowserWidth: 200,
    editorWidth: 600,
    outputHeight: 200,
    terminalHeight: 200,
    chatWidth: 300,
    layoutMode: 'balanced',
    sidebarCollapsed: false
  });
  
  // Chat settings
  const [chatSettings, setChatSettings] = useState(() => {
    const saved = localStorage.getItem('chatSettings');
    return saved ? JSON.parse(saved) : {
      autoApplyCode: false,
      confirmBeforeApplying: true,
      highlightChanges: true,
      useFallbackModels: true,
      apiEndpoint: 'http://localhost:5000/api'
    };
  });
  
  // Update chat settings and persist to localStorage
  const updateChatSettings = useCallback((newSettings) => {
    setChatSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('chatSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  // Handle file save
  const handleSave = useCallback(async (filename, content) => {
    if (!filename) return;
    
    try {
      if (currentProject) {
        await saveProjectFile({
          path: filename,
          content: content
        });
      } else {
        // Handle non-project file save
        await saveFile({ path: filename, content });
      }
      
      setCurrentFile(filename);
      setOutput(`File saved as: ${filename}`);
      showToast('File saved successfully', 'success');
    } catch (error) {
      console.error('Error saving file:', error);
      showToast(`Error saving file: ${error.message}`, 'error');
    }
  }, [currentProject, saveProjectFile]);
  
  // Handle code execution
  const handleRunCode = useCallback(async () => {
    try {
      setOutput('Running code...');
      const result = await execute(code, currentFile || 'untitled.py');
      setOutput(result.output);
    } catch (error) {
      console.error('Error executing code:', error);
      setOutput(`Error: ${error.message}`);
    }
  }, [code, currentFile]);
  
  // Handle file selection
  const handleFileSelect = useCallback(async (file) => {
    try {
      setLoading(true);
      const content = await loadFile(file.path);
      setCode(content);
      setCurrentFile(file.path);
    } catch (error) {
      console.error('Error loading file:', error);
      showToast(`Error loading file: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Toggle chat panel
  const toggleChatPanel = useCallback(() => {
    setChatPanelVisible(prev => {
      const newValue = !prev;
      localStorage.setItem('chatPanelVisible', String(newValue));
      return newValue;
    });
  }, []);
  
  // Toggle user profile
  const toggleUserProfile = useCallback(() => {
    setShowUserProfile(prev => !prev);
  }, []);
  
  // Toggle settings
  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);
  
  // Handle login success
  const handleLoginSuccess = useCallback((userData) => {
    login(userData);
    setShowLoginModal(false);
  }, [login]);
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const files = await loadFiles();
        setFiles(files);
      } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files', 'error');
      }
    };
    
    loadInitialData();
    loadProjects();
  }, [loadProjects]);
  
  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <MainLayout
        // Layout state
        layoutConfig={layoutConfig}
        setLayoutConfig={setLayoutConfig}
        
        // Menu and navigation
        onToggleSidebar={() => setLayoutConfig(prev => ({
          ...prev,
          sidebarCollapsed: !prev.sidebarCollapsed
        }))}
        onToggleChat={toggleChatPanel}
        onToggleUserProfile={toggleUserProfile}
        onToggleDarkMode={toggleTheme}
        onToggleSettings={toggleSettings}
        
        // App state
        code={code}
        setCode={setCode}
        output={output}
        currentFile={currentFile}
        files={files}
        onFileSelect={handleFileSelect}
        onFileSave={handleSave}
        onRunCode={handleRunCode}
        onClearOutput={() => setOutput('')}
        onLogin={handleLoginSuccess}
        
        // User and auth
        username={username}
        isAdmin={isAdmin}
        authenticated={authenticated}
        
        // API and status
        apiStatus={apiStatus}
        
        // Chat
        chatPanelVisible={chatPanelVisible}
        chatSettings={chatSettings}
        updateChatSettings={updateChatSettings}
        
        // Project
        currentProject={currentProject}
        projects={projects}
        onNewProject={() => { /* Implement new project */ }}
        onShowProjectDashboard={() => { /* Show project dashboard */ }}
        setCurrentProject={setCurrentProject}
        
        // Other
        isDarkMode={isDarkMode}
      />
      
      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal && !authenticated}
        onLoginSuccess={(userData) => {
          login(userData);
          setShowLoginModal(false);
        }}
        onClose={() => setShowLoginModal(false)}
        isDarkMode={isDarkMode}
      />
      
      {/* User Profile Panel */}
      {showUserProfile && (
        <UserProfilePanel
          username={username}
          isAdmin={isAdmin}
          onLogout={() => {
            logout();
            setShowUserProfile(false);
          }}
          onClose={() => setShowUserProfile(false)}
        />
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal && !authenticated}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setShowLoginModal(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default AppWithProviders;
