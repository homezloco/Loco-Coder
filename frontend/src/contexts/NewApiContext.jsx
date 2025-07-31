import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './NewAuthContext';
import { useFeedback } from '../components/feedback/FeedbackContext';
import api from '../services/api';

// Debug log API methods
const logApiMethods = () => {
  console.group('NewApiContext - API Object Inspection');
  
  try {
    // 1. Log the entire API object structure (expanded)
    console.log('Full API object:', api);
    
    // 2. Log prototype chain
    if (api) {
      let proto = Object.getPrototypeOf(api);
      const protoChain = [];
      
      while (proto) {
        protoChain.push(proto.constructor.name || 'Anonymous');
        proto = Object.getPrototypeOf(proto);
      }
      
      console.log('Prototype chain:', protoChain.join(' -> '));
      
      // Log all properties from the prototype chain
      const allProps = new Set();
      let current = api;
      
      while (current && current !== Object.prototype) {
        Object.getOwnPropertyNames(current).forEach(prop => allProps.add(prop));
        current = Object.getPrototypeOf(current);
      }
      
      console.log('All properties:', [...allProps].sort());
    }
    
    // 3. Log all available methods on the API object with more details
    const allMethods = Object.getOwnPropertyNames(api)
      .filter(key => typeof api[key] === 'function')
      .reduce((obj, key) => {
        const descriptor = Object.getOwnPropertyDescriptor(api, key) || 
                         (api.__proto__ ? Object.getOwnPropertyDescriptor(api.__proto__, key) : null);
        
        obj[key] = {
          type: 'function',
          isOwnProperty: Object.prototype.hasOwnProperty.call(api, key),
          isPrototype: api.__proto__ ? key in api.__proto__ : false,
          isWritable: descriptor ? descriptor.writable : false,
          isConfigurable: descriptor ? descriptor.configurable : false,
          isEnumerable: descriptor ? descriptor.enumerable : false
        };
        return obj;
      }, {});
    
    console.log('All methods with details:', allMethods);
    
    // 4. Log specific auth methods we care about with more context
    const authMethods = [
      'setAuthToken', 'getAuthToken', 'clearAuthToken', 'isAuthenticated',
      'getCurrentUser', 'onAuthStateChanged', 'login', 'logout', 'checkAuth'
    ];
    
    const methodsInfo = authMethods.reduce((info, method) => {
      info[method] = {
        exists: method in api,
        type: typeof api[method],
        isFunction: typeof api[method] === 'function',
        isOwnProperty: Object.prototype.hasOwnProperty.call(api, method),
        descriptor: Object.getOwnPropertyDescriptor(api, method) || 
                   (api.__proto__ ? Object.getOwnPropertyDescriptor(api.__proto__, method) : null)
      };
      return info;
    }, {});
    
    console.log('Auth methods details:', methodsInfo);
    
    // 5. Check for any getters that might be hiding the methods
    const getters = Object.entries(
      Object.getOwnPropertyDescriptors(
        Object.getPrototypeOf(api) || {}
      )
    ).filter(([_, desc]) => 'get' in desc);
    
    if (getters.length > 0) {
      console.log('Found getters on API prototype:', getters.map(([name]) => name));
    }
    
    return methodsInfo;
    
  } catch (error) {
    console.error('Error inspecting API object:', error);
    throw error;
    
  } finally {
    console.groupEnd();
  }
};

// Log API methods on import
const apiMethods = logApiMethods();

