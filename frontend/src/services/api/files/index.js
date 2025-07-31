import { ENDPOINTS } from '../config';
import { get, post, put, del, fetchWithTimeout } from '../utils/fetch';
import { withCache } from '../utils/cache';
import { handleApiError, BadRequestError } from '../utils/errors';

/**
 * Reads the content of a file
 * @param {string} projectId - The ID of the project
 * @param {string} filePath - Path to the file within the project
 * @param {Object} [options] - Fetch options
 * @returns {Promise<string>} The file content
 */
export const readFile = async (projectId, filePath, options = {}) => {
  try {
    if (!projectId || !filePath) {
      throw new BadRequestError('Project ID and file path are required');
    }
    
    const cacheKey = `file:${projectId}:${filePath}`;
    
    // For small files, we can use the cache
    if (filePath.split('.').pop() !== 'binary') {
      const cached = getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const response = await fetchWithTimeout(
      ENDPOINTS.PROJECTS.FILE(projectId, filePath),
      {
        method: 'GET',
        ...options,
      }
    );
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    // Handle different content types
    const contentType = response.headers.get('content-type') || '';
    let content;
    
    if (contentType.includes('application/json')) {
      content = await response.json();
    } else if (contentType.includes('text/')) {
      content = await response.text();
    } else {
      // For binary data, return as ArrayBuffer
      content = await response.arrayBuffer();
    }
    
    // Cache text and JSON files (avoid caching large binary files)
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      setInCache(cacheKey, content, 5 * 60 * 1000); // 5 minutes
    }
    
    return content;
    
  } catch (error) {
    console.error(`Error reading file ${filePath} in project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Writes content to a file
 * @param {string} projectId - The ID of the project
 * @param {string} filePath - Path to the file within the project
 * @param {string|ArrayBuffer} content - The content to write
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The server response
 */
export const writeFile = async (projectId, filePath, content, options = {}) => {
  try {
    if (!projectId || !filePath) {
      throw new BadRequestError('Project ID and file path are required');
    }
    
    const headers = {
      'Content-Type': 'application/octet-stream',
    };
    
    let body;
    
    // Handle different content types
    if (content instanceof ArrayBuffer) {
      body = content;
    } else if (typeof content === 'object') {
      body = JSON.stringify(content);
      headers['Content-Type'] = 'application/json';
    } else {
      body = String(content);
      headers['Content-Type'] = 'text/plain';
    }
    
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
      throw await createErrorFromResponse(response);
    }
    
    // Invalidate cache for this file
    removeFromCache(`file:${projectId}:${filePath}`);
    
    return response.json();
    
  } catch (error) {
    console.error(`Error writing to file ${filePath} in project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Deletes a file
 * @param {string} projectId - The ID of the project
 * @param {string} filePath - Path to the file within the project
 * @param {Object} [options] - Fetch options
 * @returns {Promise<boolean>} True if the file was deleted
 */
export const deleteFile = async (projectId, filePath, options = {}) => {
  try {
    if (!projectId || !filePath) {
      throw new BadRequestError('Project ID and file path are required');
    }
    
    const response = await fetchWithTimeout(
      ENDPOINTS.PROJECTS.FILE(projectId, filePath),
      {
        method: 'DELETE',
        ...options,
      }
    );
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    // Invalidate cache for this file
    removeFromCache(`file:${projectId}:${filePath}`);
    
    return true;
    
  } catch (error) {
    console.error(`Error deleting file ${filePath} in project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Renames or moves a file
 * @param {string} projectId - The ID of the project
 * @param {string} oldPath - Current path of the file
 * @param {string} newPath - New path for the file
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The server response
 */
export const moveFile = async (projectId, oldPath, newPath, options = {}) => {
  try {
    if (!projectId || !oldPath || !newPath) {
      throw new BadRequestError('Project ID, old path, and new path are required');
    }
    
    const response = await fetchWithTimeout(
      `${ENDPOINTS.PROJECTS.FILE(projectId, oldPath)}?moveTo=${encodeURIComponent(newPath)}`,
      {
        method: 'PATCH',
        ...options,
      }
    );
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    // Invalidate cache for both old and new paths
    removeFromCache(`file:${projectId}:${oldPath}`);
    removeFromCache(`file:${projectId}:${newPath}`);
    
    return response.json();
    
  } catch (error) {
    console.error(`Error moving file from ${oldPath} to ${newPath} in project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Creates a new directory
 * @param {string} projectId - The ID of the project
 * @param {string} dirPath - Path to the new directory
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The server response
 */
export const createDirectory = async (projectId, dirPath, options = {}) => {
  try {
    if (!projectId || !dirPath) {
      throw new BadRequestError('Project ID and directory path are required');
    }
    
    const response = await fetchWithTimeout(
      `${ENDPOINTS.PROJECTS.BASE}/${projectId}/directories`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: dirPath }),
        ...options,
      }
    );
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    return response.json();
    
  } catch (error) {
    console.error(`Error creating directory ${dirPath} in project ${projectId}:`, error);
    handleApiError(error, { rethrow: true });
  }
};

// Export all file-related functions
export default {
  readFile,
  writeFile,
  deleteFile,
  moveFile,
  createDirectory,
};
