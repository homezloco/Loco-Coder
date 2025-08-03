import { ENDPOINTS } from '../../../config';
import { fetchWithTimeout } from '../../utils/fetch';
import { handleApiError } from '../../utils/errors';

// Default request timeout in milliseconds
const DEFAULT_REQUEST_TIMEOUT = 30000;

// Cache for storing project data
const projectCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Service for handling project-related API operations with enhanced error handling and token management
 */
class ProjectService {
  constructor() {
    // Bind methods
    this.getProjects = this.getProjects.bind(this);
    this.getProject = this.getProject.bind(this);
    this.createProject = this.createProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.clearAuthToken = this.clearAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
  }

  /**
   * Get authentication token with error handling
   */
  async getAuthToken() {
    try {
      const token = localStorage.getItem('authToken') || 
                   sessionStorage.getItem('authToken');
      return token || null;
    } catch (error) {
      console.error('[ProjectService] Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Clear authentication token
   */
  async clearAuthToken() {
    try {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      // Clear any cached data that requires authentication
      projectCache.clear();
    } catch (error) {
      console.error('[ProjectService] Error clearing auth token:', error);
    }
  }

  /**
   * Make an authenticated request with token handling
   */
  async makeAuthenticatedRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || DEFAULT_REQUEST_TIMEOUT;
    const timeoutId = setTimeout(
      () => controller.abort(new Error(`Request timed out after ${timeout}ms`)),
      timeout
    );

    try {
      // Get auth token
      const token = await this.getAuthToken();
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      };

      // Make the request
      const response = await fetchWithTimeout(url, {
        ...options,
        headers,
        signal: controller.signal,
        credentials: 'include'
      });

      // Handle response
      if (!response.ok) {
        let error;
        try {
          error = await handleApiError(response);
          
          // Handle unauthorized (401) responses
          if (response.status === 401) {
            console.warn('[ProjectService] Unauthorized, clearing auth token');
            await this.clearAuthToken();
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
              const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
              window.location.href = `/login?returnUrl=${returnUrl}`;
            }
          }
          
          // Enhance error with response details
          error.response = response;
          error.status = response.status;
          error.statusText = response.statusText;
          
        } catch (parseError) {
          console.error('[ProjectService] Error parsing error response:', parseError);
          error = new Error(`Request failed with status ${response.status}`);
          error.status = response.status;
          error.statusText = response.statusText;
        }
        
        throw error;
      }

      return response;
    } catch (error) {
      // Handle different types of errors
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timed out. Please check your connection and try again.');
        timeoutError.status = 408;
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Network error. Please check your internet connection.');
        networkError.status = 0;
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      // Re-throw the error if it's already processed
      if (error.status) throw error;
      
      // Wrap unexpected errors
      const wrappedError = new Error(`Request failed: ${error.message}`);
      wrappedError.originalError = error;
      wrappedError.status = 500;
      throw wrappedError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get all projects with caching and retry logic
   */
  async getProjects(options = {}) {
    const cacheKey = 'all_projects';
    const cacheEntry = projectCache.get(cacheKey);
    
    // Return cached data if available and not forced refresh
    if (cacheEntry && !options.forceRefresh && 
        (Date.now() - cacheEntry.timestamp) < CACHE_TTL) {
      console.log('[ProjectService] Returning cached projects');
      return [...cacheEntry.data];
    }
    
    try {
      console.log('[ProjectService] Fetching projects...');
      
      const response = await this.makeAuthenticatedRequest(ENDPOINTS.PROJECTS.BASE, {
        method: 'GET',
        ...options
      });

      const projects = await response.json();
      const projectList = Array.isArray(projects) ? projects : [];
      
      // Update cache
      projectCache.set(cacheKey, {
        data: projectList,
        timestamp: Date.now()
      });
      
      console.log(`[ProjectService] Successfully fetched ${projectList.length} projects`);
      return projectList;
      
    } catch (error) {
      // If we have cached data and this is not a forced refresh, return the cached data
      if (cacheEntry && !options.forceRefresh) {
        console.warn('[ProjectService] Using cached data due to error:', error.message);
        return [...cacheEntry.data];
      }
      throw error;
    }
  }

  // Other methods (getProject, createProject, updateProject, deleteProject)
  // would be implemented with similar patterns...
  
  async getProject(projectId, options = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const cacheKey = `project_${projectId}`;
    const cacheEntry = projectCache.get(cacheKey);
    
    // Return cached data if available and not forced refresh
    if (cacheEntry && !options.forceRefresh && 
        (Date.now() - cacheEntry.timestamp) < CACHE_TTL) {
      console.log(`[ProjectService] Returning cached project ${projectId}`);
      return { ...cacheEntry.data };
    }
    
    try {
      console.log(`[ProjectService] Fetching project ${projectId}...`);
      
      const response = await this.makeAuthenticatedRequest(
        `${ENDPOINTS.PROJECTS.BASE}/${projectId}`, 
        { method: 'GET', ...options }
      );

      const project = await response.json();
      
      // Update cache
      projectCache.set(cacheKey, {
        data: project,
        timestamp: Date.now()
      });
      
      console.log(`[ProjectService] Successfully fetched project ${projectId}`);
      return project;
      
    } catch (error) {
      // If we have cached data and this is not a forced refresh, return the cached data
      if (cacheEntry && !options.forceRefresh) {
        console.warn(`[ProjectService] Using cached project ${projectId} due to error:`, error.message);
        return { ...cacheEntry.data };
      }
      throw error;
    }
  }
}

// Create and export a singleton instance
export const projectService = new ProjectService();
export default projectService;
