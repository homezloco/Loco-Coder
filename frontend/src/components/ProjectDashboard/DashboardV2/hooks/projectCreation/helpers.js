import { generateFallbackSvg } from '../../../../../services/aiService';

/**
 * Helper function to determine file language based on extension
 */
export const getFileLanguage = (filename) => {
  if (!filename) return 'text';
  
  const extension = filename.split('.').pop().toLowerCase();
  
  const languageMap = {
    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    
    // Common programming languages
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    
    // Configuration
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'env': 'shell',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'ps1': 'powershell',
    'bat': 'batch',
    'cmd': 'batch',
    
    // Data formats
    'xml': 'xml',
    'csv': 'csv',
    'sql': 'sql',
    
    // Documentation
    'txt': 'text',
    'log': 'text',
  };
  
  return languageMap[extension] || 'text';
};

/**
 * Helper function to generate README content
 */
export const generateReadmeContent = (projectName, description, projectSlug) => {
  return `# ${projectName}

## Description
${description || 'A new project created with Coder AI Platform'}

## Getting Started

### Frontend
1. Navigate to the frontend directory: \`cd frontend\`
2. Install dependencies: \`npm install\`
3. Start the development server: \`npm start\`
4. Open your browser at: \`http://localhost:3000\`

### Backend
1. Navigate to the backend directory: \`cd backend\`
2. Create a virtual environment: \`python -m venv venv\`
3. Activate the virtual environment:
   - Windows: \`venv\\Scripts\\activate\`
   - Unix/MacOS: \`source venv/bin/activate\`
4. Install dependencies: \`pip install -r requirements.txt\`
5. Start the development server: \`uvicorn app.main:app --reload\`
6. API will be available at: \`http://localhost:8000\`

## Project Structure

### Frontend (React)
- \`frontend/src/components\`: React components
- \`frontend/src/services\`: API services and utilities
- \`frontend/src/contexts\`: React contexts for state management
- \`frontend/src/hooks\`: Custom React hooks
- \`frontend/src/pages\`: Page components
- \`frontend/src/assets\`: Static assets (images, fonts, etc.)

### Backend (FastAPI)
- \`backend/app/api\`: API endpoints
- \`backend/app/core\`: Core application configuration
- \`backend/app/db\`: Database models and connections
- \`backend/app/schemas\`: Pydantic schemas for validation
- \`backend/app/services\`: Business logic services
- \`backend/app/utils\`: Utility functions

## Features
- Modern React frontend with hooks and context API
- FastAPI backend with automatic OpenAPI documentation
- PostgreSQL database with SQLAlchemy ORM
- Authentication with JWT tokens
- Docker configuration for easy deployment
- CI/CD setup with GitHub Actions

## License
MIT
`;
};

/**
 * Sanitizes an object for storage by removing circular references and non-serializable objects
 * @param {Object} obj - The object to sanitize
 * @returns {Object} - A sanitized copy of the object
 */
export const sanitizeForStorage = (obj) => {
  // If null or undefined, return as is
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // If it's a primitive type, return as is
  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return obj;
  }
  
  // Handle functions - replace with string representation
  if (typeof obj === 'function') {
    return '[Function]';
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForStorage(item));
  }
  
  // For DOM nodes, React elements, and other non-serializable objects
  if (
    // DOM nodes
    (typeof window !== 'undefined' && obj instanceof Node) ||
    // React elements and refs
    (obj.$$typeof && (
      obj.$$typeof.toString().includes('Symbol(react.element)') ||
      obj.$$typeof.toString().includes('Symbol(react.portal)')
    )) ||
    // Event objects
    (obj instanceof Event) ||
    // Native code functions or objects with native code methods
    (obj.toString && obj.toString().includes('[native code]'))
  ) {
    return '[Non-serializable object]';
  }
  
  // Use a WeakMap to track visited objects and prevent circular references
  const seen = new WeakMap();
  
  // Helper function to check if an object is serializable
  const isSerializable = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'function') return false;
    if (typeof value !== 'object') return true;
    if (value instanceof Date) return true;
    if (Array.isArray(value)) return true;
    
    // Check for DOM nodes, React elements, etc.
    if (
      (typeof window !== 'undefined' && value instanceof Node) ||
      (value.$$typeof && (
        value.$$typeof.toString().includes('Symbol(react.element)') ||
        value.$$typeof.toString().includes('Symbol(react.portal)')
      )) ||
      (value instanceof Event) ||
      (typeof value === 'function') ||
      (value.toString && value.toString().includes('[native code]'))
    ) {
      return false;
    }
    
    return true;
  };
  
  // Recursive function to sanitize nested objects
  const sanitizeObject = (obj, path = '') => {
    // If we've seen this object before, return a placeholder to avoid circular references
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }
    
    // Add this object to the seen map
    seen.set(obj, true);
    
    const result = {};
    
    // Process each property
    for (const key in obj) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          
          // Skip React internal properties that start with '_' or '__'
          if (key.startsWith('_') || key.startsWith('__')) {
            continue;
          }
          
          // Skip functions, DOM nodes, and other non-serializable objects
          if (typeof value === 'function') {
            result[key] = '[Function]';
            continue;
          }
          
          if (value && typeof value === 'object' && value.toString && value.toString().includes('[native code]')) {
            result[key] = '[Native Object]';
            continue;
          }
          
          if (!isSerializable(value)) {
            continue;
          }
          
          // Recursively sanitize objects
          if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            result[key] = sanitizeObject(value, `${path}.${key}`);
          } else {
            result[key] = value;
          }
        }
      } catch (error) {
        // If accessing a property throws an error (e.g., permission issues),
        // skip it and continue with other properties
        console.warn(`[sanitizeForStorage] Error accessing property ${key}:`, error.message);
        result[key] = '[Error: Property access failed]';
      }
    }
    
    return result;
  };
  
  try {
    return sanitizeObject(obj);
  } catch (error) {
    console.error('[sanitizeForStorage] Failed to sanitize object:', error);
    // Return a simplified object with basic info if sanitization fails completely
    return { 
      error: 'Failed to sanitize object for storage',
      message: error.message,
      objectType: typeof obj
    };
  }
};

