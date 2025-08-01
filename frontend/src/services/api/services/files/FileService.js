import { ENDPOINTS } from '../../../config';
import { fetchWithTimeout } from '../../utils/fetch';
import { handleApiError } from '../../utils/errors';

/**
 * Service for handling file-related API operations
 */
class FileService {
  constructor() {
    // Bind methods
    this.getProjectFiles = this.getProjectFiles.bind(this);
    this.readFile = this.readFile.bind(this);
    this.writeFile = this.writeFile.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.moveFile = this.moveFile.bind(this);
  }

  /**
   * Get all files in a project
   * @param {string} projectId - The project ID
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} List of files
   */
  async getProjectFiles(projectId, options = {}) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    try {
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.FILES(projectId),
        {
          method: 'GET',
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      const files = await response.json();
      return Array.isArray(files) ? files : [];
    } catch (error) {
      console.error(`[FileService] Error fetching files for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Read file content
   * @param {string} projectId - The project ID
   * @param {string} filePath - Path to the file
   * @param {Object} options - Fetch options
   * @returns {Promise<string|ArrayBuffer>} File content
   */
  async readFile(projectId, filePath, options = {}) {
    if (!projectId || !filePath) {
      throw new Error('Project ID and file path are required');
    }

    try {
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.FILE(projectId, filePath),
        {
          method: 'GET',
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      // Handle different content types
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        return response.json();
      } else if (contentType.includes('text/')) {
        return response.text();
      }
      
      // For binary data, return as ArrayBuffer
      return response.arrayBuffer();
    } catch (error) {
      console.error(`[FileService] Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write content to a file
   * @param {string} projectId - The project ID
   * @param {string} filePath - Path to the file
   * @param {string|ArrayBuffer} content - Content to write
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Server response
   */
  async writeFile(projectId, filePath, content, options = {}) {
    if (!projectId || !filePath) {
      throw new Error('Project ID and file path are required');
    }

    const headers = {
      'Content-Type': 'application/octet-stream',
      ...(options.headers || {}),
    };

    let body = content;
    
    // Handle different content types
    if (content instanceof ArrayBuffer) {
      // Already in binary format
    } else if (typeof content === 'object') {
      body = JSON.stringify(content);
      headers['Content-Type'] = 'application/json';
    } else {
      body = String(content);
      headers['Content-Type'] = 'text/plain';
    }

    try {
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.FILE(projectId, filePath),
        {
          method: 'PUT',
          headers,
          body,
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error(`[FileService] Error writing to file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file
   * @param {string} projectId - The project ID
   * @param {string} filePath - Path to the file
   * @param {Object} options - Fetch options
   * @returns {Promise<boolean>} True if successful
   */
  async deleteFile(projectId, filePath, options = {}) {
    if (!projectId || !filePath) {
      throw new Error('Project ID and file path are required');
    }

    try {
      const response = await fetchWithTimeout(
        ENDPOINTS.PROJECTS.FILE(projectId, filePath),
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
      console.error(`[FileService] Error deleting file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Move or rename a file
   * @param {string} projectId - The project ID
   * @param {string} oldPath - Current file path
   * @param {string} newPath - New file path
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Server response
   */
  async moveFile(projectId, oldPath, newPath, options = {}) {
    if (!projectId || !oldPath || !newPath) {
      throw new Error('Project ID, old path, and new path are required');
    }

    try {
      const response = await fetchWithTimeout(
        `${ENDPOINTS.PROJECTS.FILE(projectId, oldPath)}?moveTo=${encodeURIComponent(newPath)}`,
        {
          method: 'PATCH',
          ...options,
        }
      );

      if (!response.ok) {
        throw await handleApiError(response);
      }

      return response.json();
    } catch (error) {
      console.error(`[FileService] Error moving file from ${oldPath} to ${newPath}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const fileService = new FileService();

export default fileService;
