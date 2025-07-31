import { ENDPOINTS } from '../config';
import { get, post, put, del, fetchWithTimeout } from '../utils/fetch';
import { withCache } from '../utils/cache';
import { handleApiError } from '../utils/errors';

/**
 * Fetches all projects with caching and fallback support
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Array>} List of projects
 */
export const getProjects = async (options = {}) => {
  try {
    const { forceRefresh = false, ...fetchOptions } = options;
    
    // Cache key for this request
    const cacheKey = `projects:all`;
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log('[API] Using cached projects data');
        return cached;
      }
    }
    
    // Fetch from API
    const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
      method: 'GET',
      ...fetchOptions,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const projects = await response.json();
    const result = Array.isArray(projects) ? projects : [];
    
    // Cache the result
    setInCache(cacheKey, result);
    
    return result;
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    
    // Try to return from cache even if there's an error
    const cached = getFromCache('projects:all');
    if (cached) {
      console.warn('Using cached projects due to error:', error.message);
      return cached;
    }
    
    throw error;
  }
};

/**
 * Fetches a single project by ID
 * @param {string} projectId - The ID of the project to fetch
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The project data
 */
export const getProject = async (projectId, options = {}) => {
  try {
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    const cacheKey = `project:${projectId}`;
    
    // Return cached data if available
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BY_ID(projectId), {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const project = await response.json();
    
    // Cache the result
    setInCache(cacheKey, project);
    
    return project;
    
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Creates a new project
 * @param {Object} projectData - The project data
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The created project
 */
export const createProject = async (projectData, options = {}) => {
  try {
    if (!projectData || !projectData.name) {
      throw new BadRequestError('Project name is required');
    }
    
    const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const newProject = await response.json();
    
    // Invalidate the projects cache
    removeFromCache('projects:all');
    
    return newProject;
    
  } catch (error) {
    console.error('Error creating project:', error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Updates an existing project
 * @param {string} projectId - The ID of the project to update
 * @param {Object} updates - The updates to apply
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The updated project
 */
export const updateProject = async (projectId, updates, options = {}) => {
  try {
    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new BadRequestError('No updates provided');
    }
    
    const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BY_ID(projectId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const updatedProject = await response.json();
    
    // Invalidate caches
    removeFromCache('projects:all');
    removeFromCache(`project:${projectId}`);
    
    return updatedProject;
    
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Deletes a project
 * @param {string} projectId - The ID of the project to delete
 * @param {Object} [options] - Fetch options
 * @returns {Promise<boolean>} True if the project was deleted
 */
export const deleteProject = async (projectId, options = {}) => {
  try {
    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }
    
    const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BY_ID(projectId), {
      method: 'DELETE',
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    // Invalidate caches
    removeFromCache('projects:all');
    removeFromCache(`project:${projectId}`);
    
    return true;
    
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Gets files for a project
 * @param {string} projectId - The ID of the project
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Array>} List of files in the project
 */
export const getProjectFiles = async (projectId, options = {}) => {
  try {
    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }
    
    const cacheKey = `project:${projectId}:files`;
    
    // Return cached data if available
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.FILES(projectId), {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const files = await response.json();
    const result = Array.isArray(files) ? files : [];
    
    // Cache the result
    setInCache(cacheKey, result);
    
    return result;
    
  } catch (error) {
    console.error(`Error fetching files for project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

// Export all project-related functions
export default {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectFiles,
};
