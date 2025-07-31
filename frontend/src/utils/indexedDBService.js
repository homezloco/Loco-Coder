/**
 * IndexedDB Service for Project Dashboard
 * 
 * Provides a robust persistence layer for storing and retrieving projects
 * with comprehensive error handling and fallbacks.
 */

// Database configuration
const DB_NAME = 'CoderAIProjectsDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} - The database instance
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    try {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        console.warn('IndexedDB is not supported in this browser. Using fallback storage.');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        console.log('IndexedDB connected successfully');
        
        // Add error handling for database connection failures
        db.onerror = (event) => {
          console.error('Database error:', event.target.error);
        };
        
        resolve(db);
      };

      // Create object stores when database is first created or upgraded
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create projects store with id as key path
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectsStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          projectsStore.createIndex('name', 'name', { unique: false });
          projectsStore.createIndex('category', 'category', { unique: false });
          projectsStore.createIndex('lastModified', 'lastModified', { unique: false });
          projectsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          
          console.log('Projects object store created successfully');
        }
      };
    } catch (error) {
      console.error('Fatal error initializing IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Store multiple projects in IndexedDB
 * @param {Array} projects - Array of project objects to store
 * @returns {Promise<boolean>} - True if successful
 */
export const storeProjects = async (projects) => {
  try {
    if (!Array.isArray(projects) || projects.length === 0) {
      console.warn('No valid projects to store');
      return false;
    }

    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);

    // Add timestamp for tracking
    const timestamp = new Date().toISOString();
    
    // Use transaction to store all projects
    projects.forEach(project => {
      // Ensure each project has required properties
      if (!project.id) {
        project.id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Add or update last sync timestamp
      project.lastSynced = timestamp;
      
      store.put(project);
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`Successfully stored ${projects.length} projects in IndexedDB`);
        resolve(true);
      };
      
      transaction.onerror = (error) => {
        console.error('Error storing projects in IndexedDB:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Failed to store projects in IndexedDB:', error);
    return false;
  }
};

/**
 * Retrieve all projects from IndexedDB
 * @returns {Promise<Array>} - Array of project objects
 */
export const getAllProjects = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const projects = request.result;
        console.log(`Retrieved ${projects.length} projects from IndexedDB`);
        resolve(projects);
      };
      
      request.onerror = (error) => {
        console.error('Error retrieving projects from IndexedDB:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Failed to retrieve projects from IndexedDB:', error);
    return [];
  }
};

/**
 * Get projects by category
 * @param {string} category - Category to filter by
 * @returns {Promise<Array>} - Array of filtered project objects
 */
export const getProjectsByCategory = async (category) => {
  try {
    if (!category) {
      return getAllProjects();
    }

    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const index = store.index('category');
    const request = index.getAll(category);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const projects = request.result;
        console.log(`Retrieved ${projects.length} projects in category '${category}'`);
        resolve(projects);
      };
      
      request.onerror = (error) => {
        console.error(`Error retrieving projects for category '${category}':`, error);
        reject(error);
      };
    });
  } catch (error) {
    console.error(`Failed to retrieve projects for category '${category}':`, error);
    return [];
  }
};

/**
 * Get favorite projects
 * @returns {Promise<Array>} - Array of favorite projects
 */
export const getFavoriteProjects = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const index = store.index('isFavorite');
    const request = index.getAll(true);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const projects = request.result;
        console.log(`Retrieved ${projects.length} favorite projects`);
        resolve(projects);
      };
      
      request.onerror = (error) => {
        console.error('Error retrieving favorite projects:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Failed to retrieve favorite projects:', error);
    return [];
  }
};

/**
 * Get recently modified projects
 * @param {number} limit - Maximum number of projects to return
 * @returns {Promise<Array>} - Array of recent projects
 */
