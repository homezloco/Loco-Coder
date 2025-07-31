import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import { api } from '../services/api';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProjectTypeSelector, setShowProjectTypeSelector] = useState(true);
  const { showErrorToast, showSuccessToast } = useFeedback();
  const navigate = useNavigate();

  // Load projects from API with fallbacks
  const loadProjects = useCallback(async (force = false) => {
    // Prevent multiple simultaneous loads
    if (loading) {
      console.log('[ProjectContext] Load already in progress, skipping');
      return;
    }

    // Check if we have a recent cache
    const lastFetchTime = localStorage.getItem('projects_last_fetch');
    const cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    
    if (!force && lastFetchTime && (Date.now() - parseInt(lastFetchTime, 10)) < cacheTTL) {
      console.log('[ProjectContext] Using cached projects (recently fetched)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to load from API first
      try {
        console.log('[ProjectContext] Fetching projects from API...');
        const data = await api.getProjects(force);
        
        if (data && Array.isArray(data)) {
          console.log(`[ProjectContext] Successfully loaded ${data.length} projects from API`);
          setProjects(data);
          
          // Update localStorage as cache
          try {
            localStorage.setItem('projects', JSON.stringify(data));
            localStorage.setItem('projects_last_fetch', Date.now().toString());
            console.log('[ProjectContext] Updated projects cache in localStorage');
          } catch (cacheError) {
            console.warn('[ProjectContext] Failed to update projects cache:', cacheError);
          }
          
          return;
        } else {
          console.warn('[ProjectContext] Received invalid projects data from API:', data);
          throw new Error('Invalid projects data received from server');
        }
      } catch (apiError) {
        console.warn('[ProjectContext] API fetch failed, trying fallback storage', apiError);
        if (apiError.message !== 'Rate limited') { // Don't show toast for rate limits
          showErrorToast('Could not connect to server. Using cached projects.');
        }
      }
      
      // Fallback to localStorage if API fails
      try {
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed)) {
            console.log(`[ProjectContext] Loaded ${parsed.length} projects from cache`);
            setProjects(parsed);
            return;
          }
        }
      } catch (e) {
        console.error('[ProjectContext] Failed to load projects from cache:', e);
      }
      
      // If all else fails, use empty array
      console.warn('[ProjectContext] No projects found, using empty array');
      setProjects([]);
      
    } catch (err) {
      console.error('[ProjectContext] Critical error loading projects:', err);
      setError('Failed to load projects. Please try again later.');
      showErrorToast('Failed to load projects. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [showErrorToast]);

  // Initial load - only run once on mount
  useEffect(() => {
    console.log('[ProjectContext] Initial projects load');
    loadProjects(false);
    
    // Set up refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      console.log('[ProjectContext] Refreshing projects (scheduled)');
      loadProjects(true);
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []); // Empty dependency array ensures this only runs on mount/unmount

  const createProject = async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get AI preferences from settings for the project config
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const aiPreferences = settings.aiPreferences || {};
      
      // Prepare project data with AI preferences
      const projectToCreate = {
        name: projectData.name || 'Untitled Project',
        description: projectData.description || '',
        type: projectData.type || 'custom',
        template: projectData.template || 'default',
        config: {
          ...(projectData.config || {}),
          ai: {
            // General preferences
            codeStyle: {
              quoteStyle: aiPreferences.quoteStyle || 'single',
              trailingComma: aiPreferences.trailingComma || 'es5',
              bracketSpacing: aiPreferences.bracketSpacing !== false,
              arrowParens: aiPreferences.arrowParens || 'always',
              endOfLine: aiPreferences.endOfLine || 'lf',
              maxLineLength: aiPreferences.maxLineLength || 100
            },
            // Framework specific settings
            frameworks: {
              frontend: aiPreferences.frontend || { framework: 'react' },
              backend: aiPreferences.backend || { language: 'node' },
              mobile: aiPreferences.mobile || { framework: 'react-native' }
            },
            // Code quality settings
            quality: {
              generateTests: aiPreferences.generateTests !== false,
              testFramework: aiPreferences.testFramework || 'jest',
              testCoverage: aiPreferences.testCoverage || 80,
              enableESLint: aiPreferences.enableESLint !== false,
              enablePrettier: aiPreferences.enablePrettier !== false,
              autoFixOnSave: aiPreferences.autoFixOnSave !== false
            },
            // Security settings
            security: {
              validateInput: aiPreferences.validateInput !== false,
              escapeOutput: aiPreferences.escapeOutput !== false,
              useSecureDefaults: aiPreferences.useSecureDefaults !== false
            }
          }
        },
        files: []
      };
      
      // Call the API to create the project
      let newProject;
      try {
        // Format the project data to match the API's expected format
        const projectData = {
          name: projectToCreate.name,
          description: projectToCreate.description,
          project_type: projectToCreate.type,
          template: projectToCreate.template,
          config: projectToCreate.config,
          tags: []
        };
        
        try {
          newProject = await api.createProject(projectData);
          // Merge API response with our local data
          newProject = { ...projectToCreate, ...newProject };
        } catch (apiError) {
          // If we get an auth error, redirect to login
          if (apiError.message && apiError.message.includes('Authentication required')) {
            console.log('[Project] Authentication required, redirecting to login');
            // Use a small timeout to allow the error to be shown to the user
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  from: window.location.pathname,
                  message: 'Please sign in to create a project' 
                } 
              });
            }, 100);
            throw apiError; // Re-throw to be caught by the outer catch
          }
          throw apiError; // Re-throw other errors
        }
      } catch (apiError) {
        console.warn('Failed to create project via API, using local fallback', apiError);
        // Fallback: Create project locally
        newProject = {
          ...projectToCreate,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Update local state with the new project
      setProjects(prevProjects => [...prevProjects, newProject]);
      setCurrentProject(newProject);
      setShowProjectTypeSelector(false);
      
      // Save to localStorage as fallback
      try {
        const savedProjects = localStorage.getItem('projects');
        const projects = savedProjects ? JSON.parse(savedProjects) : [];
        projects.push(newProject);
        localStorage.setItem('projects', JSON.stringify(projects));
      } catch (e) {
        console.warn('Failed to save project to localStorage', e);
      }
      
      showSuccessToast('Project created successfully');
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      showErrorToast('Failed to create project');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (projectId, updates) => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await api.put(`/projects/${projectId}`, updates);
      
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, ...updates, updatedAt: new Date().toISOString() } 
            : project
        )
      );
      
      // Update current project if it's the one being updated
      if (currentProject?.id === projectId) {
        setCurrentProject(prev => ({
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString()
        }));
      }
      
      showSuccessToast('Project updated successfully');
    } catch (error) {
      console.error('Failed to update project:', error);
      showErrorToast('Failed to update project');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // await api.delete(`/projects/${projectId}`);
      
      setProjects(prev => prev.filter(project => project.id !== projectId));
      
      // Clear current project if it's the one being deleted
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }
      
      showSuccessToast('Project deleted successfully');
    } catch (error) {
      console.error('Failed to delete project:', error);
      showErrorToast('Failed to delete project');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setActiveProject = (project) => {
    setCurrentProject(project);
    setShowProjectTypeSelector(false);
  };

  const selectProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      setShowProjectTypeSelector(false);
      return true;
    }
    return false;
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        projects,
        loading,
        error,
        showProjectTypeSelector,
        setShowProjectTypeSelector,
        createProject,
        updateProject,
        deleteProject,
        selectProject,
        setActiveProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;
