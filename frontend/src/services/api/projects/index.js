import { ENDPOINTS } from '../config';
import { get, post, put, del, fetchWithTimeout } from '../utils/fetch';
import { handleApiError, createErrorFromResponse, BadRequestError } from '../utils/errors';

// Cache utilities
const CACHE_PREFIX = 'projects:';

/**
 * Service class for handling project-related API operations
 */
class ProjectService {
  constructor() {
    // Bind all methods to ensure proper 'this' context
    this.getProjects = this.getProjects.bind(this);
    this.getProject = this.getProject.bind(this);
    this.createProject = this.createProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.getProjectFiles = this.getProjectFiles.bind(this);
  }

  /**
   * Gets an item from the cache
   * @private
   * @param {string} key - The cache key
   * @returns {any} The cached item or null if not found
   */
  _getFromCache(key) {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Sets an item in the cache
   * @private
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   */
  _setInCache(key, value) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  /**
   * Removes an item from the cache
   * @private
   * @param {string} key - The cache key to remove
   */
  _removeFromCache(key) {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }

  /**
   * Fetches all projects with caching and fallback support
   * @param {Object} [options] - Fetch options
   * @param {boolean} [options.forceRefresh=false] - Whether to force a refresh from the API
   * @returns {Promise<Array>} List of projects
   */
  async getProjects(options = {}) {
    try {
      const { forceRefresh = false, ...fetchOptions } = options;
      const cacheKey = 'all';
      
      // Return cached data if available and not forcing refresh
      if (!forceRefresh) {
        const cached = this._getFromCache(cacheKey);
        if (cached) {
          console.log('[ProjectService] Using cached projects data');
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
      this._setInCache(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('[ProjectService] Error fetching projects:', error);
      
      // Try to return from cache even if there's an error
      const cached = this._getFromCache('all');
      if (cached) {
        console.warn('[ProjectService] Using cached projects due to error:', error.message);
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Fetches a single project by ID
   * @param {string} projectId - The ID of the project to fetch
   * @param {Object} [options] - Fetch options
   * @param {boolean} [options.forceRefresh=false] - Whether to force a refresh from the API
   * @returns {Promise<Object>} The project data
   */
  async getProject(projectId, options = {}) {
    try {
      if (!projectId) {
        throw new BadRequestError('Project ID is required');
      }
      
      const { forceRefresh = false, ...fetchOptions } = options;
      const cacheKey = `project:${projectId}`;
      
      // Return cached data if available and not forcing refresh
      if (!forceRefresh) {
        const cached = this._getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }
      
      // Fetch from API
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.BY_ID(projectId),
        { method: 'GET', ...fetchOptions }
      );
      
      if (!response.ok) {
        throw await createErrorFromResponse(response);
      }
      
      const project = await response.json();
      
      // Cache the result
      this._setInCache(cacheKey, project);
      
      return project;
      
    } catch (error) {
      console.error(`[ProjectService] Error fetching project ${projectId}:`, error);
      handleApiError(error, { rethrow: true });
    }
  }

  /**
   * Creates a new project
   * @param {Object} projectData - The project data
   * @param {string} projectData.name - The name of the project (required)
   * @param {Object} [options] - Fetch options
   * @returns {Promise<Object>} The created project
   */
  async createProject(projectData, options = {}) {
    try {
      if (!projectData || !projectData.name) {
        throw new BadRequestError('Project name is required');
      }
      
      const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: JSON.stringify(projectData),
        ...options
      });
      
      if (!response.ok) {
        throw await createErrorFromResponse(response);
      }
      
      const newProject = await response.json();
      
      // Invalidate the projects cache
      this._removeFromCache('all');
      
      return newProject;
      
    } catch (error) {
      console.error('[ProjectService] Error creating project:', error);
      handleApiError(error, { rethrow: true });
    }
  }

  /**
   * Updates an existing project
   * @param {string} projectId - The ID of the project to update
   * @param {Object} updates - The updates to apply
   * @param {Object} [options] - Fetch options
   * @returns {Promise<Object>} The updated project
   */
  async updateProject(projectId, updates, options = {}) {
    try {
      if (!projectId) {
        throw new BadRequestError('Project ID is required');
      }
      
      if (!updates || Object.keys(updates).length === 0) {
        throw new BadRequestError('No updates provided');
      }
      
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.BY_ID(projectId), 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          },
          body: JSON.stringify(updates),
          ...options
        }
      );
      
      if (!response.ok) {
        throw await createErrorFromResponse(response);
      }
      
      const updatedProject = await response.json();
      
      // Invalidate caches
      this._removeFromCache('all');
      this._removeFromCache(`project:${projectId}`);
      
      return updatedProject;
      
    } catch (error) {
      console.error(`[ProjectService] Error updating project ${projectId}:`, error);
      handleApiError(error, { rethrow: true });
    }
  }

  /**
   * Deletes a project
   * @param {string} projectId - The ID of the project to delete
   * @param {Object} [options] - Fetch options
   * @returns {Promise<boolean>} True if the project was deleted
   */
  async deleteProject(projectId, options = {}) {
    try {
      if (!projectId) {
        throw new BadRequestError('Project ID is required');
      }
      
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.BY_ID(projectId), 
        { 
          method: 'DELETE',
          ...options 
        }
      );
      
      if (!response.ok) {
        throw await createErrorFromResponse(response);
      }
      
      // Invalidate caches
      this._removeFromCache('all');
      this._removeFromCache(`project:${projectId}`);
      
      return true;
      
    } catch (error) {
      console.error(`[ProjectService] Error deleting project ${projectId}:`, error);
      handleApiError(error, { rethrow: true });
    }
  }

  /**
   * Gets files for a project
   * @param {string} projectId - The ID of the project
   * @param {Object} [options] - Fetch options
   * @param {boolean} [options.forceRefresh=false] - Whether to force a refresh from the API
   * @returns {Promise<Array>} List of files in the project
   */
  async getProjectFiles(projectId, options = {}) {
    try {
      if (!projectId) {
        throw new BadRequestError('Project ID is required');
      }
      
      const { forceRefresh = false, ...fetchOptions } = options;
      const cacheKey = `project:${projectId}:files`;
      
      // Return cached data if available and not forcing refresh
      if (!forceRefresh) {
        const cached = this._getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }
      
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.FILES(projectId), 
        { 
          method: 'GET', 
          ...fetchOptions 
        }
      );
      
      if (!response.ok) {
        throw await createErrorFromResponse(response);
      }
      
      const files = await response.json();
      const result = Array.isArray(files) ? files : [];
      
      // Cache the result
      this._setInCache(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error(`[ProjectService] Error fetching files for project ${projectId}:`, error);
      handleApiError(error, { rethrow: true });
    }
  }
}

// Create and export a singleton instance
const projectService = new ProjectService();

export default projectService;

// Export individual methods for backward compatibility
export const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectFiles
} = projectService;