export const getRecentProjects = async (limit = 10) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const index = store.index('lastModified');
    
    // Get all projects and sort them manually since IndexedDB doesn't support limit or sorting
    const request = index.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const projects = request.result;
        
        // Sort by lastModified timestamp (newest first)
        const sortedProjects = projects.sort((a, b) => {
          const dateA = new Date(a.lastModified);
          const dateB = new Date(b.lastModified);
          return dateB - dateA;
        });
        
        // Limit to requested number
        const limitedProjects = sortedProjects.slice(0, limit);
        
        console.log(`Retrieved ${limitedProjects.length} recent projects`);
        resolve(limitedProjects);
      };
      
      request.onerror = (error) => {
        console.error('Error retrieving recent projects:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Failed to retrieve recent projects:', error);
    return [];
  }
};

/**
 * Update a project in IndexedDB
 * @param {Object} project - Project object to update
 * @returns {Promise<boolean>} - True if successful
 */
export const updateProject = async (project) => {
  if (!project || !project.id) {
    console.error('Cannot update project: Invalid project object or missing ID');
    return false;
  }
  
  try {
    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    
    // Update lastModified timestamp
    project.lastModified = new Date().toISOString();
    
    const request = store.put(project);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`Project '${project.id}' updated successfully`);
        resolve(true);
      };
      
      request.onerror = (error) => {
        console.error(`Error updating project '${project.id}':`, error);
        reject(error);
      };
    });
  } catch (error) {
    console.error(`Failed to update project '${project.id}':`, error);
    return false;
  }
};

/**
 * Delete a project from IndexedDB
 * @param {string} projectId - ID of project to delete
 * @returns {Promise<boolean>} - True if successful
 */
export const deleteProject = async (projectId) => {
  if (!projectId) {
    console.error('Cannot delete project: Missing project ID');
    return false;
  }
  
  try {
    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.delete(projectId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`Project '${projectId}' deleted successfully`);
        resolve(true);
      };
      
      request.onerror = (error) => {
        console.error(`Error deleting project '${projectId}':`, error);
        reject(error);
      };
    });
  } catch (error) {
    console.error(`Failed to delete project '${projectId}':`, error);
    return false;
  }
};

/**
 * Clear all projects data from IndexedDB
 * @returns {Promise<boolean>} - True if successful
 */
export const clearAllProjects = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('All projects cleared from IndexedDB');
        resolve(true);
      };
      
      request.onerror = (error) => {
        console.error('Error clearing projects from IndexedDB:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Failed to clear projects from IndexedDB:', error);
    return false;
  }
};

/**
 * Search projects by name (case-insensitive partial match)
 * @param {string} query - Search query string
 * @returns {Promise<Array>} - Array of matching projects
 */
export const searchProjects = async (query) => {
  if (!query || typeof query !== 'string') {
    console.warn('Invalid search query');
    return [];
  }
  
  try {
    // Get all projects and filter them manually
    const allProjects = await getAllProjects();
    const normalizedQuery = query.toLowerCase().trim();
    
    const matchingProjects = allProjects.filter(project => {
      // Search in name, description, and tags
      const nameMatch = project.name && project.name.toLowerCase().includes(normalizedQuery);
      const descMatch = project.description && project.description.toLowerCase().includes(normalizedQuery);
      
      // Check tags if they exist
      let tagMatch = false;
      if (project.tags && Array.isArray(project.tags)) {
        tagMatch = project.tags.some(tag => 
          tag.toLowerCase().includes(normalizedQuery)
        );
      }
      
      return nameMatch || descMatch || tagMatch;
    });
    
    console.log(`Found ${matchingProjects.length} projects matching '${query}'`);
    return matchingProjects;
  } catch (error) {
    console.error(`Search failed for query '${query}':`, error);
    return [];
  }
};

/**
 * Check if IndexedDB is supported and available
 * @returns {Promise<boolean>} - True if IndexedDB is available
 */
export const isIndexedDBAvailable = async () => {
  if (!window.indexedDB) {
    return false;
  }
  
  try {
    await initDB();
    return true;
  } catch (error) {
    console.warn('IndexedDB is not available:', error);
    return false;
  }
};

// Default export with all methods
export default {
  storeProjects,
  getAllProjects,
  getProjectsByCategory,
  getFavoriteProjects,
  getRecentProjects,
  updateProject,
  deleteProject,
  clearAllProjects,
  searchProjects,
  isIndexedDBAvailable
};
