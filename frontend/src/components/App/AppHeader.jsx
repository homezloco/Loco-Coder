import React from 'react';
import Breadcrumbs from '../navigation/Breadcrumbs';
import AIStatusHeader from '../AIStatusHeader';
import UnifiedMenu from '../UnifiedMenu';

const AppHeader = ({
  authenticated,
  showProjectDashboard,
  currentProject,
  currentFile,
  loading,
  username,
  isAdmin,
  isDarkMode,
  apiStatus,
  chatPanelVisible,
  toggleUserProfile,
  toggleChatPanel,
  toggleProjectDashboard,
  toggleDarkMode,
  onLogin,
  getBreadcrumbPaths,
  handleBreadcrumbNavigate
}) => {
  return (
    <div className="app-header" style={{position: 'relative', zIndex: 9100, marginTop: '0'}}>
      <div className="app-header-left">
        {/* Breadcrumb navigation */}
        {authenticated && !showProjectDashboard && currentProject && (
          <Breadcrumbs 
            paths={getBreadcrumbPaths()} 
            onNavigate={handleBreadcrumbNavigate}
            isDarkMode={isDarkMode} 
          />
        )}
        
        {/* Current file indicator */}
        {currentFile && (
          <div className="current-file">
            {currentFile}
            {loading && <span className="loading-indicator">⟳</span>}
          </div>
        )}
      </div>
      
      {/* Unified Menu */}
      <UnifiedMenu 
        onShowProjects={() => {
          toggleProjectDashboard(true);
          console.log('Menu: Projects button clicked');
        }}
        onNewProject={(e) => {
          // handleNewTemplate(e);
          console.log('Menu: New Project button clicked');
        }}
        onToggleDarkMode={toggleDarkMode}
        onToggleUserProfile={toggleUserProfile}
        onToggleChat={toggleChatPanel}
        chatPanelVisible={chatPanelVisible}
        isDarkMode={isDarkMode}
        username={username}
        apiStatus={apiStatus}
        isAdmin={isAdmin}
        onLogin={onLogin}
      />
      
      {/* AI Status Header */}
      <div className={`ai-status-container ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} py-1 px-3`}>
        <AIStatusHeader />
      </div>
    </div>
  );
};

export default AppHeader;
