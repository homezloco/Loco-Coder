import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import { useApi } from './NewApiContext';
import { useAuth } from './NewAuthContext';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProjectTypeSelector, setShowProjectTypeSelector] = useState(true);
  const { showErrorToast, showSuccessToast } = useFeedback();
  const { isAuthenticated } = useAuth();
  const api = useApi();
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
        // Use the direct getProjects method instead of api.projects.getProjects
        const data = await api.getProjects({ forceRefresh: force });
        
        if (data && Array.isArray(data)) {
          console.log(`[ProjectContext] Successfully loaded ${data.length} projects from API`);
          setProjects(data);
          
          // Update localStorage as cache
          try {
            localStorage.setItem('projects', JSON.stringify(data));
            localStorage.setItem('projects_last_fetch', Date.now().toString());
            return data;
          } catch (storageError) {
            console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
          }
        }
      } catch (apiError) {
        console.warn('[ProjectContext] API fetch failed, trying fallbacks...', apiError);
        
        // Try to load from localStorage if API fails
        try {
          const cachedProjects = localStorage.getItem('projects');
          if (cachedProjects) {
            const parsed = JSON.parse(cachedProjects);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`[ProjectContext] Loaded ${parsed.length} projects from localStorage cache`);
              setProjects(parsed);
              return parsed;
            }
          }
        } catch (cacheError) {
          console.warn('[ProjectContext] Failed to load from localStorage cache', cacheError);
        }
        
        // If we have no cached data, generate placeholder projects as a fallback
        if (projects.length === 0) {
          console.log('[ProjectContext] Generating placeholder projects as fallback');
          const placeholderProjects = [
            { 
              id: `placeholder-${Date.now()}-1`, 
              name: 'Web Application',
              description: 'A responsive web application',
              language: 'javascript',
              type: 'frontend',
              lastModified: new Date().toISOString(),
              isPlaceholder: true,
              tags: ['react', 'responsive', 'web']
            },
            { 
              id: `placeholder-${Date.now()}-2`, 
              name: 'API Service',
              description: 'RESTful API service',
              language: 'javascript',
              type: 'backend',
              lastModified: new Date(Date.now() - 86400000).toISOString(),
              isPlaceholder: true,
              tags: ['node', 'express', 'api']
            }
          ];
          setProjects(placeholderProjects);
          
          // Try to persist the placeholder projects for future use
          try {
            localStorage.setItem('cachedProjects', JSON.stringify(placeholderProjects));
          } catch (storageError) {
            console.warn('[ProjectContext] Failed to cache placeholder projects:', storageError);
          }
          
          return placeholderProjects;
        }
        
        throw apiError; // Re-throw if we couldn't recover
      }
    } catch (error) {
      console.error('[ProjectContext] Failed to load projects', error);
      setError(error);
      showErrorToast('Failed to load projects. Using cached data if available.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, showErrorToast, api.projects]);

  // Load a single project by ID
  const loadProject = useCallback(async (projectId) => {
    if (!projectId) {
      console.error('[ProjectContext] No project ID provided to loadProject');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to load from API first
      try {
        console.log(`[ProjectContext] Fetching project ${projectId} from API...`);
        const project = await api.projects.getProject(projectId);
        
        if (project) {
          console.log(`[ProjectContext] Successfully loaded project ${projectId} from API`);
          setCurrentProject(project);
          return project;
        }
      } catch (apiError) {
        console.warn(`[ProjectContext] Failed to load project ${projectId} from API`, apiError);
        // Continue to fallback methods
      }
      
      // Try to find in existing projects
      const existingProject = projects.find(p => p.id === projectId);
      if (existingProject) {
        console.log(`[ProjectContext] Found project ${projectId} in existing projects`);
        setCurrentProject(existingProject);
        return existingProject;
      }
      
      throw new Error(`Project ${projectId} not found`);
    } catch (error) {
      console.error(`[ProjectContext] Failed to load project ${projectId}`, error);
      setError(error);
      showErrorToast(`Failed to load project: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [projects, showErrorToast, api.projects]);

  // Create a new project
  const createProject = useCallback(async (projectData) => {
    if (!isAuthenticated) {
      showErrorToast('You must be logged in to create a project');
      navigate('/login');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('[ProjectContext] Creating new project...', projectData);
      const newProject = await api.projects.createProject(projectData);
      
      if (newProject) {
        console.log('[ProjectContext] Successfully created project', newProject);
        
        // Update local state
        setProjects(prevProjects => [...prevProjects, newProject]);
        setCurrentProject(newProject);
        
        // Update cache
        try {
          localStorage.setItem('projects', JSON.stringify([...projects, newProject]));
          localStorage.setItem('projects_last_fetch', Date.now().toString());
        } catch (storageError) {
          console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
        }
        
        showSuccessToast('Project created successfully');
        return newProject;
      }
      
      throw new Error('Failed to create project');
    } catch (error) {
      console.error('[ProjectContext] Failed to create project', error);
      setError(error);
      showErrorToast(`Failed to create project: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigate, projects, showErrorToast, showSuccessToast, api.projects]);

  // Update an existing project
  const updateProject = useCallback(async (projectId, updates) => {
    if (!isAuthenticated) {
      showErrorToast('You must be logged in to update a project');
      navigate('/login');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`[ProjectContext] Updating project ${projectId}...`, updates);
      const updatedProject = await api.projects.updateProject(projectId, updates);
      
      if (updatedProject) {
        console.log('[ProjectContext] Successfully updated project', updatedProject);
        
        // Update local state
        setProjects(prevProjects => 
          prevProjects.map(p => p.id === projectId ? updatedProject : p)
        );
        
        if (currentProject?.id === projectId) {
          setCurrentProject(updatedProject);
        }
        
        // Update cache
        try {
          const cachedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          const updatedProjects = cachedProjects.map(p => 
            p.id === projectId ? updatedProject : p
          );
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
          localStorage.setItem('projects_last_fetch', Date.now().toString());
        } catch (storageError) {
          console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
        }
        
        showSuccessToast('Project updated successfully');
        return updatedProject;
      }
      
      throw new Error('Failed to update project');
    } catch (error) {
      console.error(`[ProjectContext] Failed to update project ${projectId}`, error);
      setError(error);
      showErrorToast(`Failed to update project: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, isAuthenticated, navigate, showErrorToast, showSuccessToast, api.projects]);

  // Delete a project
  const deleteProject = useCallback(async (projectId) => {
    if (!isAuthenticated) {
      showErrorToast('You must be logged in to delete a project');
      navigate('/login');
      return false;
    }

    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`[ProjectContext] Deleting project ${projectId}...`);
      const success = await api.projects.deleteProject(projectId);
      
      if (success) {
        console.log(`[ProjectContext] Successfully deleted project ${projectId}`);
        
        // Update local state
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
        }
        
        // Update cache
        try {
          const cachedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          const updatedProjects = cachedProjects.filter(p => p.id !== projectId);
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
          localStorage.setItem('projects_last_fetch', Date.now().toString());
        } catch (storageError) {
          console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
        }
        
        showSuccessToast('Project deleted successfully');
        return true;
      }
      
      throw new Error('Failed to delete project');
    } catch (error) {
      console.error(`[ProjectContext] Failed to delete project ${projectId}`, error);
      setError(error);
      showErrorToast(`Failed to delete project: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, isAuthenticated, navigate, showErrorToast, showSuccessToast, api.projects]);

  // Load projects when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated, loadProjects]);

  // Context value
  const contextValue = {
    currentProject,
    projects,
    loading,
    error,
    showProjectTypeSelector,
    setShowProjectTypeSelector,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use the project context
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;
