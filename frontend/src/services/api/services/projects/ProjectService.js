import { ENDPOINTS } from '../../../config';
import { fetchWithTimeout } from '../../utils/fetch';
import { handleApiError } from '../../utils/errors';

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
    try {
      const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
        method: 'GET',
        ...options,
      });

      if (!response.ok) {
        throw await handleApiError(response);
      }

      const projects = await response.json();
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      console.error('[ProjectService] Error fetching projects:', error);
      throw error;
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

    try {
      const response = await fetchWithTimeout(ENDPOINTS.PROJECTS.BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: JSON.stringify(projectData),
        ...options,
      });

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error('[ProjectService] Error creating project:', error);
      throw error;
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