// Helper function to create a project with fallbacks
const createProjectWithFallbacks = async (projectData) => {
  try {
    console.log('[API Context] Creating project with data:', projectData);
    
    // First try the API if available
    if (api && typeof api.createProject === 'function') {
      console.log('[API Context] Using API to create project');
      return await api.createProject(projectData);
    }
    
    // Fallback to IndexedDB
    if (window.indexedDB) {
      console.log('[API Context] Falling back to IndexedDB for project creation');
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('projectsDB', 1);
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['projects'], 'readwrite');
          const store = transaction.objectStore('projects');
          
          // Generate an ID if not provided
          const projectId = projectData.id || 'proj_' + Date.now();
          const projectWithId = {
            ...projectData,
            id: projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'indexeddb-fallback'
          };
          
          const addRequest = store.add(projectWithId);
          
          addRequest.onsuccess = () => {
            console.log('[IndexedDB] Project saved successfully');
            resolve({ ...projectWithId, id: projectId });
          };
          
          addRequest.onerror = (event) => {
            console.error('[IndexedDB] Error saving project:', event.target.error);
            reject(new Error('Failed to save project locally'));
          };
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('projects')) {
            db.createObjectStore('projects', { keyPath: 'id' });
          }
        };
        
        request.onerror = () => {
          console.error('[IndexedDB] Failed to open database');
          reject(new Error('Failed to open local database'));
        };
      });
    }
    
    // Final fallback to localStorage
    console.warn('[API Context] Falling back to localStorage for project creation');
    try {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const projectId = projectData.id || 'proj_' + Date.now();
      const projectWithId = {
        ...projectData,
        id: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'localstorage-fallback'
      };
      
      projects.push(projectWithId);
      localStorage.setItem('projects', JSON.stringify(projects));
      return projectWithId;
    } catch (localError) {
      console.error('[LocalStorage] Error in fallback project creation:', localError);
      throw new Error('Failed to create project. Please try again later.');
    }
  } catch (error) {
    console.error('[API Context] Error in createProject:', error);
    throw error;
  }
};

// Create the context with proper typing and default values
const NewApiContext = createContext({
  // Auth methods
  isAuthenticated: () => api?.isAuthenticated?.() || false,
  getAuthToken: () => api?.getAuthToken?.() || null,
  setAuthToken: (token) => api?.setAuthToken?.(token) || null,
  clearAuthToken: () => api?.clearAuthToken?.() || null,
  
  // Project methods
  createProject: createProjectWithFallbacks,
  
  // AI availability check with fallbacks
  isAiAvailable: async () => {
    try {
      // First check if the API is available and has the method
      if (api && typeof api.isAiAvailable === 'function') {
        return await api.isAiAvailable();
      }
      
      // Fallback to checking if the AI service is available
      if (api?.ai?.isAvailable) {
        return await api.ai.isAvailable();
      }
      
      // Fallback to checking if the AI service exists
      if (api?.ai) {
        return true;
      }
      
      // Check if we're in development mode (fallback for local testing)
      if (process.env.NODE_ENV === 'development') {
        console.warn('AI availability check falling back to development mode');
        return true; // Assume AI is available in development
      }
      
      // Check if we have a valid auth token (as a proxy for API availability)
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        return true; // If we're authenticated, assume AI is available
      }
      
      // Final fallback - check online status
      return navigator.onLine === true;
    } catch (error) {
      console.error('Error checking AI availability:', error);
      return false;
    }
  },
  
  // State
  loading: false,
  error: null,
  
  // Helpers
  clearError: () => {},
  handleApiError: (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  },
  
  // Other methods will be added by the provider
});

