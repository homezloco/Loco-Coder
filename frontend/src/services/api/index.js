// Import all API modules
import * as auth from './auth';
import * as token from './auth/token';
import * as projects from './projects';
import * as files from './files';
import * as templates from './templates';

// Import AI service factory function with debug logging
console.log('Importing AI service factory...');
import { createAiService } from '../../api/modules/ai';

// Create AI service instance
let aiServiceInstance = null;
let isAiServiceInitialized = false;

// Initialize AI service asynchronously
const initAiService = async () => {
  if (isAiServiceInitialized) {
    return aiServiceInstance;
  }
  
  console.log('Initializing AI service...');
  try {
    aiServiceInstance = createAiService();
    isAiServiceInitialized = true;
    console.log('AI service initialized successfully', {
      methods: aiServiceInstance ? Object.keys(aiServiceInstance).filter(k => typeof aiServiceInstance[k] === 'function') : []
    });
    return aiServiceInstance;
  } catch (error) {
    console.error('Failed to initialize AI service:', error);
    throw error;
  }
};

// Initialize AI service immediately
initAiService().catch(console.error);

// Create a proxy for the AI service that handles initialization
const aiServiceProxy = new Proxy({}, {
  get(target, prop) {
    // If the service is initialized, return the method directly
    if (isAiServiceInitialized && aiServiceInstance) {
      const method = aiServiceInstance[prop];
      if (typeof method === 'function') {
        return method.bind(aiServiceInstance);
      }
      return method;
    }
    
    // If the service isn't initialized yet, return a function that will wait for initialization
    if (prop in (aiServiceInstance || {})) {
      return async (...args) => {
        if (!isAiServiceInitialized || !aiServiceInstance) {
          console.log('[API] AI service not yet initialized, initializing...');
          try {
            await initAiService();
          } catch (error) {
            console.error('[API] Failed to initialize AI service:', error);
            throw new Error('AI service is not available');
          }
        }
        return aiServiceInstance[prop](...args);
      };
    }
    
    // For non-function properties, wait for initialization and return the value
    return (async () => {
      if (!isAiServiceInitialized) {
        console.log('AI service not yet initialized, waiting for property access...');
        await initAiService();
      }
      return aiServiceInstance[prop];
    })();
  },
  
  // Handle property existence checks
  has(target, prop) {
    return isAiServiceInitialized ? (prop in aiServiceInstance) : true;
  },
  
  // Handle Object.keys() and similar operations
  ownKeys() {
    if (!isAiServiceInitialized) {
      console.warn('AI service not yet initialized, returning empty key list');
      return [];
    }
    return Reflect.ownKeys(aiServiceInstance);
  },
  
  // Handle property enumeration
  getOwnPropertyDescriptor() {
    return {
      configurable: true,
      enumerable: true,
      writable: true
    };
  }
});

// Debug log to verify token methods are imported
console.log('API Module - Token methods:', {
  setAuthToken: typeof token.setAuthToken,
  getAuthToken: typeof token.getAuthToken,
  clearAuthToken: typeof token.clearAuthToken,
  validateToken: typeof token.validateToken,
  isAuthenticated: typeof token.isAuthenticated
});

/**
 * API Client Class
 * Centralized API client with proper method binding
 */
