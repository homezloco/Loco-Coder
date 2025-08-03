import { ENDPOINTS } from '../../../config';
import { fetchWithTimeout } from '../../utils/fetch';
import { handleApiError } from '../../utils/errors';

// Default request timeout in milliseconds
const DEFAULT_REQUEST_TIMEOUT = 30000;

/**
 * Service for handling project-related API operations
 */
class ProjectService {
  constructor() {
    // Bind methods
    this.getProjects = this.getProjects.bind(this);
    this.getProject = this.getProject.bind(this);
    this.createProject = this.createProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
  }

  /**
   * Get all projects
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} List of projects
   */
  async getProjects(options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || DEFAULT_REQUEST_TIMEOUT;
    const timeoutId = setTimeout(
      () => controller.abort(new Error(`Request timed out after ${timeout}ms`)),
      timeout
    );
    
    try {
      console.log('[ProjectService] Fetching projects...');
      
      // Ensure we have the latest auth token
      let token;
      try {
        token = await this.getAuthToken();
        if (!token) {
          console.warn('[ProjectService] No auth token found, attempting unauthenticated request');
        }
      } catch (tokenError) {
        console.warn('[ProjectService] Error getting auth token:', tokenError);
        // Continue without token, let the server handle authentication
      }
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      };
      
      // Try the primary endpoint first
      let response;
      let lastError;
      
      try {
        response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
          method: 'GET',
          signal: controller.signal,
          headers,
          credentials: 'include',
          ...options
        });
      } catch (fetchError) {
        lastError = fetchError;
        console.warn('[ProjectService] Error fetching from primary endpoint, trying fallbacks...', fetchError);
        
        // Try fallback endpoints if available
        if (window.API_FALLBACK_URLS && Array.isArray(window.API_FALLBACK_URLS)) {
          for (const baseUrl of window.API_FALLBACK_URLS) {
            try {
              const url = `${baseUrl}${ENDPOINTS.PROJECTS.BASE}`;
              console.log(`[ProjectService] Trying fallback endpoint: ${url}`);
              response = await fetchWithTimeout(url, {
                method: 'GET',
                signal: controller.signal,
                headers,
                credentials: 'include',
                ...options
              });
              lastError = null;
              break; // Exit loop on success
            } catch (e) {
              lastError = e;
              console.warn(`[ProjectService] Fallback endpoint failed:`, e);
            }
          }
        }
        
        // If all endpoints failed, throw the last error
        if (lastError) throw lastError;
      }

      if (!response.ok) {
        const error = await handleApiError(response);
        // If unauthorized, clear the token and redirect to login
        if (response.status === 401) {
          await this.clearAuthToken();
          window.location.href = '/login';
        }
        throw error;
      }

      const projects = await response.json();
      console.log(`[ProjectService] Successfully fetched ${projects.length} projects`);
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      // Handle different types of errors
      let errorMessage = 'Failed to fetch projects';
      let statusCode = error.status || 500;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        statusCode = 408; // Request Timeout
        console.warn(`[ProjectService] ${errorMessage}`, error);
      } 
      else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
        statusCode = 0; // Network error
        console.error(`[ProjectService] ${errorMessage}`, error);
      }
      else if (error.response) {
        // Already processed API error
        console.error('[ProjectService] API error:', error);
        throw error; // Re-throw as it's already processed
      }
      else {
        console.error('[ProjectService] Unexpected error fetching projects:', error);
      }
      
      // Create a standardized error object
      const apiError = new Error(errorMessage);
      apiError.name = 'ProjectServiceError';
      apiError.status = statusCode;
      apiError.originalError = error;
      apiError.isNetworkError = statusCode === 0;
      apiError.isTimeout = statusCode === 408;
      
      throw apiError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get a single project by ID
   * @param {string} projectId - The project ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Project data
   */
  async getProject(projectId, options = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    try {
      const response = await fetchWithTimeout(
        `${ENDPOINTS.PROJECTS.BASE}/${projectId}`,
        {
          method: 'GET',
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error(`[ProjectService] Error fetching project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} The created project
   */
  async createProject(projectData, options = {}) {
    if (!projectData || !projectData.name) {
      throw new Error('Project name is required');
    }

    const controller = new AbortController();
    const timeout = options.timeout || DEFAULT_REQUEST_TIMEOUT;
    const timeoutId = setTimeout(
      () => controller.abort(new Error(`Request timed out after ${timeout}ms`)),
      timeout
    );

    try {
      // Ensure we have the latest auth token
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      console.log('[ProjectService] Creating new project:', { name: projectData.name });
      
      const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(options.headers || {}),
        },
        body: JSON.stringify(projectData),
        credentials: 'include',
        ...options,
      });

      if (!response.ok) {
        const error = await handleApiError(response);
        // If unauthorized, clear the token and redirect to login
        if (response.status === 401) {
          await this.clearAuthToken();
          window.location.href = '/login';
        }
        throw error;
      }

      const newProject = await response.json();
      console.log('[ProjectService] Successfully created project:', newProject.id);
      return newProject;
    } catch (error) {
      console.error('[ProjectService] Error creating project:', error);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Update an existing project
   * @param {string} projectId - The project ID
   * @param {Object} updates - Project updates
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} The updated project
   */
  async updateProject(projectId, updates, options = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    try {
      const response = await fetchWithTimeout(
        `${ENDPOINTS.PROJECTS.BASE}/${projectId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
          body: JSON.stringify(updates),
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error(`[ProjectService] Error updating project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a project
   * @param {string} projectId - The project ID
   * @param {Object} options - Fetch options
   * @returns {Promise<boolean>} True if successful
   */
  async deleteProject(projectId, options = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    try {
      const response = await fetchWithTimeout(
        `${ENDPOINTS.PROJECTS.BASE}/${projectId}`,
        {
          method: 'DELETE',
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return true;
    } catch (error) {
      console.error(`[ProjectService] Error deleting project ${projectId}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const projectService = new ProjectService();

export default projectService;
