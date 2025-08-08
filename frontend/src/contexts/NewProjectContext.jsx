import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import { useApi } from './NewApiContext';
import { useAuthContext } from '../hooks/useAuthContext';
import { debounce, throttle } from '../utils/debounce';
import logger from '../utils/logger';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProjectTypeSelector, setShowProjectTypeSelector] = useState(true);
  const { showErrorToast, showSuccessToast } = useFeedback();
  
  // Use the new auth context hook
  const { isAuthenticated, token } = useAuthContext();
  const api = useApi();
  const navigate = useNavigate();
  const log = logger.ns('project');

  // Get the current storage quota usage
  const getStorageUsage = useCallback(() => {
    try {
      const total = JSON.stringify(localStorage).length;
      const max = 5 * 1024 * 1024; // 5MB typical limit
      return { used: total, max, percent: (total / max) * 100 };
    } catch (e) {
      console.warn('Could not calculate storage usage:', e);
      return { used: 0, max: 0, percent: 0 };
    }
  }, []);

  // Clean up old projects to free up space
  const cleanupOldProjects = useCallback((targetSizeMB = 0.5) => { // More aggressive default target
    try {
      log.groupCollapsed('Storage cleanup', { targetSizeMB });
      log.info(`Starting storage cleanup, target: ${targetSizeMB}MB`);

      // Get current projects index
      let projectsIndex = [];
      try {
        const indexData = localStorage.getItem('projects_index');
        projectsIndex = indexData ? JSON.parse(indexData) : [];
      } catch (e) {
        log.warn('Failed to parse projects index, resetting...', e);
        localStorage.removeItem('projects_index');
      }

      if (!Array.isArray(projectsIndex) || projectsIndex.length === 0) {
        log.info('No projects to clean up');
        return;
      }

      // Sort by last accessed (oldest first) and size (largest first)
      const sortedIndex = [...projectsIndex].sort((a, b) => {
        // First sort by last accessed (oldest first)
        const dateDiff = new Date(a.lastAccessed || 0) - new Date(b.lastAccessed || 0);
        if (dateDiff !== 0) return dateDiff;
        // Then by size (largest first)
        return (b.size || 0) - (a.size || 0);
      });

      // Calculate current storage usage
      const storageUsage = getStorageUsage();
      const targetBytes = targetSizeMB * 1024 * 1024;

      log.info(`Current storage: ${(storageUsage.used / (1024 * 1024)).toFixed(2)}MB / ${(storageUsage.max / (1024 * 1024)).toFixed(2)}MB`);

      // If we're already under the target, no need to clean up
      if (storageUsage.used < targetBytes) {
        log.info('Storage usage is within limits, no cleanup needed');
        return;
      }

      // Start removing projects until we're under the target
      let bytesFreed = 0;
      const bytesToFree = storageUsage.used - targetBytes;
      const projectsToKeep = [];
      const projectsToRemove = [];

      // Process projects from oldest/most expendable to newest
      for (const project of sortedIndex) {
        if (bytesFreed < bytesToFree) {
          // Try to remove this project
          try {
            const projectKey = `p_${project.id}`;
            const projectData = localStorage.getItem(projectKey);
            if (projectData) {
              localStorage.removeItem(projectKey);
              bytesFreed += projectData.length * 2; // Approximate size in bytes (2 bytes per char)
              projectsToRemove.push(project.id);
              log.info(`Removed project ${project.id} (${(project.size / 1024).toFixed(2)}KB)`);
            }
          } catch (e) {
            log.warn(`Failed to remove project ${project.id}:`, e);
          }
        } else {
          projectsToKeep.push(project);
        }
      }

      // Update the index with remaining projects
      if (projectsToRemove.length > 0) {
        const newIndex = projectsToKeep.sort((a, b) =>
          new Date(b.lastAccessed) - new Date(a.lastAccessed)
        );

        try {
          localStorage.setItem('projects_index', JSON.stringify(newIndex));
          log.info(`Cleaned up ${projectsToRemove.length} projects, freed ${(bytesFreed / (1024 * 1024)).toFixed(2)}MB`);

          // Check if we're still over quota
          const newUsage = getStorageUsage();
          log.info(`New storage usage: ${(newUsage.used / (1024 * 1024)).toFixed(2)}MB / ${(newUsage.max / (1024 * 1024)).toFixed(2)}MB`);

          // If we're still over quota, try a more aggressive cleanup
          if (newUsage.percent > 90) {
            log.warn('Still over 90% quota, performing aggressive cleanup');

            // First, clear all non-essential keys
            const keysToKeep = ['auth_token', 'user_profile', 'projects_index'];
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
              if (!keysToKeep.includes(key) && !key.startsWith('p_')) {
                try {
                  localStorage.removeItem(key);
                  log.info(`Removed non-essential key: ${key}`);
                } catch (e) {
                  log.warn(`Failed to remove key ${key}:`, e);
                }
              }
            });

            // If still over quota, clear old projects
            const currentUsage = getStorageUsage();
            if (currentUsage.percent > 90) {
              log.warn('Still over 90%, clearing old projects');

              // Get all project keys and sort by last accessed (oldest first)
              const projectData = [];
              
              try {
                const projectsIndex = JSON.parse(localStorage.getItem('projects_index') || '[]');
                
                projectsIndex.forEach(project => {
                  try {
                    const projectKey = `p_${project.id}`;
                    const data = localStorage.getItem(projectKey);
                    if (data) {
                      projectData.push({
                        id: project.id,
                        key: projectKey,
                        lastAccessed: project.lastAccessed || 0,
                        size: data.length * 2
                      });
                    }
                  } catch (e) {
                    log.warn(`Failed to process project ${project.id}:`, e);
                  }
                });
              } catch (e) {
                log.warn('Failed to parse projects index:', e);
              }

              // Sort by last accessed (oldest first), then by size (largest first)
              projectData.sort((a, b) => {
                if (a.lastAccessed !== b.lastAccessed) {
                  return a.lastAccessed - b.lastAccessed;
                }
                return b.size - a.size;
              });

              // Remove projects until we're under 80% quota
              let removedCount = 0;
              for (const project of projectData) {
                try {
                  localStorage.removeItem(project.key);
                  removedCount++;
                  
                  // Check if we're under quota yet
                  const usage = getStorageUsage();
                  if (usage.percent < 80) {
                    break;
                  }
                } catch (e) {
                  log.warn(`Failed to remove project ${project.id}:`, e);
                }
              }

              log.info(`Removed ${removedCount} projects during cleanup`);

              // If still over quota after all that, clear everything except auth
              const finalUsage = getStorageUsage();
              if (finalUsage.percent > 90) {
                log.warn('Still over 90% after project cleanup, clearing all non-essential data');
                allKeys.forEach(key => {
                  if (!keysToKeep.includes(key)) {
                    try {
                      localStorage.removeItem(key);
                    } catch (e) {
                      log.warn(`Failed to remove key ${key}:`, e);
                    }
                  }
                });
              }
            }

            log.info('Aggressive cleanup completed');
          }
        } catch (e) {
          log.error('Failed to update projects index after cleanup:', e);
          // If we can't update the index, clear everything to avoid inconsistency
          localStorage.clear();
        }
      } else {
        log.info('No projects could be removed, clearing all storage');
        localStorage.clear();
      }
    } catch (e) {
      log.error('Fatal error during storage cleanup:', e);
      // Last resort: clear everything
      try {
        localStorage.clear();
      } catch (clearError) {
        log.error('Failed to clear localStorage:', clearError);
      }
    } finally {
      log.groupEnd();
    }
  }, [getStorageUsage]);

  // Load projects from localStorage cache
  const loadProjectsFromStorage = useCallback(() => {
    try {
      const cachedProjects = localStorage.getItem('projects');
      const lastFetch = localStorage.getItem('projects_last_fetch');
      
      if (cachedProjects && lastFetch) {
        const projects = JSON.parse(cachedProjects);
        const fetchTime = parseInt(lastFetch, 10);
        const now = Date.now();
        const cacheAge = now - fetchTime;
        
        // Use cache if it's less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000 && Array.isArray(projects)) {
          log.debug(`Using cached projects (${projects.length} items, ${Math.round(cacheAge / 1000)}s old)`);
          return projects;
        }
      }
    } catch (e) {
      log.warn('Failed to load projects from cache:', e);
    }
    
    return null;
  }, []);

  // Implementation of loadProjects with retry logic
  const loadProjectsImpl = useCallback(async (retryCount = 0) => {
    try {
      log.info(`Loading projects (attempt ${retryCount + 1})...`);
      
      // Check cache first
      if (retryCount === 0) {
        const cachedProjects = loadProjectsFromStorage();
        if (cachedProjects) {
          setProjects(cachedProjects);
          setLoading(false);
          return cachedProjects;
        }
      }
      
      // If not authenticated, try to load from local storage directly
      if (!isAuthenticated) {
        log.info('Not authenticated, loading from local storage only');
        
        try {
          // Try to load projects from localStorage directly
          const projectsIndex = localStorage.getItem('projects_index');
          if (projectsIndex) {
            const parsedIndex = JSON.parse(projectsIndex);
            if (Array.isArray(parsedIndex) && parsedIndex.length > 0) {
              log.debug(`Found ${parsedIndex.length} projects in local storage index`);
              
              // Load each project from localStorage
              const localProjects = [];
              for (const projectInfo of parsedIndex) {
                try {
                  const projectKey = `p_${projectInfo.id}`;
                  const projectData = localStorage.getItem(projectKey);
                  if (projectData) {
                    const project = JSON.parse(projectData);
                    localProjects.push(project);
                  }
                } catch (e) {
                  log.warn(`Failed to load project ${projectInfo.id}:`, e);
                }
              }
              
              if (localProjects.length > 0) {
                log.info(`Loaded ${localProjects.length} projects from local storage`);
                setProjects(localProjects);
                setLoading(false);
                return localProjects;
              }
            }
          }
        } catch (e) {
          log.warn('Failed to load projects from local storage:', e);
        }
        
        setProjects([]);
        setLoading(false);
        return [];
      }
      
      const fetchedProjects = await api.projects.getProjects();
      
      if (Array.isArray(fetchedProjects)) {
        log.info(`Loaded ${fetchedProjects.length} projects`);
        
        // Update state
        setProjects(fetchedProjects);
        
        // Update cache
        try {
          localStorage.setItem('projects', JSON.stringify(fetchedProjects));
          localStorage.setItem('projects_last_fetch', Date.now().toString());
        } catch (storageError) {
          log.warn('Failed to cache projects in localStorage', storageError);
          // If we hit storage quota, clean up
          cleanupOldProjects(1); // More aggressive cleanup
        }
        
        return fetchedProjects;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      log.error('Failed to load projects:', error);
      
      // Only set error state on final retry
      if (retryCount >= 2) {
        setError(error);
        showErrorToast(`Failed to load projects: ${error.message}`);
        return [];
      }
      
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      log.info(`Retrying in ${delay}ms...`);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(loadProjectsImpl(retryCount + 1));
        }, delay);
      });
    }
  }, [api.projects, cleanupOldProjects, isAuthenticated, loadProjectsFromStorage, showErrorToast]);

  // Retry wrapper with raw error handling
  const loadProjectsRetryRaw = useCallback(async () => {
    try {
      return await loadProjectsImpl();
    } catch (e) {
      console.error('[ProjectContext] All retries failed:', e);
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [loadProjectsImpl]);

  // Public loadProjects function (throttled)
  const loadProjects = useCallback(
    throttle(async () => {
      if (!isAuthenticated) {
        log.info('Not authenticated, trying local storage fallback');
        // Try to load projects from local storage
        const cachedProjects = loadProjectsFromStorage();
        if (cachedProjects && cachedProjects.length > 0) {
          log.info(`Loaded ${cachedProjects.length} projects from local storage`);
          setProjects(cachedProjects);
          return cachedProjects;
        }
        
        // If no cached projects, try direct localStorage access
        try {
          const projectsIndex = localStorage.getItem('projects_index');
          if (projectsIndex) {
            const parsedIndex = JSON.parse(projectsIndex);
            if (Array.isArray(parsedIndex) && parsedIndex.length > 0) {
              log.debug(`Found ${parsedIndex.length} projects in local storage index`);
              
              // Load each project from localStorage
              const localProjects = [];
              for (const projectInfo of parsedIndex) {
                try {
                  const projectKey = `p_${projectInfo.id}`;
                  const projectData = localStorage.getItem(projectKey);
                  if (projectData) {
                    const project = JSON.parse(projectData);
                    localProjects.push(project);
                  }
                } catch (e) {
                  log.warn(`Failed to load project ${projectInfo.id}:`, e);
                }
              }
              
              if (localProjects.length > 0) {
                log.info(`Loaded ${localProjects.length} projects from local storage`);
                setProjects(localProjects);
                return localProjects;
              }
            }
          }
        } catch (e) {
          log.warn('Failed to load projects from local storage:', e);
        }
        
        return [];
      }
      
      setLoading(true);
      setError(null);
      
      return loadProjectsRetryRaw();
    }, 2000),
    [isAuthenticated, loadProjectsRetryRaw, loadProjectsFromStorage]
  );

  // Add effect to load projects when authentication state changes
  useEffect(() => {
    log.debug('Auth state changed, isAuthenticated:', isAuthenticated);
    // Always try to load projects, our loadProjects function now handles both authenticated and unauthenticated states
    loadProjects();
  }, [isAuthenticated, loadProjects]);

  // Load a single project
  const loadProject = useCallback(async (projectId) => {
    if (!isAuthenticated) {
      // Offline/unauthenticated fallback: load from localStorage
      try {
        log.info('Unauthenticated: attempting local load for project', projectId);
        const local = localStorage.getItem(`p_${projectId}`);
        if (local) {
          const project = JSON.parse(local);
          setCurrentProject(project);
          // Ensure it's present in projects list as well
          setProjects((prev) => {
            const exists = prev.some((p) => p.id === projectId);
            return exists ? prev : [project, ...prev];
          });
          try {
            // Update last accessed in index
            const index = JSON.parse(localStorage.getItem('projects_index') || '[]');
            const now = new Date().toISOString();
            const updatedIndex = Array.isArray(index)
              ? index.map((p) => (p.id === projectId ? { ...p, lastAccessed: now } : p))
              : [];
            localStorage.setItem('projects_index', JSON.stringify(updatedIndex));
          } catch (e) {
            log.warn('Failed to update projects_index lastAccessed', e);
          }
          showSuccessToast('Opened local project');
          return project;
        }
        showErrorToast('Project not found locally');
        return null;
      } catch (e) {
        log.warn('Local project load failed', e);
        showErrorToast('Failed to open local project');
        return null;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      log.info(`Loading project ${projectId}...`);
      const project = await api.projects.getProject(projectId);
      
      if (project) {
        log.info(`Successfully loaded project ${projectId}`);
        setCurrentProject(project);
        
        // Update cache
        try {
          // Update the project in the projects list
          const cachedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          const updatedProjects = cachedProjects.map(p => 
            p.id === projectId ? project : p
          );
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
          
          // Cache the individual project
          localStorage.setItem(`p_${projectId}`, JSON.stringify(project));
          
          // Update the projects index
          const projectsIndex = JSON.parse(localStorage.getItem('projects_index') || '[]');
          const existingIndex = projectsIndex.findIndex(p => p.id === projectId);
          
          if (existingIndex >= 0) {
            projectsIndex[existingIndex] = {
              ...projectsIndex[existingIndex],
              lastAccessed: Date.now(),
              size: JSON.stringify(project).length
            };
          } else {
            projectsIndex.push({
              id: projectId,
              lastAccessed: Date.now(),
              size: JSON.stringify(project).length
            });
          }
          
          localStorage.setItem('projects_index', JSON.stringify(projectsIndex));
        } catch (storageError) {
          log.warn('Failed to update localStorage cache', storageError);
          // If we hit storage quota, clean up
          cleanupOldProjects(1); // More aggressive cleanup
        }
        
        return project;
      }
      
      throw new Error('Project not found');
    } catch (error) {
      log.error(`Failed to load project ${projectId}`, error);
      setError(error);
      showErrorToast(`Failed to load project: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api.projects, cleanupOldProjects, isAuthenticated, navigate, showErrorToast]);

  // Create a new project
  const createProject = useCallback(async (projectData) => {
    // Allow project creation even when not authenticated, using local storage as fallback
    const useLocalFallback = !isAuthenticated;
    
    try {
      setLoading(true);
      setError(null);
      
      log.info('Creating new project...');
      
      let newProject;
      
      if (useLocalFallback) {
        // Create a local project when not authenticated
        log.info('Using local fallback for project creation');
        newProject = {
          ...projectData,
          id: `local_${Date.now()}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          isLocal: true
        };
      } else {
        // Use API when authenticated
        newProject = await api.projects.createProject(projectData);
      }
      
      if (newProject) {
        log.info(`Successfully created project ${newProject.id}`);
        
        // Update local state
        setProjects(prevProjects => [...prevProjects, newProject]);
        setCurrentProject(newProject);
        
        // Update cache
        try {
          const cachedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          cachedProjects.push(newProject);
          localStorage.setItem('projects', JSON.stringify(cachedProjects));
          localStorage.setItem('projects_last_fetch', Date.now().toString());
          
          // Cache the individual project
          localStorage.setItem(`p_${newProject.id}`, JSON.stringify(newProject));
          
          // Update the projects index
          const projectsIndex = JSON.parse(localStorage.getItem('projects_index') || '[]');
          projectsIndex.push({
            id: newProject.id,
            lastAccessed: Date.now(),
            size: JSON.stringify(newProject).length
          });
          localStorage.setItem('projects_index', JSON.stringify(projectsIndex));
        } catch (storageError) {
          log.warn('Failed to update localStorage cache', storageError);
          // If we hit storage quota, clean up
          cleanupOldProjects(1); // More aggressive cleanup
        }
        
        showSuccessToast('Project created successfully');
        return newProject;
      }
      
      throw new Error('Failed to create project');
    } catch (error) {
      log.error('Failed to create project', error);
      setError(error);
      showErrorToast(`Failed to create project: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api.projects, cleanupOldProjects, isAuthenticated, navigate, showErrorToast, showSuccessToast]);

  // Update a project
  const updateProject = useCallback(async (projectId, projectData) => {
    if (!isAuthenticated) {
      showErrorToast('You must be logged in to update a project');
      navigate('/login');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      log.info(`Updating project ${projectId}...`);
      const updatedProject = await api.projects.updateProject(projectId, projectData);
      
      if (updatedProject) {
        log.info(`Successfully updated project ${projectId}`);
        
        // Update local state
        setProjects(prevProjects => prevProjects.map(p => 
          p.id === projectId ? updatedProject : p
        ));
        
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
          log.warn('Failed to update localStorage cache', storageError);
        }
        
        showSuccessToast('Project updated successfully');
        return updatedProject;
      }
      
      throw new Error('Failed to update project');
    } catch (error) {
      log.error(`Failed to update project ${projectId}`, error);
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
      
      log.info(`Deleting project ${projectId}...`);
      const success = await api.projects.deleteProject(projectId);
      
      if (success) {
        log.info(`Successfully deleted project ${projectId}`);
        
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
          log.warn('Failed to update localStorage cache', storageError);
        }
        
        showSuccessToast('Project deleted successfully');
        return true;
      }
      
      throw new Error('Failed to delete project');
    } catch (error) {
      log.error(`Failed to delete project ${projectId}`, error);
      setError(error);
      showErrorToast(`Failed to delete project: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, isAuthenticated, navigate, showErrorToast, showSuccessToast, api.projects]);

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