export const ApiProvider = ({ children }) => {
  const { token, logout, user } = useAuth();
  const { showErrorToast } = useFeedback();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Log API methods on mount
  useEffect(() => {
    console.log('NewApiContext - Mounted with API methods:', logApiMethods());
  }, []);

  // Initialize API with auth token when it changes
  useEffect(() => {
    const updateAuthToken = async () => {
      try {
        if (token) {
          // Set the auth token in the API client
          if (api.setAuthToken) {
            await api.setAuthToken(token);
          } else if (api.auth?.setAuthToken) {
            await api.auth.setAuthToken(token);
          } else if (api.defaults?.headers?.common) {
            // Fallback for axios-style API clients
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        } else {
          // Clear the auth token
          let cleared = false;
          
          // Try different ways to clear the token based on API structure
          const clearMethods = [
            // Direct method
            async () => {
              if (typeof api.clearAuthToken === 'function') {
                console.log('Using direct clearAuthToken method');
                await api.clearAuthToken();
                return true;
              }
              return false;
            },
            // Auth module
            async () => {
              if (api.auth && typeof api.auth.clearAuthToken === 'function') {
                console.warn('Using api.auth.clearAuthToken');
                await api.auth.clearAuthToken();
                return true;
              }
              return false;
            },
            // Token module
            async () => {
              if (api.auth?.token && typeof api.auth.token.clearAuthToken === 'function') {
                console.warn('Using api.auth.token.clearAuthToken');
                await api.auth.token.clearAuthToken();
                return true;
              }
              return false;
            },
            // Axios-style clear
            async () => {
              if (api.defaults?.headers?.common) {
                console.warn('Clearing axios auth header');
                delete api.defaults.headers.common['Authorization'];
                return true;
              }
              return false;
            }
          ];
          
          // Try each clear method until one works
          for (const method of clearMethods) {
            try {
              if (await method()) {
                cleared = true;
                break;
              }
            } catch (err) {
              console.warn('Error in clear method:', err);
              continue;
            }
          }
          
          if (!cleared) {
            console.warn('No standard clearAuthToken method found, using fallbacks');
            // Last resort: clear from storage directly
            console.warn('Clearing token from storage as fallback');
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            document.cookie = 'authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            
            // Clear any potential axios defaults
            if (api.defaults?.headers?.common) {
              delete api.defaults.headers.common['Authorization'];
              delete api.defaults.headers.common['authorization'];
            }
          }
        }
      } catch (error) {
        console.error('NewApiContext - Error in token effect:', error);
        setError(error.message);
        showErrorToast('Failed to update authentication state');
      }
    };
    
    updateAuthToken();
  }, [token, showErrorToast]);

  // Handle API errors consistently
  const handleApiError = (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
    setError(errorMessage);
    showErrorToast(errorMessage);
    
    // Auto-logout on 401 Unauthorized
    if (error.response?.status === 401) {
      logout();
    }
    
    return errorMessage;
  };

  // Set up the context value
  // Create a proxy to handle missing methods with better error messages
  const apiProxy = new Proxy(api, {
    get(target, prop) {
      if (prop in target) {
        const value = target[prop];
        // Bind methods to maintain 'this' context
        return typeof value === 'function' ? value.bind(target) : value;
      }
      
      // Special handling for project methods
      const projectMethods = ['createProject', 'getProjects', 'getProject', 'updateProject', 'deleteProject'];
      if (projectMethods.includes(prop)) {
        return async (...args) => {
          console.warn(`[API] Method ${prop} not found on API object, using fallback`);
          if (prop === 'getProjects') return [];
          if (prop === 'getProject') return null;
          throw new Error(`API method ${prop} is not available`);
        };
      }
      
      return target[prop];
    }
  });

  // Helper function to safely call API methods with proper error handling
  const callApiMethod = async (methodName, ...args) => {
    try {
      if (!api[methodName] || typeof api[methodName] !== 'function') {
        console.error(`[API] Method ${methodName} not found on API object`);
        throw new Error(`API method ${methodName} is not available`);
      }
      
      // Log the API call for debugging
      console.log(`[API] Calling ${methodName} with args:`, args);
      
      // Call the method with the bound context and provided arguments
      const result = await api[methodName](...args);
      return result;
    } catch (error) {
      console.error(`[API] Error in ${methodName}:`, error);
      throw error; // Re-throw to allow calling code to handle the error
    }
  };

  const contextValue = {
    // Core API modules with proxy for better error handling
    ...apiProxy,
    
    // Project methods with proper error handling and fallbacks
    createProject: async (projectData) => {
      try {
        // First try the direct API method
        if (api.createProject && typeof api.createProject === 'function') {
          return await api.createProject(projectData);
        }
        
        // Fallback to the callApiMethod helper
        return await callApiMethod('createProject', projectData);
      } catch (error) {
        console.error('[API] Error in createProject:', error);
        
        // Fallback to IndexedDB if available
        if (window.indexedDB) {
          console.warn('[API] Falling back to IndexedDB for project creation');
          try {
            const dbRequest = indexedDB.open('projectsDB', 1);
            
            return new Promise((resolve, reject) => {
              dbRequest.onerror = (event) => {
                console.error('[IndexedDB] Error opening database:', event.target.error);
                reject(new Error('Failed to access local storage'));
              };
              
              dbRequest.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['projects'], 'readwrite');
                const store = transaction.objectStore('projects');
                
                // Generate a unique ID for the project
                const projectId = 'proj_' + Date.now();
                const projectWithId = {
                  ...projectData,
                  id: projectId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  source: 'indexeddb-fallback'
                };
                
                const request = store.add(projectWithId);
                
                request.onsuccess = () => {
                  console.log('[IndexedDB] Project saved successfully');
                  resolve({ ...projectWithId, id: projectId });
                };
                
                request.onerror = (event) => {
                  console.error('[IndexedDB] Error saving project:', event.target.error);
                  reject(new Error('Failed to save project locally'));
                };
              };
              
              dbRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('projects')) {
                  db.createObjectStore('projects', { keyPath: 'id' });
                }
              };
            });
          } catch (dbError) {
            console.error('[IndexedDB] Error in fallback project creation:', dbError);
            // Continue to next fallback
          }
        }
        
        // Final fallback to localStorage
        console.warn('[API] Falling back to localStorage for project creation');
        try {
          const projects = JSON.parse(localStorage.getItem('projects') || '[]');
          const projectId = 'proj_' + Date.now();
          const projectWithId = {
            ...projectData,
            id: projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'localstorage-fallback'
          };
          
          projects.push(projectWithId);
          localStorage.setItem('projects', JSON.stringify(projects));
          return projectWithId;
        } catch (localError) {
          console.error('[LocalStorage] Error in fallback project creation:', localError);
          throw new Error('Failed to create project. Please try again later.');
        }
      }
    },
    // Get projects with fallback to local storage
    getProjects: async (forceRefresh = false) => {
      try {
        if (api.getProjects && typeof api.getProjects === 'function') {
          return await api.getProjects(forceRefresh);
        }
        
        // Fallback to IndexedDB
        if (window.indexedDB) {
          return new Promise((resolve) => {
            const request = indexedDB.open('projectsDB', 1);
            
            request.onsuccess = (event) => {
              const db = event.target.result;
              const transaction = db.transaction(['projects'], 'readonly');
              const store = transaction.objectStore('projects');
              const getRequest = store.getAll();
              
              getRequest.onsuccess = () => {
                const projects = getRequest.result || [];
                console.log(`[IndexedDB] Retrieved ${projects.length} projects`);
                resolve(projects);
              };
              
              getRequest.onerror = () => {
                console.warn('[IndexedDB] Error getting projects, falling back to localStorage');
                resolve(JSON.parse(localStorage.getItem('projects') || '[]'));
              };
            };
            
            request.onerror = () => {
              console.warn('[IndexedDB] Failed to open database, falling back to localStorage');
              resolve(JSON.parse(localStorage.getItem('projects') || '[]'));
            };
            
            request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id' });
              }
            };
          });
        }
        
        // Final fallback to localStorage
        return JSON.parse(localStorage.getItem('projects') || '[]');
      } catch (error) {
        console.error('[API] Error in getProjects:', error);
        return [];
      }
    },
    
    // Get single project with fallback
    getProject: async (projectId) => {
      try {
        if (api.getProject && typeof api.getProject === 'function') {
          return await api.getProject(projectId);
        }
        
        // Fallback to get all projects and filter
        const projects = await contextValue.getProjects();
        return projects.find(p => p.id === projectId) || null;
      } catch (error) {
        console.error(`[API] Error getting project ${projectId}:`, error);
        return null;
      }
    },
    
    // Update project with fallback
    updateProject: async (projectId, updates) => {
      try {
        if (api.updateProject && typeof api.updateProject === 'function') {
          return await api.updateProject(projectId, updates);
        }
        
        // Fallback to local update
        const projects = await contextValue.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        
        if (index === -1) {
          throw new Error('Project not found');
        }
        
        const updatedProject = {
          ...projects[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        // Save back to IndexedDB if available
        if (window.indexedDB) {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open('projectsDB', 1);
            
            request.onsuccess = (event) => {
              const db = event.target.result;
              const transaction = db.transaction(['projects'], 'readwrite');
              const store = transaction.objectStore('projects');
              
              const updateRequest = store.put(updatedProject);
              
              updateRequest.onsuccess = () => {
                console.log(`[IndexedDB] Updated project ${projectId}`);
                resolve(updatedProject);
              };
              
              updateRequest.onerror = (event) => {
                console.error('[IndexedDB] Error updating project:', event.target.error);
                reject(new Error('Failed to update project in local storage'));
              };
            };
            
            request.onerror = () => {
              console.warn('[IndexedDB] Failed to open database, falling back to localStorage');
              // Fall through to localStorage
              try {
                const projects = JSON.parse(localStorage.getItem('projects') || '[]');
                const index = projects.findIndex(p => p.id === projectId);
                
                if (index !== -1) {
                  projects[index] = updatedProject;
                  localStorage.setItem('projects', JSON.stringify(projects));
                  resolve(updatedProject);
                } else {
                  reject(new Error('Project not found'));
                }
              } catch (error) {
                reject(error);
              }
            };
          });
        }
        
        // Fallback to localStorage
        const projectsStr = localStorage.getItem('projects') || '[]';
        const projectsList = JSON.parse(projectsStr);
        const projectIndex = projectsList.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
          throw new Error('Project not found');
        }
        
        projectsList[projectIndex] = updatedProject;
        localStorage.setItem('projects', JSON.stringify(projectsList));
        return updatedProject;
      } catch (error) {
        console.error(`[API] Error updating project ${projectId}:`, error);
        throw error;
      }
    },
    
    // Delete project with fallback
    deleteProject: async (projectId) => {
      try {
        if (api.deleteProject && typeof api.deleteProject === 'function') {
          return await api.deleteProject(projectId);
        }
        
        // Fallback to local delete
        if (window.indexedDB) {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open('projectsDB', 1);
            
            request.onsuccess = (event) => {
              const db = event.target.result;
              const transaction = db.transaction(['projects'], 'readwrite');
              const store = transaction.objectStore('projects');
              
              const deleteRequest = store.delete(projectId);
              
              deleteRequest.onsuccess = () => {
                console.log(`[IndexedDB] Deleted project ${projectId}`);
                resolve({ success: true, id: projectId });
              };
              
              deleteRequest.onerror = (event) => {
                console.error('[IndexedDB] Error deleting project:', event.target.error);
                reject(new Error('Failed to delete project from local storage'));
              };
            };
            
            request.onerror = () => {
              console.warn('[IndexedDB] Failed to open database, falling back to localStorage');
              // Fall through to localStorage
              try {
                const projects = JSON.parse(localStorage.getItem('projects') || '[]');
                const filtered = projects.filter(p => p.id !== projectId);
                
                if (filtered.length < projects.length) {
                  localStorage.setItem('projects', JSON.stringify(filtered));
                  resolve({ success: true, id: projectId });
                } else {
                  reject(new Error('Project not found'));
                }
              } catch (error) {
                reject(error);
              }
            };
          });
        }
        
        // Fallback to localStorage
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const filtered = projects.filter(p => p.id !== projectId);
        
        if (filtered.length === projects.length) {
          throw new Error('Project not found');
        }
        
        localStorage.setItem('projects', JSON.stringify(filtered));
        return { success: true, id: projectId };
      } catch (error) {
        console.error(`[API] Error deleting project ${projectId}:`, error);
        throw error;
      }
    },
    
    // AI Service with null check
    aiService: api.ai || {
      chat: async () => { throw new Error('AI service not available'); },
      execute: async () => { throw new Error('AI service not available'); },
      isAvailable: () => false
    },
    
    // State
    loading,
    error,
    
    // Methods
    clearError: () => setError(null),
    handleApiError,
    
    // AI Availability Check
    isAiAvailable: () => {
      try {
        // 1. Check if the API has the method directly
        if (api.isAiAvailable && typeof api.isAiAvailable === 'function') {
          return api.isAiAvailable();
        }
        
        // 2. Check if AI service is available through the API
        if (api.ai && typeof api.ai.isAvailable === 'function') {
          return api.ai.isAvailable();
        }
        
        // 3. Check if we have a valid auth token (as a proxy for API availability)
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
          return true; // If we're authenticated, assume AI is available
        }
        
        // 4. Final fallback - check online status
        return navigator.onLine === true;
      } catch (error) {
        console.error('Error checking AI availability:', error);
        return false; // Default to false if any error occurs
      }
    },
    
    clearAuthToken: async () => {
      try {
        // Clear token from state
        setError(null);
        
        // Clear token from storage
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        document.cookie = 'authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // Clear from API client if possible
        if (api.clearAuthToken) {
          await api.clearAuthToken();
        } else if (api.auth?.clearAuthToken) {
          await api.auth.clearAuthToken();
        } else if (api.auth?.token?.clearAuthToken) {
          await api.auth.token.clearAuthToken();
        }
        
        // Clear axios headers if they exist
        if (api.defaults?.headers?.common) {
          delete api.defaults.headers.common['Authorization'];
          delete api.defaults.headers.common['authorization'];
        }
        
        return true;
      } catch (error) {
        console.error('Error in clearAuthToken:', error);
        return false;
      }
    },
    
  };

  return (
    <NewApiContext.Provider value={contextValue}>
      {children}
    </NewApiContext.Provider>
  );
};

// Custom hook to use the API context
export const useApi = () => {
  const context = useContext(NewApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export default NewApiContext;
