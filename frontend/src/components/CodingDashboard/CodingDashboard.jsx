import React, { useState, useEffect, useRef } from 'react';
import { FiChevronRight, FiChevronLeft, FiCheck, FiX, FiCode, FiDatabase, FiFileText, FiLayers, FiPlay } from 'react-icons/fi';
import ailangService from '../../services/ailangService';
import './CodingDashboard.css';
import ImplementationEditor from './ImplementationEditor';

/**
 * CodingDashboard Component
 * 
 * A multi-step wizard interface for coding projects following the AutoBE waterfall model:
 * Requirements → ERD → API Design → Test → Implementation
 */
const CodingDashboard = ({ isOpen, onClose, projectId = null }) => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Project data
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    requirements: '',
    entities: [],
    apiEndpoints: [],
    testCases: [],
    implementation: {
      code: '',
      structure: []
    }
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [aiModel, setAiModel] = useState('gpt-4');
  const [apiStatus, setApiStatus] = useState({ status: 'unknown' });
  
  // Refs
  const containerRef = useRef(null);
  
  // Steps configuration
  const steps = [
    {
      id: 1,
      name: 'Requirements',
      icon: <FiFileText />,
      description: 'Define project requirements and goals'
    },
    {
      id: 2,
      name: 'ERD',
      icon: <FiDatabase />,
      description: 'Create entity relationship diagrams'
    },
    {
      id: 3,
      name: 'API Design',
      icon: <FiLayers />,
      description: 'Design API endpoints and data flow'
    },
    {
      id: 4,
      name: 'Test',
      icon: <FiPlay />,
      description: 'Generate test cases and scenarios'
    },
    {
      id: 5,
      name: 'Implementation',
      icon: <FiCode />,
      description: 'Generate implementation code'
    }
  ];
  
  // Check AILang API status on mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const health = await ailangService.getSystemHealth();
        setApiStatus(health);
      } catch (err) {
        console.error('Error checking API status:', err);
        setApiStatus({ status: 'error' });
      }
    };
    
    if (isOpen) {
      checkApiStatus();
      
      // Check for dark mode preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDarkMode);
    }
  }, [isOpen]);
  
  // Load project data if projectId is provided
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        // TODO: Implement project loading logic
        // const project = await loadProjectById(projectId);
        // setProjectData(project);
        
        // Mark steps as completed based on project data
        const completed = {};
        if (projectData.requirements) completed[1] = true;
        if (projectData.entities.length > 0) completed[2] = true;
        if (projectData.apiEndpoints.length > 0) completed[3] = true;
        if (projectData.testCases.length > 0) completed[4] = true;
        if (projectData.implementation.code) completed[5] = true;
        
        setCompletedSteps(completed);
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen && projectId) {
      loadProject();
    }
  }, [isOpen, projectId]);
  
  // Handle step navigation
  const goToStep = (stepId) => {
    if (stepId < 1 || stepId > steps.length) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(stepId);
      setIsTransitioning(false);
    }, 300);
  };
  
  const goToNextStep = () => {
    if (currentStep < steps.length) {
      // Mark current step as completed
      setCompletedSteps(prev => ({ ...prev, [currentStep]: true }));
      goToStep(currentStep + 1);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };
  
  // Handle project data updates
  const updateProjectData = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle close
  const handleClose = () => {
    if (onClose) onClose();
  };
  
  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content requirements-step">
            <h2>Project Requirements</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Define your project requirements and goals. Be as specific as possible to get better results.
            </p>
            
            {/* Project name and description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectData.name}
                onChange={(e) => updateProjectData('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter project name"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Description
              </label>
              <textarea
                value={projectData.description}
                onChange={(e) => updateProjectData('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Brief description of your project"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Detailed Requirements
              </label>
              <textarea
                value={projectData.requirements}
                onChange={(e) => updateProjectData('requirements', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={10}
                placeholder="List your project requirements, features, and constraints..."
              />
            </div>
            
            {/* AI-assisted requirements generation */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">AI-Assisted Requirements</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Let AI help you generate comprehensive requirements based on your project description.
              </p>
              <button
                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {
                  // TODO: Implement AI-assisted requirements generation
                }}
              >
                Generate Requirements
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="step-content erd-step">
            <h2>Entity Relationship Diagram</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Define the data models and relationships for your project.
            </p>
            
            {/* ERD content will go here */}
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 flex items-center justify-center min-h-[400px]">
              <p className="text-gray-500 dark:text-gray-400">
                ERD Editor will be implemented here
              </p>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="step-content api-design-step">
            <h2>API Design</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Design your API endpoints and data flow.
            </p>
            
            {/* API Design content will go here */}
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 flex items-center justify-center min-h-[400px]">
              <p className="text-gray-500 dark:text-gray-400">
                API Design Editor will be implemented here
              </p>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="step-content test-step">
            <h2>Test Cases</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Generate test cases and scenarios for your API endpoints.
            </p>
            
            {/* Test Cases content will go here */}
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-6 flex items-center justify-center min-h-[400px]">
              <p className="text-gray-500 dark:text-gray-400">
                Test Case Generator will be implemented here
              </p>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="step-content implementation-step">
            <h2>Implementation</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Generate implementation code for your project.
            </p>
            
            {/* Implementation content */}
            <ImplementationEditor 
              projectData={projectData}
              updateProjectData={(data) => updateProjectData('implementation', data)}
              darkMode={isDarkMode}
              erdData={projectData.entities}
              apiDesignData={projectData.apiEndpoints}
              testData={projectData.testCases}
            />
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // If not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className={`coding-dashboard-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div 
        ref={containerRef}
        className="coding-dashboard-container"
      >
        {/* Header */}
        <div className="dashboard-header">
          <h1>Coding Dashboard</h1>
          <button 
            className="close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
        
        {/* Step navigation */}
        <div className="step-navigation">
          {steps.map((step) => (
            <button
              key={step.id}
              className={`step-button ${currentStep === step.id ? 'active' : ''} ${completedSteps[step.id] ? 'completed' : ''}`}
              onClick={() => goToStep(step.id)}
              disabled={isLoading || isTransitioning}
            >
              <div className="step-icon">
                {completedSteps[step.id] ? <FiCheck /> : step.icon}
              </div>
              <div className="step-label">
                <span className="step-name">{step.name}</span>
                <span className="step-description">{step.description}</span>
              </div>
            </button>
          ))}
        </div>
        
        {/* Main content */}
        <div className={`step-content-container ${isTransitioning ? 'transitioning' : ''}`}>
          {isLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <button 
                className="retry-button"
                onClick={() => setError(null)}
              >
                Retry
              </button>
            </div>
          ) : (
            renderStepContent()
          )}
        </div>
        
        {/* Footer */}
        <div className="dashboard-footer">
          <div className="api-status">
            <div className={`status-indicator ${apiStatus.status === 'healthy' ? 'healthy' : 'unhealthy'}`}></div>
            <span>AILang API: {apiStatus.status}</span>
          </div>
          
          <div className="navigation-buttons">
            {currentStep > 1 && (
              <button
                className="back-button"
                onClick={goToPreviousStep}
                disabled={isLoading || currentStep === 1 || isTransitioning}
              >
                <FiChevronLeft />
                Back
              </button>
            )}
            
            {currentStep < steps.length && (
              <button
                className="next-button"
                onClick={goToNextStep}
                disabled={isLoading || isTransitioning}
              >
                Next
                <FiChevronRight />
              </button>
            )}
            
            {currentStep === steps.length && (
              <button
                className="finish-button"
                onClick={handleClose}
                disabled={isLoading || isTransitioning}
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingDashboard;
