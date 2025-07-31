import React from 'react';
import PropTypes from 'prop-types';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import UnifiedMenu from '../../UnifiedMenu';
import FileBrowser from '../../FileBrowser';
import CodeEditor from '../../Editor';
import Terminal from '../../Terminal';
import ChatPanel from '../../ChatPanel';
import AIStatusHeader from '../../AIStatusHeader';
import { useTheme } from '../../../context/ThemeContext';

const MainLayout = ({
  // Layout state
  layoutConfig,
  setLayoutConfig,
  
  // Menu and navigation
  onToggleSidebar,
  onToggleChat,
  onToggleUserProfile,
  onToggleDarkMode,
  onToggleSettings,
  
  // App state
  code,
  setCode,
  output,
  currentFile,
  files,
  onFileSelect,
  onFileSave,
  onRunCode,
  onClearOutput,
  
  // User and auth
  username,
  isAdmin,
  authenticated,
  
  // API and status
  apiStatus,
  
  // Chat
  chatPanelVisible,
  chatSettings,
  updateChatSettings,
  
  // Project
  currentProject,
  onNewProject,
  onShowProjectDashboard,
  showProjectDashboard,
  setShowProjectDashboard,
  projects,
  setProjects,
  
  // Other
  loading,
  isDarkMode,
  onToggleProjectDashboard
}) => {
  const { theme } = useTheme();
  
  return (
    <div className={`app-layout ${isDarkMode ? 'dark' : 'light'}`}>
      <UnifiedMenu
        onShowProjects={onShowProjectDashboard}
        onNewProject={onNewProject}
        onToggleDarkMode={onToggleDarkMode}
        onToggleUserProfile={onToggleUserProfile}
        onToggleChat={onToggleChat}
        onToggleSettings={onToggleSettings}
        isDarkMode={isDarkMode}
        username={username}
        apiStatus={apiStatus}
        isAdmin={isAdmin}
        onLogin={() => setShowLoginModal(true)}
      />
      
      <AIStatusHeader apiStatus={apiStatus} />
      
      <PanelGroup direction="horizontal" className="main-content">
        {/* File Browser Panel */}
        {!layoutConfig.sidebarCollapsed && (
          <>
            <Panel defaultSize={layoutConfig.fileBrowserWidth} minSize={15}>
              <FileBrowser
                files={files}
                currentFile={currentFile}
                onFileSelect={onFileSelect}
                onNewFile={() => {}}
                onNewFolder={() => {}}
                onDeleteFile={() => {}}
                onRenameFile={() => {}}
                currentProject={currentProject}
                onProjectSelect={(project) => setCurrentProject(project)}
              />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
          </>
        )}
        
        {/* Main Editor Panel */}
        <Panel defaultSize={layoutConfig.editorWidth} minSize={30}>
          <CodeEditor
            code={code}
            onChange={setCode}
            onSave={onFileSave}
            onRun={onRunCode}
            currentFile={currentFile}
            isDarkMode={isDarkMode}
          />
        </Panel>
        
        {/* Chat Panel */}
        {chatPanelVisible && (
          <>
            <PanelResizeHandle className="resize-handle" />
            <Panel defaultSize={layoutConfig.chatWidth} minSize={20}>
              <ChatPanel
                settings={chatSettings}
                onSettingsChange={updateChatSettings}
                onClose={() => setChatPanelVisible(false)}
                isDarkMode={isDarkMode}
              />
            </Panel>
          </>
        )}
      </PanelGroup>
      
      {/* Output/Terminal Panel */}
      <PanelGroup direction="vertical" className="bottom-panel">
        <PanelResizeHandle className="resize-handle-horizontal" />
        <Panel defaultSize={layoutConfig.outputHeight} minSize={20}>
          <Terminal
            output={output}
            onClear={onClearOutput}
            isDarkMode={isDarkMode}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};

MainLayout.propTypes = {
  // Layout state
  layoutConfig: PropTypes.shape({
    sidebarCollapsed: PropTypes.bool,
    fileBrowserWidth: PropTypes.number,
    editorWidth: PropTypes.number,
    outputHeight: PropTypes.number,
    chatWidth: PropTypes.number
  }).isRequired,
  setLayoutConfig: PropTypes.func.isRequired,
  
  // Menu and navigation
  onToggleSidebar: PropTypes.func,
  onToggleChat: PropTypes.func,
  onToggleUserProfile: PropTypes.func,
  onToggleDarkMode: PropTypes.func,
  onToggleSettings: PropTypes.func,
  
  // App state
  code: PropTypes.string,
  setCode: PropTypes.func,
  output: PropTypes.string,
  currentFile: PropTypes.string,
  files: PropTypes.array,
  onFileSelect: PropTypes.func,
  onFileSave: PropTypes.func,
  onRunCode: PropTypes.func,
  onClearOutput: PropTypes.func,
  
  // User and auth
  username: PropTypes.string,
  isAdmin: PropTypes.bool,
  authenticated: PropTypes.bool,
  
  // API and status
  apiStatus: PropTypes.object,
  
  // Chat
  chatPanelVisible: PropTypes.bool,
  chatSettings: PropTypes.object,
  updateChatSettings: PropTypes.func,
  
  // Project
  currentProject: PropTypes.object,
  onNewProject: PropTypes.func,
  onShowProjectDashboard: PropTypes.func,
  showProjectDashboard: PropTypes.bool,
  setShowProjectDashboard: PropTypes.func,
  projects: PropTypes.array,
  setProjects: PropTypes.func,
  
  // Other
  loading: PropTypes.bool,
  isDarkMode: PropTypes.bool,
  onToggleProjectDashboard: PropTypes.func
};

export default MainLayout;
