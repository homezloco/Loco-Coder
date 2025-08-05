import React, { useCallback } from 'react';
import { FiPlus, FiFolder } from 'react-icons/fi';

// Context hooks
import { useFeedback } from '../../feedback/FeedbackContext';
import { useApi } from '../../../contexts/NewApiContext';

// Components
import ProjectFilters from './components/ProjectFilters';
import ProjectGrid from './components/ProjectGrid';
import ProjectList from './components/ProjectList';
import WelcomeScreen from '../WelcomeScreen';
import ProjectCreator from '../ProjectCreator';
import ProjectDescriptionModal from '../ProjectDescriptionModal';
import ProjectPlanReview from '../ProjectPlanReview';
import ProjectGenerationProgress from '../ProjectGenerationProgress';
import ChatPanel from '../../chat/ChatPanel';
import ChatToggle from './components/ChatToggle';

// Hooks
import useProjects from './hooks/useProjects';
import useProjectCreation from './hooks/useProjectCreation';
import useChat from './hooks/useChat';

const DashboardV2 = ({ isDarkMode = false }) => {
  // Get the API context to access aiService
  const { aiService } = useApi();
  // Get projects state and actions from custom hooks
  const {
    projects,
    filteredProjects,
    loading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    setSearchQuery,
    setViewMode,
    handleSortChange,
    refreshProjects,
    toggleFavorite,
    deleteProject,
  } = useProjects();
  
  // Get project creation state and actions
  const {
    showProjectCreator,
    showProjectDescriptionModal,
    showPlanReview,
    projectDescription,
    isGeneratingPlan,
    projectPlan,
    projectError,
    startNewProject,
    closeProjectDescription,
    closeProjectPlan,
    handleProjectDescriptionSubmit,
    createProjectFromPlan,
    createProjectFromTemplate,
  } = useProjectCreation();
  
  // Get feedback context
  const { showErrorToast } = useFeedback();
  
  // Handle project selection
  const handleProjectSelect = useCallback((project) => {
    if (!project || !project.id) {
      console.error('Cannot navigate to project: Invalid project or missing ID');
      showErrorToast('Cannot open project: Invalid project data');
      return;
    }
    
    console.log('Selected project:', project.id);
    window.location.href = `/project/${project.id}`;
  }, [showErrorToast]);
  
  // Chat functionality
  const {
    messages,
    isLoading: isChatLoading,
    error: chatError,
    isChatOpen,
    sendMessage,
    clearChat,
    toggleChat,
  } = useChat();

  // Handle sending a message from the chat panel
  const handleSendMessage = useCallback(async (message) => {
    // If the chat is not already open, open it
    if (!isChatOpen) {
      toggleChat();
    }
    
    // Send the message
    await sendMessage(message);
  }, [isChatOpen, sendMessage, toggleChat]);

  // Projects view renderer
  const renderProjectsView = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-red-500 dark:text-red-400 font-medium mb-2">
            Error loading projects
          </div>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            {error}
          </p>
          <button
            onClick={refreshProjects}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (filteredProjects.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            <FiFolder className="h-full w-full opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery ? 'No projects match your search.' : 'Get started by creating a new project.'}
          </p>
          <button
            onClick={() => startNewProject(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
          >
            <FiPlus className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        </div>
      );
    }

    return viewMode === 'grid' ? (
      <ProjectGrid
        projects={filteredProjects}
        onSelect={handleProjectSelect}
        onToggleFavorite={toggleFavorite}
        onDeleteClick={deleteProject}
        isDarkMode={isDarkMode}
      />
    ) : (
      <ProjectList
        projects={filteredProjects}
        onSelect={handleProjectSelect}
        onToggleFavorite={toggleFavorite}
        onDeleteClick={deleteProject}
        isDarkMode={isDarkMode}
      />
    );
  };
  
  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Projects</h1>
          <button
            onClick={startNewProject}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiPlus className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        </div>
        
        {/* Filters and view controls */}
        <ProjectFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isDarkMode={isDarkMode}
        />
        
        {/* Projects grid/list */}
        {renderProjectsView()}
      </div>
      
      {/* Modals */}
      <ProjectDescriptionModal
        isOpen={showProjectDescriptionModal}
        onClose={closeProjectDescription}
        onSubmit={handleProjectDescriptionSubmit}
      />
      
      {showPlanReview && (
        <ProjectPlanReview
          plan={projectPlan || {}}
          onClose={closeProjectPlan}
          onConfirm={createProjectFromPlan}
          isGenerating={isGeneratingPlan}
          aiService={aiService}
        />
      )}
      
      <ProjectCreator
        isOpen={showProjectCreator}
        onClose={() => setShowProjectCreator(false)}
        onCreateProject={createProjectFromTemplate}
      />
      
      <ProjectGenerationProgress
        isOpen={isGeneratingPlan && !projectPlan && !projectError}
        status="generating"
        message="Generating project plan..."
        progress={0}
      />
      
      {/* AI Chat Panel */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col" style={{ height: '60vh', zIndex: 1000 }}>
          <ChatPanel 
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            error={chatError}
            onRetryMessage={handleSendMessage}
            onClearChat={clearChat}
            isDarkMode={isDarkMode}
            className="flex-1"
          />
        </div>
      )}
      
      {/* Chat Toggle Button */}
      <ChatToggle 
        isOpen={isChatOpen} 
        onClick={toggleChat} 
        unreadCount={messages.filter(m => !m.read && m.role === 'assistant').length}
        className={`${isChatOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
      />
    </div>
  );
};

export default DashboardV2;