/**
 * Prepare project data for storage by ensuring all required fields are present
 * @param {Object} projectData - Project data to prepare
 * @returns {Object} - Prepared project data
 */
export const prepareDataForStorage = (projectData) => {
  // Ensure we have all required fields
  const timestamp = new Date().toISOString();
  
  // Generate a unique ID if one doesn't exist
  const id = projectData.id || `project_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  // Create a new object with all required fields
  const preparedData = {
    ...projectData,
    id, // Ensure ID is explicitly set at the top level
    createdAt: projectData.createdAt || timestamp,
    updatedAt: timestamp,
    metadata: {
      ...(projectData.metadata || {}),
      lastOpened: timestamp,
      updatedAt: timestamp
    },
    isLocal: true,
    lastModified: timestamp
  };
  
  // Log the prepared data for debugging
  console.log('[ProjectCreator] Prepared data for storage:', {
    id: preparedData.id,
    name: preparedData.name || 'Unnamed Project',
    hasId: Boolean(preparedData.id)
  });
  
  return preparedData;
};

/**
 * Save project data to IndexedDB
 * @param {Object} projectData - Project data to save
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const saveToIndexedDB = async (projectData) => {
  try {
    console.log('[ProjectCreator] Saving project to IndexedDB:', projectData.id);
    
    // Sanitize the project data before saving
    const sanitizedData = sanitizeForStorage(projectData);
    
    return new Promise((resolve, reject) => {
      // Open a connection to the IndexedDB database
      const request = indexedDB.open('coder-projects-db', 1);
      
      // Handle database upgrade (first time or version change)
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create an object store if it doesn't exist
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };
      
      // Handle database open success
      request.onsuccess = (event) => {
        try {
          const db = event.target.result;
          const transaction = db.transaction(['projects'], 'readwrite');
          const store = transaction.objectStore('projects');
          
          // Add or update the project in the store
          const addRequest = store.put(sanitizedData);
          
          addRequest.onsuccess = () => {
            console.log('[ProjectCreator] Project saved to IndexedDB successfully');
            resolve(true);
          };
          
          addRequest.onerror = (error) => {
            console.error('[ProjectCreator] IndexedDB add request error:', error);
            reject(error);
          };
          
          // Handle transaction completion
          transaction.oncomplete = () => {
            db.close();
          };
          
          // Handle transaction error
          transaction.onerror = (error) => {
            console.error('[ProjectCreator] IndexedDB transaction error:', error);
            reject(error);
          };
        } catch (error) {
          console.error('[ProjectCreator] IndexedDB transaction error:', error);
          reject(error);
        }
      };
      
      // Handle database open error
      request.onerror = (error) => {
        console.error('[ProjectCreator] IndexedDB open error:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('[ProjectCreator] IndexedDB save error:', error);
    return false;
  }
};

/**
 * Save project data to localStorage
 * @param {Object} projectData - Project data to save
 * @returns {boolean} - True if successful, false otherwise
 */
export const saveToLocalStorage = (projectData) => {
  try {
    console.log('[ProjectCreator] Saving project to localStorage:', projectData.id);
    
    // Sanitize the project data before saving
    const sanitizedData = sanitizeForStorage(projectData);
    
    // Get existing projects from localStorage
    const existingProjectsString = localStorage.getItem('projects');
    const existingProjects = existingProjectsString ? JSON.parse(existingProjectsString) : [];
    
    // Find the index of the project if it already exists
    const projectIndex = existingProjects.findIndex(p => p.id === projectData.id);
    
    if (projectIndex !== -1) {
      // Update existing project
      existingProjects[projectIndex] = sanitizedData;
    } else {
      // Add new project
      existingProjects.push(sanitizedData);
    }
    
    // Save updated projects back to localStorage
    localStorage.setItem('projects', JSON.stringify(existingProjects));
    
    console.log('[ProjectCreator] Project saved to localStorage successfully');
    return true;
  } catch (error) {
    console.error('[ProjectCreator] Failed to save to localStorage:', error);
    return false;
  }
};

// Default project structure for fallback
export const DEFAULT_PROJECT_STRUCTURE = {
  files: [
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html>
<head>
  <title>New Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Welcome to your new project!</h1>
  <div id="app">
    <p>Start building your amazing project here!</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`
    },
    {
      path: 'styles.css',
      content: `/* Add your styles here */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #333;
  background-color: #fff;
}

h1 {
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}`
    },
    {
      path: 'app.js',
      content: `// Add your JavaScript here
console.log("Hello, world!");

// Example function
function greet(name) {
  return \`Hello, \${name}!\`;
}

// Example event listener
document.addEventListener("DOMContentLoaded", () => {
  console.log("App loaded!");
});`
    },
    {
      path: 'README.md',
      content: `# New Project

## Description
A new project created with Coder AI Platform

## Getting Started

1. Clone this repository
2. Open index.html in your browser
3. Start coding!

## Project Structure

- \`index.html\`: Main HTML file
- \`styles.css\`: CSS styles
- \`app.js\`: JavaScript code
- \`README.md\`: Project documentation`
    }
  ]
};