class ApiClient {
  constructor() {
    // Core modules
    // Initialize core modules with method binding
    this.auth = auth;
    
    // Bind projects methods to ensure proper 'this' context
    this.projects = {};
    Object.entries(projects).forEach(([key, value]) => {
      if (typeof value === 'function') {
        this.projects[key] = value.bind(this);
      } else {
        this.projects[key] = value;
      }
    });
    
    this.files = files;
    this.templates = templates;
    
        // Initialize AI service with proxy
    // Use Object.defineProperty to make it non-enumerable
    Object.defineProperty(this, 'ai', {
      get: () => {
        // This will be called every time the property is accessed
        if (!isAiServiceInitialized || !aiServiceInstance) {
          console.warn('[API] AI service accessed before initialization');
        }
        return aiServiceProxy;
      },
      enumerable: false,
      configurable: true
    });
    
    // Also add a method to check if AI is available
    this.isAiAvailable = async () => {
      if (!isAiServiceInitialized || !aiServiceInstance) {
        try {
          await initAiService();
          return true;
        } catch (error) {
          console.error('[API] AI service not available:', error);
          return false;
        }
      }
      return true;
    };
    
    // Add a method to wait for AI service to be ready
    this.waitForAiService = async () => {
      if (isAiServiceInitialized && aiServiceInstance) {
        return aiServiceInstance;
      }
      return new Promise((resolve, reject) => {
        const check = () => {
          if (isAiServiceInitialized && aiServiceInstance) {
            resolve(aiServiceInstance);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
        
        // Add a timeout
        setTimeout(() => {
          if (!isAiServiceInitialized || !aiServiceInstance) {
            reject(new Error('Timeout waiting for AI service to initialize'));
          }
        }, 5000);
      });
    };
    
    console.log('[API] AI service proxy attached to API client');
    
    // Debug log to verify projects methods are properly bound
    console.log('[API] Projects methods:', {
      methods: Object.keys(this.projects).filter(k => typeof this.projects[k] === 'function'),
      hasGetProjects: typeof this.projects.getProjects === 'function'
    });
    
    // Bind all methods to ensure proper 'this' context
    this.setAuthToken = this.setAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.clearAuthToken = this.clearAuthToken.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.validateToken = this.validateToken.bind(this);
    
    // Bind auth methods
    this.login = this.wrapMethod('login', auth.login);
    this.logout = this.wrapMethod('logout', auth.logout);
    this.checkAuth = this.wrapMethod('checkAuth', auth.checkAuth);
    this.getCurrentUser = this.wrapMethod('getCurrentUser', auth.getCurrentUser);
    this.onAuthStateChanged = this.wrapMethod('onAuthStateChanged', auth.onAuthStateChanged);
  }
  
  // Helper to wrap methods with error handling
  wrapMethod(name, method) {
    if (typeof method !== 'function') {
      console.warn(`Method ${name} is not a function`);
      return () => Promise.reject(new Error(`${name} is not implemented`));
    }
    return method.bind(this);
  }
  
  // Auth token methods
  async setAuthToken(token, remember = false) {
    console.log('API.setAuthToken called');
    if (typeof token.setAuthToken === 'function') {
      return token.setAuthToken(token, remember);
    }
    throw new Error('setAuthToken is not available');
  }
  
  getAuthToken() {
    console.log('API.getAuthToken called');
    if (typeof token.getAuthToken === 'function') {
      return token.getAuthToken();
    }
    console.error('getAuthToken is not available');
    return null;
  }
  
  clearAuthToken() {
    console.log('API.clearAuthToken called');
    if (typeof token.clearAuthToken === 'function') {
      return token.clearAuthToken();
    }
    console.error('clearAuthToken is not available');
    return false;
  }
  
  isAuthenticated() {
    if (typeof token.isAuthenticated === 'function') {
      return token.isAuthenticated();
    }
    console.warn('isAuthenticated is not available');
    return false;
  }
  
  validateToken(tokenToValidate) {
    if (typeof token.validateToken === 'function') {
      return token.validateToken(tokenToValidate);
    }
    console.warn('validateToken is not available');
    return Promise.resolve(false);
  }
  
  // Initialize method
  init(config = {}) {
    console.log('API initialized with config:', config);
    // Initialize modules if they have an init method
    [this.auth, this.projects, this.files, this.templates].forEach(module => {
      if (module && typeof module.init === 'function') {
        module.init(config);
      }
    });
    return this;
  }
  
  // Debug method to check available methods
  debug() {
    return {
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
        .sort(),
      modules: {
        auth: !!this.auth,
        projects: !!this.projects,
        files: !!this.files,
        templates: !!this.templates
      }
    };
  }
}

// Create the singleton instance
const api = new ApiClient();

// Debug log the API instance
console.log('API instance created with methods:', Object.keys(api));

// Export the singleton instance as default
export default api;

// Export the API object with direct method references
export const apiObject = {
  // Core modules
  auth,
  projects,
  files,
  templates,
  
  // Auth methods - using directly imported implementations
  setAuthToken: (token, remember) => {
    console.log('API.setAuthToken called');
    if (typeof setAuthTokenImpl === 'function') {
      return setAuthTokenImpl(token, remember);
    }
    console.error('setAuthToken is not a function');
    return false;
  },
  
  getAuthToken: () => {
    console.log('API.getAuthToken called');
    if (typeof getAuthTokenImpl === 'function') {
      return getAuthTokenImpl();
    }
    console.error('getAuthToken is not a function');
    return null;
  },
  
  clearAuthToken: () => {
    console.log('API.clearAuthToken called');
    if (typeof clearAuthTokenImpl === 'function') {
      return clearAuthTokenImpl();
    }
    console.error('clearAuthToken is not a function');
    return false;
  },
  
  isAuthenticated: () => {
    if (typeof isAuthenticatedImpl === 'function') {
      return isAuthenticatedImpl();
    }
    console.warn('isAuthenticated is not a function');
    return false;
  },
  
  getCurrentUser: () => {
    if (typeof getCurrentUser === 'function') {
      return getCurrentUser();
    }
    console.warn('getCurrentUser is not a function');
    return null;
  },
  
  onAuthStateChanged: (callback) => {
    console.log('API.onAuthStateChanged called');
    if (typeof onAuthStateChanged === 'function') {
      return onAuthStateChanged(callback);
    }
    console.warn('onAuthStateChanged is not a function');
    return () => {}; // Return empty unsubscribe function
  },
  
  login: typeof login === 'function' ? login : (() => {
    console.warn('login not implemented');
    return Promise.reject(new Error('Login not implemented'));
  }),
  
  logout: typeof logout === 'function' ? logout : (() => {
    console.warn('logout not implemented');
    return Promise.resolve();
  }),
  
  checkAuth: typeof checkAuth === 'function' ? checkAuth : (() => {
    console.warn('checkAuth not implemented');
    return Promise.resolve({ isAuthenticated: false });
  }),
  
  // Initialize method
  init(config = {}) {
    console.log('API.init called with config:', config);
    
    // Initialize auth if available
    if (typeof auth.init === 'function') {
      auth.init(config);
    }
    
    // Initialize other modules if needed
    [projects, files, templates].forEach(module => {
      if (module.init && typeof module.init === 'function') {
        module.init(config);
      }
    });
    
    return this;
  },
  
  // Add a debug method to check available methods
  debug() {
    return {
      authMethods: Object.keys(auth),
      apiMethods: Object.keys(api),
      hasClearAuthToken: 'clearAuthToken' in auth,
      clearAuthToken: typeof auth.clearAuthToken,
      windowApi: typeof window !== 'undefined' ? window.api : undefined
    };
  }
};

// Debug log the API object
console.log('API object created', {
  apiMethods: Object.keys(api),
  hasClearAuthToken: 'clearAuthToken' in api,
  clearAuthToken: typeof api.clearAuthToken,
  authModule: auth
});

// Debug log the API object
console.log('API object created', {
  apiMethods: Object.keys(api),
  hasClearAuthToken: 'clearAuthToken' in api,
  clearAuthToken: typeof api.clearAuthToken,
  authModule: auth
});

// Make the API available globally for debugging
if (typeof window !== 'undefined') {
  window.api = api;
  console.log('API attached to window.api', {
    methods: Object.keys(api),
    hasClearAuthToken: 'clearAuthToken' in api,
    clearAuthToken: typeof api.clearAuthToken
  });
}

// Re-export all modules for direct import if needed
export { auth, projects, files, templates, ai as aiService };
