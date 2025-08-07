import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/NewAuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useProject } from '../../contexts/NewProjectContext';
import { useApi } from '../../contexts/NewApiContext';
import { useFeedback } from '../../components/feedback/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import AppLayout from './AppLayout';
import AppHeader from './AppHeader';
import Login from '../../pages/Login';
import LoadingSpinner from '../common/LoadingSpinner';
import DashboardV2 from '../ProjectDashboard/DashboardV2';
import { ApiStatusContext } from '../../contexts/ApiStatusContext';

/**
 * AppMain component that serves as the main entry point for the application.
 * Handles authentication state and renders the appropriate content.
 */
const AppMain = () => {
  // Auth and context hooks - must be called unconditionally at the top level
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { toggleTheme } = useTheme();
  const { 
    currentProject, 
    loading: projectLoading, 
    showProjectTypeSelector, 
    setShowProjectTypeSelector,
    createProject
  } = useProject();
  const { loading: apiLoading } = useApi();
  const { showErrorToast } = useFeedback();

  // State hooks - must be called unconditionally at the top level
  const [layoutState, setLayoutState] = useState({
    sidebarWidth: 20,
    editorHeight: 60,
    outputHeight: 40,
    chatWidth: 30
  });
  
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [chatSettings, setChatSettings] = useState({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  });
  const [selectedProjectType, setSelectedProjectType] = useState(null);
  
  // Refs - must be called unconditionally at the top level
  const fileBrowserPanelRef = useRef(null);
  const editorPanelRef = useRef(null);
  const outputPanelRef = useRef(null);
  const terminalPanelRef = useRef(null);
  const chatPanelRef = useRef(null);

  // Memoized values
  const layoutConfig = useMemo(() => ({
    ...layoutState,
    // Add any computed properties here
  }), [layoutState]);
  
  // File handling functions
  const handleLoad = useCallback((file) => {
    // In a real implementation, this would load the file content
    console.log('Loading file:', file);
    setCurrentFile(file);
    // Simulate loading file content
    setCode(`// ${file.name}\n// File content would be loaded here`);
  }, []);
  
  const handleSaveAs = useCallback((file) => {
    // In a real implementation, this would save the file
    console.log('Saving file:', file);
  }, []);
  
  // Update chat settings
  const updateChatSettings = useCallback((newSettings) => {
    setChatSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);
  
  const handleProjectTypeSelect = (projectType) => {
    setSelectedProjectType(projectType);
    setShowProjectTypeSelector(false);
    // Here you would typically initialize the project based on the selected type
    console.log('Selected project type:', projectType);
    
    // Create a new project based on the selected type
    const newProject = {
      name: `New ${projectType.name}`,
      type: projectType.id,
      description: projectType.description,
      files: []
    };
    
    // In a real app, you would call createProject here
    // createProject(newProject);
  };

  const handleCancelProjectCreation = () => {
    setShowProjectTypeSelector(false);
  };

  // Show dashboard if no project is selected
  if (!currentProject && !projectLoading) {
    // Get auth state for header
    const { user, isAuthenticated } = useAuth();
    const username = user?.username || user?.email || 'User';
    
    // Create header props
    const headerProps = {
      authenticated: isAuthenticated,
      showProjectDashboard: true,
      currentProject: null,
      currentFile: null,
      loading: false,
      username,
      isAdmin: user?.isAdmin || false,
      isDarkMode: settings?.theme === 'dark',
      apiStatus: { available: true },
      chatPanelVisible: false,
      toggleUserProfile: () => console.log('User profile toggle'),
      toggleChatPanel: () => console.log('Chat panel toggle'),
      toggleProjectDashboard: () => console.log('Project dashboard toggle'),
      toggleDarkMode: toggleTheme,
      onLogin: () => console.log('Login'),
      getBreadcrumbPaths: () => [],
      handleBreadcrumbNavigate: () => {}
    };
    
    // Create a simplified ApiStatusContext value for the dashboard view
    const apiStatusContextValue = {
      status: 'ok',
      lastChecked: new Date().toISOString(),
      error: null,
      components: {},
      metrics: {},
      isInitialized: true,
      isOnline: true,
      isLoading: false,
      isDegraded: false,
      isRateLimited: false,
      isOffline: false,
      checkStatus: () => Promise.resolve(),
      checkComponent: () => Promise.resolve(),
      refreshAll: () => Promise.resolve(),
      // Add isOnline function for ModelStatusIndicator component
      isOnline: () => Promise.resolve(true)
    };
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ApiStatusContext.Provider value={apiStatusContextValue}>
          <AppHeader {...headerProps} />
          <div className="pt-16"> {/* Add padding to account for fixed header */}
            <DashboardV2 isDarkMode={settings?.theme === 'dark'} />
          </div>
        </ApiStatusContext.Provider>
      </div>
    );
  }

  // Show main application layout if authenticated and project is selected
  return (
    <div className="app-container">
      <AppLayout 
        layoutConfig={layoutConfig}
        setLayoutConfig={setLayoutState}
        files={files}
        handleLoad={handleLoad}
        handleSaveAs={handleSaveAs}
        currentFile={currentFile}
        projectRoot="/"
        code={code}
        setCode={setCode}
        isDarkMode={settings?.theme === 'dark'}
        output={output}
        chatPanelVisible={true}
        chatSettings={chatSettings}
        updateChatSettings={updateChatSettings}
        fileBrowserPanelRef={fileBrowserPanelRef}
        editorPanelRef={editorPanelRef}
        outputPanelRef={outputPanelRef}
        terminalPanelRef={terminalPanelRef}
        chatPanelRef={chatPanelRef}
      />
      
      {/* Global loading indicator for API operations */}
      {(projectLoading || apiLoading) && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2 z-50">
          <LoadingSpinner size="small" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};

export default AppMain;
