import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import { useApi } from './NewApiContext';
import { useAuthContext } from '../hooks/useAuthContext';
import { debounce, throttle } from '../utils/debounce';

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
      console.log(`[ProjectContext] Starting storage cleanup, target: ${targetSizeMB}MB`);

      // Get current projects index
      let projectsIndex = [];
      try {
        const indexData = localStorage.getItem('projects_index');
        projectsIndex = indexData ? JSON.parse(indexData) : [];
      } catch (e) {
        console.warn('Failed to parse projects index, resetting...');
        localStorage.removeItem('projects_index');
      }

      if (!Array.isArray(projectsIndex) || projectsIndex.length === 0) {
        console.log('[ProjectContext] No projects to clean up');
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

      console.log(`[ProjectContext] Current storage: ${(storageUsage.used / (1024 * 1024)).toFixed(2)}MB / ${(storageUsage.max / (1024 * 1024)).toFixed(2)}MB`);

      // If we're already under the target, no need to clean up
      if (storageUsage.used < targetBytes) {
        console.log('[ProjectContext] Storage usage is within limits, no cleanup needed');
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
              console.log(`[ProjectContext] Removed project ${project.id} (${(project.size / 1024).toFixed(2)}KB)`);
            }
          } catch (e) {
            console.warn(`[ProjectContext] Failed to remove project ${project.id}:`, e);
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
          console.log(`[ProjectContext] Cleaned up ${projectsToRemove.length} projects, freed ${(bytesFreed / (1024 * 1024)).toFixed(2)}MB`);

          // Check if we're still over quota
          const newUsage = getStorageUsage();
          console.log(`[ProjectContext] New storage usage: ${(newUsage.used / (1024 * 1024)).toFixed(2)}MB / ${(newUsage.max / (1024 * 1024)).toFixed(2)}MB`);

          // If we're still over quota, try a more aggressive cleanup
          if (newUsage.percent > 90) {
            console.warn('[ProjectContext] Still over 90% quota, performing aggressive cleanup');

            // First, clear all non-essential keys
            const keysToKeep = ['auth_token', 'user_profile', 'projects_index'];
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
              if (!keysToKeep.includes(key) && !key.startsWith('p_')) {
                try {
                  localStorage.removeItem(key);
                  console.log(`[ProjectContext] Removed non-essential key: ${key}`);
                } catch (e) {
                  console.warn(`[ProjectContext] Failed to remove key ${key}:`, e);
                }
              }
            });

            // If still over quota, clear old projects
            const currentUsage = getStorageUsage();
            if (currentUsage.percent > 90) {
              console.warn('[ProjectContext] Still over 90%, clearing old projects');

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
                    console.warn(`[ProjectContext] Failed to process project ${project.id}:`, e);
                  }
                });
              } catch (e) {
                console.warn('[ProjectContext] Failed to parse projects index:', e);
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
                  console.warn(`[ProjectContext] Failed to remove project ${project.id}:`, e);
                }
              }

              console.log(`[ProjectContext] Removed ${removedCount} projects during cleanup`);

              // If still over quota after all that, clear everything except auth
              const finalUsage = getStorageUsage();
              if (finalUsage.percent > 90) {
                console.warn('[ProjectContext] Still over 90% after project cleanup, clearing all non-essential data');
                allKeys.forEach(key => {
                  if (!keysToKeep.includes(key)) {
                    try {
                      localStorage.removeItem(key);
                    } catch (e) {
                      console.warn(`[ProjectContext] Failed to remove key ${key}:`, e);
                    }
                  }
                });
              }
            }

            console.log('[ProjectContext] Aggressive cleanup completed');
          }
        } catch (e) {
          console.error('[ProjectContext] Failed to update projects index after cleanup:', e);
          // If we can't update the index, clear everything to avoid inconsistency
          localStorage.clear();
        }
      } else {
        console.log('[ProjectContext] No projects could be removed, clearing all storage');
        localStorage.clear();
      }
    } catch (e) {
      console.error('Fatal error during storage cleanup:', e);
      // Last resort: clear everything
      try {
        localStorage.clear();
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
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
          console.log(`[ProjectContext] Using cached projects (${projects.length} items, ${Math.round(cacheAge / 1000)}s old)`);
          return projects;
        }
      }
    } catch (e) {
      console.warn('[ProjectContext] Failed to load projects from cache:', e);
    }
    
    return null;
  }, []);

  // Implementation of loadProjects with retry logic
  const loadProjectsImpl = useCallback(async (retryCount = 0) => {
    try {
      console.log(`[ProjectContext] Loading projects (attempt ${retryCount + 1})...`);
      
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
        console.log('[ProjectContext] Not authenticated, loading from local storage only');
        
        try {
          // Try to load projects from localStorage directly
          const projectsIndex = localStorage.getItem('projects_index');
          if (projectsIndex) {
            const parsedIndex = JSON.parse(projectsIndex);
            if (Array.isArray(parsedIndex) && parsedIndex.length > 0) {
              console.log(`[ProjectContext] Found ${parsedIndex.length} projects in local storage index`);
              
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
                  console.warn(`[ProjectContext] Failed to load project ${projectInfo.id}:`, e);
                }
              }
              
              if (localProjects.length > 0) {
                console.log(`[ProjectContext] Loaded ${localProjects.length} projects from local storage`);
                setProjects(localProjects);
                setLoading(false);
                return localProjects;
              }
            }
          }
        } catch (e) {
          console.warn('[ProjectContext] Failed to load projects from local storage:', e);
        }
        
        setProjects([]);
        setLoading(false);
        return [];
      }
      
      const fetchedProjects = await api.projects.getProjects();
      
      if (Array.isArray(fetchedProjects)) {
        console.log(`[ProjectContext] Loaded ${fetchedProjects.length} projects`);
        
        // Update state
        setProjects(fetchedProjects);
        
        // Update cache
        try {
          localStorage.setItem('projects', JSON.stringify(fetchedProjects));
          localStorage.setItem('projects_last_fetch', Date.now().toString());
        } catch (storageError) {
          console.warn('[ProjectContext] Failed to cache projects in localStorage', storageError);
          // If we hit storage quota, clean up
          cleanupOldProjects(1); // More aggressive cleanup
        }
        
        return fetchedProjects;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('[ProjectContext] Failed to load projects:', error);
      
      // Only set error state on final retry
      if (retryCount >= 2) {
        setError(error);
        showErrorToast(`Failed to load projects: ${error.message}`);
        return [];
      }
      
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`[ProjectContext] Retrying in ${delay}ms...`);
      
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
        console.log('[ProjectContext] Not authenticated, trying local storage fallback');
        // Try to load projects from local storage
        const cachedProjects = loadProjectsFromStorage();
        if (cachedProjects && cachedProjects.length > 0) {
          console.log(`[ProjectContext] Loaded ${cachedProjects.length} projects from local storage`);
          setProjects(cachedProjects);
          return cachedProjects;
        }
        
        // If no cached projects, try direct localStorage access
        try {
          const projectsIndex = localStorage.getItem('projects_index');
          if (projectsIndex) {
            const parsedIndex = JSON.parse(projectsIndex);
            if (Array.isArray(parsedIndex) && parsedIndex.length > 0) {
              console.log(`[ProjectContext] Found ${parsedIndex.length} projects in local storage index`);
              
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
                  console.warn(`[ProjectContext] Failed to load project ${projectInfo.id}:`, e);
                }
              }
              
              if (localProjects.length > 0) {
                console.log(`[ProjectContext] Loaded ${localProjects.length} projects from local storage`);
                setProjects(localProjects);
                return localProjects;
              }
            }
          }
        } catch (e) {
          console.warn('[ProjectContext] Failed to load projects from local storage:', e);
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
    console.log('[ProjectContext] Authentication state changed, isAuthenticated:', isAuthenticated);
    // Always try to load projects, our loadProjects function now handles both authenticated and unauthenticated states
    loadProjects();
  }, [isAuthenticated, loadProjects]);

  // Load a single project
  const loadProject = useCallback(async (projectId) => {
    if (!isAuthenticated) {
      showErrorToast('You must be logged in to view this project');
      navigate('/login');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[ProjectContext] Loading project ${projectId}...`);
      const project = await api.projects.getProject(projectId);
      
      if (project) {
        console.log(`[ProjectContext] Successfully loaded project ${projectId}`);
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
          console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
          // If we hit storage quota, clean up
          cleanupOldProjects(1); // More aggressive cleanup
        }
        
        return project;
      }
      
      throw new Error('Project not found');
    } catch (error) {
      console.error(`[ProjectContext] Failed to load project ${projectId}`, error);
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
      
      console.log('[ProjectContext] Creating new project...');
      
      let newProject;
      
      if (useLocalFallback) {
        // Create a local project when not authenticated
        console.log('[ProjectContext] Using local fallback for project creation');
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
        console.log(`[ProjectContext] Successfully created project ${newProject.id}`);
        
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
          console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
          // If we hit storage quota, clean up
          cleanupOldProjects(1); // More aggressive cleanup
        }
        
        showSuccessToast('Project created successfully');
        return newProject;
      }
      
      throw new Error('Failed to create project');
    } catch (error) {
      console.error('[ProjectContext] Failed to create project', error);
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
      
      console.log(`[ProjectContext] Updating project ${projectId}...`);
      const updatedProject = await api.projects.updateProject(projectId, projectData);
      
      if (updatedProject) {
        console.log(`[ProjectContext] Successfully updated project ${projectId}`);
        
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
