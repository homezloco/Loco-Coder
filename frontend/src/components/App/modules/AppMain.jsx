import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel, PanelGroup } from "react-resizable-panels";
import { useHotkeys } from 'react-hotkeys-hook';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../auth/AuthContext';
import { useProject } from '../project/ProjectContext';
import { useSettings } from '../settings/SettingsContext';
import AppHeader from '../AppHeader';
import AppLayout from '../AppLayout';
import LoginModal from '../LoginModal';
import ProjectDashboard from '../../ProjectDashboard';
import { isDevelopmentMode } from '../../../utils/environment';
import { useApiStatus } from '../../../hooks/useApiStatus';
import { useCodeIntegration } from '../../../hooks/useCodeIntegration';
import { useFileOperations } from '../../../hooks/useFileOperations';
import { useLayout } from '../../../hooks/useLayout';
import { useNavigation } from '../../../hooks/useNavigation';

const AppMain = () => {
  // Hooks
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { showToast } = useToast();
  const apiStatus = useApiStatus();
  
  // Contexts
  const { 
    authenticated, 
    username, 
    isAdmin, 
    token, 
    login, 
    logout, 
    checkAuth 
  } = useAuth();
  
  const { 
    currentProject, 
    projectTemplate, 
    files, 
    currentFile, 
    code, 
    output, 
    loading, 
    projectRoot,
    loadProject, 
    loadProjectFiles, 
    saveProject, 
    createProject, 
    deleteProject,
    setCode,
    setOutput,
    setCurrentFile,
    setCurrentProject,
    setProjectTemplate
  } = useProject();
  
  const { 
    isDarkMode, 
    layoutConfig, 
    chatPanelVisible, 
    showLoginModal, 
    setShowLoginModal,
    setLayoutConfig,
    toggleDarkMode,
    toggleChatPanel,
    setChatPanelVisible
  } = useSettings();
  
  // Custom hooks
  const { 
    handleSave, 
    handleSaveAs, 
    handleLoad, 
    handleNewFile, 
    handleDeleteFile 
  } = useFileOperations({
    currentProject,
    currentFile,
    code,
    files,
    setCurrentFile,
    setFiles: (files) => setFiles(files),
    setCode,
    showToast,
    loadProjectFiles
  });
  
  const {
    fileBrowserPanelRef,
    editorPanelRef,
    outputPanelRef,
    terminalPanelRef,
    chatPanelRef,
    toggleUserProfile,
    toggleProjectDashboard,
    handleBreadcrumbNavigate,
    getBreadcrumbPaths
  } = useLayout({
    navigate,
    currentProject,
    currentFile,
    setChatPanelVisible,
    setShowLoginModal,
    authenticated
  });
  
  const {
    handleRunCode,
    handleStopExecution,
    handleFormatCode,
    handleFindInFiles,
    handleReplaceInFiles
  } = useCodeIntegration({
    currentFile,
    code,
    setOutput,
    showToast,
    isDarkMode
  });
  
  // Effects
  useEffect(() => {
    // Check authentication status on mount
    const checkAuthStatus = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    checkAuthStatus();
  }, [checkAuth]);
  
  // Load project if projectId is in URL
  useEffect(() => {
    if (projectId && authenticated) {
      loadProject(projectId);
    }
  }, [projectId, authenticated, loadProject]);
  
  // Keyboard shortcuts
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    if (currentFile) {
      handleSave();
    }
  }, [currentFile, handleSave]);
  
  useHotkeys('f5', (e) => {
    e.preventDefault();
    if (currentFile) {
      handleRunCode();
    }
  }, [currentFile, handleRunCode]);
  
  // Render
  return (
    <div className="app-container">
      {/* Header */}
      <AppHeader 
        authenticated={authenticated}
        showProjectDashboard={showProjectDashboard}
        currentProject={currentProject}
        currentFile={currentFile}
        loading={loading}
        username={username}
        isAdmin={isAdmin}
        isDarkMode={isDarkMode}
        apiStatus={apiStatus}
        chatPanelVisible={chatPanelVisible}
        toggleUserProfile={toggleUserProfile}
        toggleChatPanel={toggleChatPanel}
        toggleProjectDashboard={toggleProjectDashboard}
        toggleDarkMode={toggleDarkMode}
        onLogin={() => setShowLoginModal(true)}
        getBreadcrumbPaths={getBreadcrumbPaths}
        handleBreadcrumbNavigate={handleBreadcrumbNavigate}
      />
      
      {/* Main Content */}
      <main className="app-main">
        {!authenticated ? (
          <div className="auth-required">
            <p>Please log in to access the application</p>
            <button onClick={() => setShowLoginModal(true)}>Login</button>
          </div>
        ) : projectTemplate ? (
          <ProjectDashboard 
            template={projectTemplate}
            onSelectTemplate={setProjectTemplate}
          />
        ) : (
          <AppLayout 
            layoutConfig={layoutConfig}
            setLayoutConfig={setLayoutConfig}
            files={files}
            handleLoad={handleLoad}
            handleSaveAs={handleSaveAs}
            currentFile={currentFile}
            projectRoot={projectRoot}
            code={code}
            setCode={setCode}
            isDarkMode={isDarkMode}
            output={output}
            chatPanelVisible={chatPanelVisible}
            codeIntegration={{
              handleRunCode,
              handleStopExecution,
              handleFormatCode,
              handleFindInFiles,
              handleReplaceInFiles
            }}
            chatSettings={{
              apiEndpoint: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
              model: 'gpt-4',
              temperature: 0.7,
              maxTokens: 2048
            }}
            updateChatSettings={(settings) => {
              // Update chat settings logic
              console.log('Updating chat settings:', settings);
            }}
            fileBrowserPanelRef={fileBrowserPanelRef}
            editorPanelRef={editorPanelRef}
            outputPanelRef={outputPanelRef}
            terminalPanelRef={terminalPanelRef}
            chatPanelRef={chatPanelRef}
          />
        )}
      </main>
      
      {/* Login Modal */}
      <LoginModal 
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        handleLoginSuccess={async (username, isAdmin) => {
          setShowLoginModal(false);
          showToast(`Welcome back, ${username}!`, 'success');
          if (currentProject) {
            await loadProjectFiles();
          }
        }}
      />
    </div>
  );
};

export default AppMain;
