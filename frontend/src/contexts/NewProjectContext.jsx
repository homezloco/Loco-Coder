import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import { useApi } from './NewApiContext';
import { useAuthContext } from '../hooks/useAuthContext';

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
          
          // Verify we actually freed up space
          const newUsage = getStorageUsage();
          console.log(`[ProjectContext] New storage usage: ${(newUsage.used / (1024 * 1024)).toFixed(2)}MB / ${(newUsage.max / (1024 * 1024)).toFixed(2)}MB`);
          
          // If we're still over quota, try a more aggressive cleanup
          if (newUsage.percent > 90) {
            console.warn('[ProjectContext] Still over 90% quota, performing aggressive cleanup');
            
            // First, clear all non-essential keys
            const keysToKeep = ['auth_token', 'session_id', 'user_preferences', 'projects_index'];
            const allKeys = Object.keys(localStorage);
            
            // Clear non-project data first
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
              const projectKeys = allKeys.filter(key => key.startsWith('p_'));
              const projectData = projectKeys.map(key => ({
                key,
                size: localStorage.getItem(key)?.length * 2 || 0, // Approx size in bytes
                lastAccessed: 0 // Will be updated from index if available
              }));
              
              // Try to get last accessed times from index
              try {
                const index = JSON.parse(localStorage.getItem('projects_index') || '[]');
                const indexMap = new Map(index.map(item => [item.id, item]));
                
                projectData.forEach(project => {
                  const projectId = project.key.replace('p_', '');
                  if (indexMap.has(projectId) && indexMap.get(projectId).lastAccessed) {
                    project.lastAccessed = new Date(indexMap.get(projectId).lastAccessed).getTime();
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
              
              // Remove projects until we're under target or can't remove any more
              let removedCount = 0;
              for (const project of projectData) {
                try {
                  localStorage.removeItem(project.key);
                  removedCount++;
                  console.log(`[ProjectContext] Removed project: ${project.key} (${(project.size/1024).toFixed(2)}KB)`);
                  
                  // Check if we're under quota
                  const updatedUsage = getStorageUsage();
                  if (updatedUsage.percent < 80) { // Leave 20% buffer
                    console.log(`[ProjectContext] Storage now at ${updatedUsage.percent.toFixed(2)}%, stopping cleanup`);
                    break;
                  }
                } catch (e) {
                  console.warn(`[ProjectContext] Failed to remove project ${project.key}:`, e);
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

  // Check if a project is too large for localStorage
  const isProjectTooLarge = useCallback((project) => {
    try {
      const projectSize = JSON.stringify(project).length * 2; // Approx size in bytes
      const maxSize = 5 * 1024 * 1024; // 5MB max per project
      return projectSize > maxSize;
    } catch (e) {
      console.warn('[ProjectContext] Error calculating project size:', e);
      return false;
    }
  }, []);

  // Save projects to localStorage efficiently with size limits and retries
  const saveProjectsToStorage = useCallback((projectsToSave, depth = 0) => {
    if (!Array.isArray(projectsToSave) || projectsToSave.length === 0) {
      console.log('[ProjectContext] No projects to save');
      return;
    }
    
    // Prevent infinite recursion
    if (depth > 2) {
      console.error('[ProjectContext] Max save retry depth reached, giving up');
      return;
    }
    
    // Sort projects by size (smallest first) to maximize success rate
    const sortedProjects = [...projectsToSave]
      .map(project => ({
        project,
        size: JSON.stringify(project).length
      }))
      .sort((a, b) => a.size - b.size);
    
    // Track which projects were saved successfully
    const savedProjects = [];
    const failedProjects = [];
    
    // Try to save each project
    for (const { project, size } of sortedProjects) {
      if (!project || !project.id) continue;
      
      // Skip projects that are too large
      if (isProjectTooLarge(project)) {
        console.warn(`[ProjectContext] Project ${project.id} is too large (${(size/1024/1024).toFixed(2)}MB), skipping save`);
        failedProjects.push(project.id);
        continue;
      }
      
      const projectKey = `p_${project.id}`;
      let projectData;
      
      try {
        projectData = JSON.stringify(project);
      } catch (e) {
        console.error(`[ProjectContext] Failed to stringify project ${project.id}:`, e);
        failedProjects.push(project.id);
        continue;
      }
      
      try {
        // Check if this would exceed quota
        const currentUsage = getStorageUsage();
        if (currentUsage.used + projectData.length > currentUsage.max * 0.9) { // Leave 10% buffer
          console.warn(`[ProjectContext] Project ${project.id} (${(size/1024).toFixed(2)}KB) would exceed 90% quota, cleaning up first`);
          cleanupOldProjects(1); // Try to get down to 1MB
        }
        
        // Save the project
        localStorage.setItem(projectKey, projectData);
        savedProjects.push({ ...project, size });
        
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn(`[ProjectContext] Quota exceeded saving project ${project.id}, cleaning up and retrying...`);
          
          // Try to free up space
          cleanupOldProjects(1); // Try to get down to 1MB
          
          // Try one more time after cleanup
          try {
            localStorage.setItem(projectKey, projectData);
            savedProjects.push({ ...project, size });
            console.log(`[ProjectContext] Successfully saved project ${project.id} after cleanup`);
          } catch (retryError) {
            console.error(`[ProjectContext] Still out of space after cleanup for project ${project.id}:`, retryError);
            failedProjects.push(project.id);
          }
        } else {
          console.error(`[ProjectContext] Error saving project ${project.id}:`, e);
          failedProjects.push(project.id);
        }
      }
    }
    
    // Update the projects index with successfully saved projects
    if (savedProjects.length > 0) {
      try {
        const now = new Date().toISOString();
        const projectsIndex = [];
        
        // Try to load existing index
        try {
          const existingIndex = localStorage.getItem('projects_index');
          if (existingIndex) {
            projectsIndex.push(...JSON.parse(existingIndex));
          }
        } catch (e) {
          console.warn('[ProjectContext] Failed to parse existing projects index, starting fresh');
        }
        
        // Create a map of existing projects for quick lookup
        const indexMap = new Map(projectsIndex.map(item => [item.id, item]));
        
        // Update with saved projects
        savedProjects.forEach(({ project, size }) => {
          if (!project || !project.id) return;
          
          indexMap.set(project.id, {
            id: project.id,
            name: project.name || 'Untitled Project',
            description: project.description || '',
            language: project.language || '',
            type: project.type || 'web',
            updatedAt: project.updatedAt || now,
            lastAccessed: now,
            fileCount: Array.isArray(project.files) ? project.files.length : 0,
            size: size || 0
          });
        });
        
        // Convert back to array, sort by last accessed, and limit to 100 entries
        const updatedIndex = Array.from(indexMap.values())
          .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
          .slice(0, 100);
        
        // Save the updated index
        localStorage.setItem('projects_index', JSON.stringify(updatedIndex));
        localStorage.setItem('projects_last_fetch', now);
        
        console.log(`[ProjectContext] Successfully updated index with ${savedProjects.length} projects`);
        
      } catch (e) {
        console.error('[ProjectContext] Failed to update projects index:', e);
        // If we can't update the index, it's better to clear it than have it be wrong
        try {
          localStorage.removeItem('projects_index');
        } catch (clearError) {
          console.error('[ProjectContext] Failed to clear corrupted projects index:', clearError);
        }
      }
    }
    
    // Log final storage status
    const usage = getStorageUsage();
    console.log(
      `[ProjectContext] Storage status: ${savedProjects.length} saved, ${failedProjects.length} failed, ` +
      `Usage: ${(usage.used / (1024 * 1024)).toFixed(2)}MB / ${(usage.max / (1024 * 1024)).toFixed(2)}MB`
    );
    
    // If we had failures, try again with just the failed projects
    if (failedProjects.length > 0 && depth < 2) {
      console.log(`[ProjectContext] Retrying ${failedProjects.length} failed saves`);
      const remainingProjects = projectsToSave.filter(p => p && failedProjects.includes(p.id));
      return saveProjectsToStorage(remainingProjects, depth + 1);
    }
    
    return {
      saved: savedProjects.length,
      failed: failedProjects.length,
      savedIds: savedProjects.map(p => p.id),
      failedIds: [...failedProjects]
    };
    
  }, [cleanupOldProjects, getStorageUsage]);
  
  // Load projects from localStorage
  const loadProjectsFromStorage = useCallback(() => {
    try {
      const projectsIndex = JSON.parse(localStorage.getItem('projects_index') || '[]');
      if (!Array.isArray(projectsIndex) || projectsIndex.length === 0) {
        return [];
      }
      
      const loadedProjects = [];
      const now = new Date().toISOString();
      const updatedIndex = [];
      
      // Load each project from its individual key
      for (const projectMeta of projectsIndex) {
        try {
          const projectData = localStorage.getItem(`p_${projectMeta.id}`);
          if (projectData) {
            const project = JSON.parse(projectData);
            loadedProjects.push(project);
            
            // Update lastAccessed time in index
            updatedIndex.push({
              ...projectMeta,
              lastAccessed: now
            });
          }
        } catch (e) {
          console.warn(`Error loading project ${projectMeta.id} from localStorage:`, e);
        }
      }
      
      // Update the index with new access times
      if (updatedIndex.length > 0) {
        try {
          localStorage.setItem('projects_index', JSON.stringify(updatedIndex));
        } catch (e) {
          console.warn('Failed to update projects index:', e);
        }
      }
      
      console.log(`[ProjectContext] Loaded ${loadedProjects.length} projects from localStorage`);
      return loadedProjects;
      
    } catch (e) {
      console.error('Error loading projects from localStorage:', e);
      return [];
    }
  }, []);

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
          
          // Update localStorage as cache using efficient storage
          try {
            saveProjectsToStorage(data);
            return data;
          } catch (storageError) {
            console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
            // Continue execution even if storage fails
          }
        }
      } catch (apiError) {
        console.warn('[ProjectContext] API fetch failed, trying fallbacks...', apiError);
        
        // Try to load from localStorage if API fails
        try {
          const loadedProjects = loadProjectsFromStorage();
          if (loadedProjects.length > 0) {
            console.log(`[ProjectContext] Loaded ${loadedProjects.length} projects from localStorage cache`);
            setProjects(loadedProjects);
            return loadedProjects;
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
            saveProjectsToStorage(placeholderProjects);
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

  // Load projects from the API with retry logic
  const loadProjectsRetry = useCallback(async (retryCount = 0) => {
    if (!isAuthenticated || !token) {
      console.log('[ProjectContext] User not authenticated, skipping project load');
      setProjects([]);
      return;
    }

    // Don't show loading state for retries to prevent UI flickering
    if (retryCount === 0) {
      setLoading(true);
    }
    
    setError(null);

    try {
      console.log(`[ProjectContext] Loading projects from API (attempt ${retryCount + 1})...`);
      
      // Add a small delay before retrying to avoid overwhelming the server
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.min(retryCount, 3)));
      }
      
      const projectsData = await api.projects.getProjects({
        timeout: 10000, // 10 second timeout
        signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : null // Fallback for older browsers
      });
      
      if (!Array.isArray(projectsData)) {
        throw new Error('Invalid projects data received from server');
      }
      
      setProjects(projectsData);
      console.log(`[ProjectContext] Successfully loaded ${projectsData.length} projects`);
      
      // Clear any previous errors on success
      if (error) {
        setError(null);
      }
    } catch (err) {
      console.error(`[ProjectContext] Error loading projects (attempt ${retryCount + 1}):`, err);
      
      // Auto-retry for network errors or server timeouts
      if (retryCount < 2 && (err.name === 'TypeError' || err.name === 'AbortError' || 
          (err.response && err.response.status >= 500))) {
        console.log(`[ProjectContext] Retrying project load (attempt ${retryCount + 2})...`);
        return loadProjectsRetry(retryCount + 1);
      }
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load projects';
      setError(errorMessage);
      
      // Only show error toast for the final attempt
      if (retryCount >= 2) {
        showErrorToast(errorMessage);
      }
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        console.log('[ProjectContext] Unauthorized, redirecting to login...');
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [api.projects, isAuthenticated, token, error, showErrorToast, navigate]);

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
  }, [isAuthenticated, navigate, projects, showErrorToast, showSuccessToast, api.projects]);

  // Create a new project with robust error handling and validation
  const createProject = useCallback(async (projectData, options = {}) => {
    // Validate input
    if (!isAuthenticated || !token) {
      const errorMsg = 'You must be logged in to create a project';
      console.error('[ProjectContext] ' + errorMsg);
      showErrorToast(errorMsg);
      navigate('/login', { state: { from: window.location.pathname } });
      throw new Error(errorMsg);
    }

    if (!projectData?.name?.trim()) {
      const errorMsg = 'Project name is required';
      console.error('[ProjectContext] ' + errorMsg);
      showErrorToast(errorMsg);
      throw new Error(errorMsg);
    }

    const { retryCount = 0, maxRetries = 2 } = options;
    const projectName = projectData.name.trim();
    
    // Don't show loading state for retries to prevent UI flickering
    if (retryCount === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log(`[ProjectContext] Creating new project (attempt ${retryCount + 1}/${maxRetries + 1})...`, { name: projectName });
      
      // Add a small delay before retrying to avoid overwhelming the server
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.min(retryCount, 3)));
      }
      
      // Create the project via API
      const newProject = await api.projects.createProject({
        ...projectData,
        name: projectName,
        // Ensure we have required fields with defaults
        description: projectData.description?.trim() || '',
        settings: projectData.settings || {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(projectData.metadata || {})
        }
      });
      
      if (!newProject?.id) {
        throw new Error('Invalid project data received from server');
      }
      
      console.log('[ProjectContext] Successfully created project', newProject.id, newProject.name);
      
      // Update local state
      setProjects(prevProjects => [...prevProjects, newProject]);
      setCurrentProject(newProject);
      
      // Update cache
      try {
        const cachedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        localStorage.setItem('projects', JSON.stringify([...cachedProjects, newProject]));
        localStorage.setItem('projects_last_fetch', Date.now().toString());
      } catch (storageError) {
        console.warn('[ProjectContext] Failed to update localStorage cache', storageError);
      }
      
      showSuccessToast(`Project "${projectName}" created successfully`);
      return newProject;
      
    } catch (error) {
      console.error(`[ProjectContext] Failed to create project (attempt ${retryCount + 1})`, error);
      
      // Auto-retry for network errors or server timeouts
      if (retryCount < maxRetries && (error.name === 'TypeError' || error.name === 'AbortError' || 
          (error.response && error.response.status >= 500))) {
        console.log(`[ProjectContext] Retrying project creation (attempt ${retryCount + 2})...`);
        return createProject(projectData, { ...options, retryCount: retryCount + 1 });
      }
      
      // Handle specific error cases
      let errorMessage = 'Failed to create project';
      if (error.response) {
        // Server responded with an error status code
        errorMessage = error.response.data?.message || 
          `Server error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        // Something happened in setting up the request
        errorMessage = error.message;
      }
      
      setError({ ...error, message: errorMessage });
      showErrorToast(errorMessage);
      throw error;
      
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, token, navigate, showErrorToast, showSuccessToast, api.projects]);

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
