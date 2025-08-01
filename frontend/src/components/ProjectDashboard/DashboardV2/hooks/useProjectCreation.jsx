import { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../../contexts/NewApiContext';
import { useFeedback } from '../../../../components/feedback/FeedbackContext.jsx';
import { v4 as uuidv4 } from 'uuid';
import { TOKEN_KEYS } from '../../../../services/api/config';

// Helper function to determine file language based on extension
const getFileLanguage = (filename) => {
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

// Default project structure for fallback
const DEFAULT_PROJECT_STRUCTURE = {
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

/**
 * Custom hook to manage project creation state and logic
 */
const useProjectCreation = () => {
  const navigate = useNavigate();
  const { createProject: createProjectFromContext } = useApi();
  const { showSuccessToast, showErrorToast } = useFeedback();
  
  // State for project creation modals
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [showProjectDescriptionModal, setShowProjectDescriptionModal] = useState(false);
  const [showPlanReview, setShowPlanReview] = useState(false);
  
  // Project creation state
  const [projectDescription, setProjectDescription] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [projectPlan, setProjectPlan] = useState(null);
  const [projectError, setProjectError] = useState(null);
  
  // Start new project flow
  const startNewProject = useCallback((useWizard = true) => {
    if (useWizard) {
      setShowProjectDescriptionModal(true);
    } else {
      setShowProjectCreator(true);
    }
    setProjectDescription('');
    setProjectError(null);
  }, []);
  
  // Close project description modal
  const closeProjectDescription = useCallback(() => {
    setShowProjectDescriptionModal(false);
    setProjectDescription('');
    setProjectError(null);
  }, []);
  
  // Close project plan review
  const closeProjectPlan = useCallback(() => {
    setShowPlanReview(false);
    setProjectPlan(null);
    setProjectError(null);
  }, []);
  
  // Handle project description submission
  const handleProjectDescriptionSubmit = useCallback(async (description) => {
    setProjectDescription(description);
    setShowProjectDescriptionModal(false);
    setShowPlanReview(true);
    setIsGeneratingPlan(true);
    setProjectError(null);
    
    try {
      // Generate a basic project structure based on the description
      const projectName = description.split('.')[0] || 'New Project';
      const projectSlug = projectName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      
      // Create a more comprehensive plan with metadata
      const plan = {
        id: `plan_${Date.now()}`,
        name: projectName,
        description,
        template: 'web-app',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          template: 'web-app',
          features: ['responsive', 'modern', 'clean']
        },
        structure: {
          directories: [
            { name: 'src', type: 'directory' },
            { name: 'public', type: 'directory' },
            { name: 'assets', type: 'directory' }
          ],
          files: [
            { 
              path: 'index.html',
              type: 'file',
              language: 'html',
              content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <meta name="description" content="${description}">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>${projectName}</h1>
      <p class="subtitle">${description}</p>
    </header>
    
    <main>
      <section class="features">
        <h2>Features</h2>
        <ul>
          <li>Modern, responsive design</li>
          <li>Clean and semantic HTML5</li>
          <li>Easy to customize</li>
        </ul>
      </section>
    </main>
    
    <footer>
      <p>Created with ❤️ using Coder AI</p>
    </footer>
  </div>
  
  <script src="app.js"></script>
</body>
</html>`
            },
            {
              path: 'styles.css',
              type: 'file',
              language: 'css',
              content: `/* Global Styles */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --text-color: #333;
  --background: #f9f9f9;
  --card-bg: #ffffff;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background);
  padding: 2rem 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  margin-bottom: 1rem;
  line-height: 1.2;
  color: var(--primary-color);
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

p {
  margin-bottom: 1rem;
}

a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--secondary-color);
}

/* Layout */
header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
  border-bottom: 1px solid #eee;
}

.subtitle {
  font-size: 1.2rem;
  color: #666;
  max-width: 800px;
  margin: 0 auto;
}

/* Features Section */
.features {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
}

.features h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--secondary-color);
}

.features ul {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.features li {
  background: rgba(46, 204, 113, 0.1);
  padding: 1.5rem;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.features li:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* Footer */
footer {
  text-align: center;
  margin-top: 4rem;
  padding: 2rem 0;
  border-top: 1px solid #eee;
  color: #777;
  font-size: 0.9rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  body {
    padding: 1rem 0.5rem;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .features ul {
    grid-template-columns: 1fr;
  }
}`
            },
            {
              path: 'app.js',
              type: 'file',
              language: 'javascript',
              content: `/**
 * ${projectName}
 * ${description}
 */

// DOM Elements
const app = {
  init() {
    console.log('App initialized');
    this.cacheElements();
    this.bindEvents();
    this.checkFeatures();
  },
  
  cacheElements() {
    // Cache frequently used DOM elements
    this.elements = {
      body: document.body,
      // Add more elements as needed
    };
  },
  
  bindEvents() {
    // Add event listeners here
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM fully loaded');
      this.onReady();
    });
    
    window.addEventListener('resize', this.debounce(() => {
      this.onResize();
    }, 250));
  },
  
  // Utility function to debounce events
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Check browser features
  checkFeatures() {
    // Example feature detection
    if (!('querySelector' in document)) {
      console.warn('This browser does not support document.querySelector');
    }
  },
  
  // Called when the DOM is ready
  onReady() {
    console.log('App is ready!');
    // Initialize components here
  },
  
  // Handle window resize
  onResize() {
    console.log('Window resized');
    // Handle responsive behavior here
  },
  
  // Example method
  greet(name = 'World') {
    console.log(\`Hello, \${name}!\`);
    return \`Hello, \${name}!\`;
  }
};

// Initialize the app
app.init();

// Make app available globally for debugging
window.app = app;`
            },
            {
              path: 'README.md',
              type: 'file',
              language: 'markdown',
              content: `# ${projectName}

${description}

## Features

- **Modern & Responsive**: Looks great on all devices
- **Clean Code**: Well-structured and documented
- **Fast & Lightweight**: Optimized for performance
- **Easy to Customize**: Modify to fit your needs

## Getting Started

1. Clone this repository
2. Open \`index.html\` in your browser
3. Start coding!

## Project Structure

\`\`\`
${projectSlug}/
├── index.html          # Main HTML file
├── styles.css          # Main styles
├── app.js              # JavaScript code
└── README.md           # This file
\`\`\`

## Customization

- Update colors in \`styles.css\` by modifying the CSS variables in the \`:root\` selector
- Add your own content in \`index.html\`
- Extend functionality in \`app.js\`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the [MIT License](LICENSE).`
            },
            {
              path: '.gitignore',
              type: 'file',
              language: 'gitignore',
              content: `# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/*
!.vscode/extensions.json
.idea

# Local development
.env
`
            }
          ]
        }
      };
      
      // Set the plan in state
      setProjectPlan(plan);
      setProjectError(null);
      
      // Log the generated plan for debugging
      console.log('Generated project plan:', plan);
      
      return plan;
    } catch (err) {
      console.error('Error generating project plan:', err);
      setProjectError('Failed to generate project plan. Please try again.');
      throw err; // Re-throw to allow error handling in the component
    } finally {
      setIsGeneratingPlan(false);
    }
  }, []);
  
  // Helper function to ensure data is serializable for storage
  const prepareForStorage = (data, visited = new WeakSet()) => {
    // Handle primitive values and functions
    if (data === null || typeof data !== 'object') {
      return data;
    }

    // Handle circular references
    if (visited.has(data)) {
      return { _type: 'CircularReference' };
    }

    // Add current object to visited set
    visited.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => prepareForStorage(item, visited));
    }

    // Handle built-in objects
    if (data instanceof Date) {
      return { _type: 'Date', iso: data.toISOString() };
    }

    if (data instanceof Map) {
      return { 
        _type: 'Map',
        value: Array.from(data.entries()).map(([k, v]) => 
          [prepareForStorage(k, visited), prepareForStorage(v, visited)]
        )
      };
    }

    if (data instanceof Set) {
      return { 
        _type: 'Set',
        value: Array.from(data).map(item => prepareForStorage(item, visited))
      };
    }

    if (data instanceof RegExp) {
      return {
        _type: 'RegExp',
        source: data.source,
        flags: data.flags
      };
    }

    // Handle Blob and File objects
    if (data instanceof Blob || data instanceof File) {
      return {
        _type: 'Blob',
        name: data.name || 'blob',
        type: data.type,
        size: data.size,
        lastModified: data.lastModified
      };
    }

    // Handle class instances
    if (data.constructor && data.constructor !== Object) {
      const result = {
        _type: 'Instance',
        className: data.constructor.name,
        data: {}
      };
      
      // Only include own, enumerable properties that are not functions
      for (const key of Object.keys(data)) {
        try {
          const value = data[key];
          // Skip functions and undefined values
          if (typeof value === 'function' || value === undefined) {
            continue;
          }
          result.data[key] = prepareForStorage(value, visited);
        } catch (error) {
          console.warn(`[ProjectCreator] Error processing instance property '${key}':`, error);
          continue;
        }
      }
      return result;
    }

    // Handle plain objects
    if (Object.getPrototypeOf(data) === Object.prototype) {
      const result = {};
      for (const key in data) {
        // Skip non-own properties
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          continue;
        }
        
        const value = data[key];
        
        // Skip functions and undefined values
        if (typeof value === 'function' || value === undefined) {
          continue;
        }
        
        // Skip DOM elements and event objects
        if (
          value instanceof Event ||
          value instanceof Node ||
          (typeof window !== 'undefined' && window.HTMLElement && value instanceof HTMLElement)
        ) {
          continue;
        }
        
        try {
          result[key] = prepareForStorage(value, visited);
        } catch (error) {
          console.warn(`[ProjectCreator] Error processing property '${key}':`, error);
          continue;
        }
      }
      return result;
    }

    // For other object types, try to extract serializable properties
    try {
      // If the object has a toJSON method, use it
      if (typeof data.toJSON === 'function') {
        return prepareForStorage(data.toJSON(), visited);
      }
      
      // Otherwise, try to extract own properties
      const result = {
        _type: 'Object',
        className: data.constructor?.name || 'Object',
        data: {}
      };
      
      for (const key of Object.getOwnPropertyNames(data)) {
        // Skip constructor and prototype properties
        if (key === 'constructor' || key === 'prototype') {
          continue;
        }
        
        try {
          const value = data[key];
          // Skip functions and undefined values
          if (typeof value === 'function' || value === undefined) {
            continue;
          }
          result.data[key] = prepareForStorage(value, visited);
        } catch (error) {
          console.warn(`[ProjectCreator] Error processing property '${key}' of ${data.constructor.name}:`, error);
          // Skip problematic properties
          continue;
        }
      }
      return result;
    } catch (error) {
      console.error('[ProjectCreator] Error processing object:', error);
      // Return a minimal representation instead of an error string
      return {
        _type: data.constructor?.name || 'Object',
        _error: 'Could not fully serialize object'
      };
    }
  };

  // Helper function to save to IndexedDB with retry logic
  const saveToIndexedDB = async (data, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    try {
      const indexedDB = window.indexedDB || 
                       window.mozIndexedDB || 
                       window.webkitIndexedDB || 
                       window.msIndexedDB;
      
      if (!indexedDB) {
        console.warn('[ProjectCreator] IndexedDB not supported');
        return false;
      }
      
      return await new Promise((resolve, reject) => {
        const request = indexedDB.open('CoderProjectsDB', 1);
        
        request.onerror = (event) => {
          console.error('[ProjectCreator] IndexedDB error:', event.target.error);
          if (retryCount < MAX_RETRIES) {
            console.log(`[ProjectCreator] Retrying IndexedDB operation (${retryCount + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
              saveToIndexedDB(data, retryCount + 1).then(resolve).catch(reject);
            }, RETRY_DELAY * (retryCount + 1));
          } else {
            reject(new Error('Failed to access IndexedDB after multiple attempts'));
          }
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('projects')) {
            try {
              db.createObjectStore('projects', { keyPath: 'id' });
              console.log('[ProjectCreator] Created projects object store');
            } catch (error) {
              console.error('[ProjectCreator] Error creating object store:', error);
              event.target.transaction.abort();
              throw error;
            }
          }
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          
          // Start a new transaction
          const transaction = db.transaction(['projects'], 'readwrite');
          const store = transaction.objectStore('projects');
          
          // Prepare the data for storage
          let projectData;
          try {
            projectData = prepareForStorage({
              ...data,
              isLocal: true,
              updatedAt: new Date().toISOString()
            });
          } catch (error) {
            console.error('[ProjectCreator] Error preparing data for storage:', error);
            reject(new Error('Failed to prepare project data for storage'));
            return;
          }
          
          // Save the data
          const saveRequest = store.put(projectData);
          
          saveRequest.onsuccess = () => {
            console.log('[ProjectCreator] Project saved to IndexedDB:', data.id);
            resolve(true);
          };
          
          saveRequest.onerror = (event) => {
            const error = event.target.error;
            console.error('[ProjectCreator] Error saving to IndexedDB:', error);
            
            if (retryCount < MAX_RETRIES) {
              console.log(`[ProjectCreator] Retrying save operation (${retryCount + 1}/${MAX_RETRIES})...`);
              setTimeout(() => {
                saveToIndexedDB(data, retryCount + 1).then(resolve).catch(reject);
              }, RETRY_DELAY * (retryCount + 1));
            } else {
              reject(new Error(`Failed to save project after ${MAX_RETRIES} attempts: ${error?.message || 'Unknown error'}`));
            }
          };
          
          // Handle transaction completion
          transaction.oncomplete = () => {
            console.log('[ProjectCreator] Transaction completed');
          };
          
          transaction.onerror = (event) => {
            console.error('[ProjectCreator] Transaction error:', event.target.error);
          };
          
          transaction.onabort = (event) => {
            console.error('[ProjectCreator] Transaction aborted:', event.target.error);
            reject(new Error('Transaction was aborted'));
          };
        };
        
        request.onblocked = (event) => {
          console.error('[ProjectCreator] Database access blocked:', event);
          reject(new Error('Database access blocked. Please close other tabs with this app open.'));
        };
      });
    } catch (error) {
      console.error('[ProjectCreator] Unexpected error in saveToIndexedDB:', error);
      throw error; // Re-throw to allow retry logic to work
    }
  };
  
  // Helper function to save to localStorage with efficient storage management
  const saveToLocalStorage = async (data, retryCount = 0) => {
    const PROJECTS_INDEX_KEY = 'projects_index';
    const MAX_PROJECTS = 50; // Maximum number of projects to store
    const MAX_RETRIES = 2;
    
    // Skip if running in a non-browser environment
    if (typeof window === 'undefined' || !localStorage) {
      console.warn('[ProjectCreator] localStorage not available in this environment');
      return false;
    }

    // Skip if no data or no ID
    if (!data || !data.id) {
      console.warn('[ProjectCreator] Cannot save project: missing ID or data');
      return false;
    }

    try {
      // Prepare project data for storage - only store essential data
      const projectToSave = {
        id: data.id,
        name: data.name || 'Untitled Project',
        description: data.description || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocal: true,
        // Store minimal file metadata only - not the full content
        fileCount: data.files ? data.files.length : 0,
        lastModified: new Date().toISOString()
      };

      try {
        // 1. Get the current projects index
        let projectsIndex = [];
        try {
          const storedIndex = localStorage.getItem(PROJECTS_INDEX_KEY);
          if (storedIndex) {
            projectsIndex = JSON.parse(storedIndex);
            if (!Array.isArray(projectsIndex)) {
              console.warn('[ProjectCreator] Invalid projects index, resetting');
              projectsIndex = [];
            }
          }
        } catch (e) {
          console.error('[ProjectCreator] Error parsing projects index:', e);
          projectsIndex = [];
        }

        // 2. Update the index with the current project
        const existingIndex = projectsIndex.findIndex(p => p.id === data.id);
        if (existingIndex >= 0) {
          projectsIndex[existingIndex] = { id: data.id, updatedAt: projectToSave.updatedAt };
        } else {
          projectsIndex.push({ id: data.id, updatedAt: projectToSave.updatedAt });
        }

        // 3. Sort by last updated (newest first) and limit the number of projects
        projectsIndex.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        // 4. If we have too many projects, remove the oldest ones
        if (projectsIndex.length > MAX_PROJECTS) {
          const removedProjects = projectsIndex.splice(MAX_PROJECTS);
          // Clean up the storage for removed projects
          removedProjects.forEach(project => {
            try {
              localStorage.removeItem(`project_${project.id}`);
              sessionStorage.removeItem(`project_${project.id}`);
            } catch (e) {
              console.warn(`[ProjectCreator] Error cleaning up project ${project.id}:`, e);
            }
          });
        }

        // 5. Save the project data with a compressed key
        const projectKey = `p_${data.id}`; // Shorter key to save space
        try {
          localStorage.setItem(projectKey, JSON.stringify(projectToSave));
          // Only save minimal data to sessionStorage
          sessionStorage.setItem(projectKey, JSON.stringify({
            id: data.id,
            name: projectToSave.name,
            updatedAt: projectToSave.updatedAt
          }));
        } catch (e) {
          if (e.name === 'QuotaExceededError' && retryCount < MAX_RETRIES) {
            console.log(`[ProjectCreator] Storage full, cleaning up and retrying (${retryCount + 1}/${MAX_RETRIES})`);
            // Remove some old projects and try again
            if (projectsIndex.length > 5) {
              const toRemove = projectsIndex.splice(-5); // Remove 5 oldest projects
              toRemove.forEach(project => {
                try {
                  localStorage.removeItem(`p_${project.id}`);
                  sessionStorage.removeItem(`p_${project.id}`);
                } catch (cleanupError) {
                  console.warn(`[ProjectCreator] Error during cleanup:`, cleanupError);
                }
              });
              // Update the index and try again
              localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(projectsIndex));
              return saveToLocalStorage(data, retryCount + 1);
            }
          }
          throw e; // Re-throw if we can't handle it
        }

        // 6. Save the updated index
        localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(projectsIndex));
        
        console.log(`[ProjectCreator] Project ${data.id} saved successfully`);
        return true;

      } catch (storageError) {
        console.error('[ProjectCreator] Storage error:', storageError);
        
        // Last resort: save minimal data with a different key pattern
        if (retryCount === 0) {
          console.log('[ProjectCreator] Attempting minimal save...');
          try {
            const minimalKey = `m_${Date.now()}_${data.id.substring(0, 8)}`;
            const minimalData = {
              id: data.id,
              name: data.name || 'Untitled Project',
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem(minimalKey, JSON.stringify(minimalData));
            console.warn('[ProjectCreator] Saved minimal project data');
            return true;
          } catch (minimalError) {
            console.error('[ProjectCreator] Minimal save failed:', minimalError);
          }
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('[ProjectCreator] Critical error in saveToLocalStorage:', error);
      return false;
    }
  };

  // Create a new project from an AI-generated plan with comprehensive error handling and fallbacks
  const createProjectFromPlan = useCallback(async (plan) => {
    if (!plan) {
      const error = new Error('No project plan provided');
      console.error('[ProjectCreator] Error in createProjectFromPlan:', error);
      showErrorToast('Failed to create project: No project plan provided');
      throw error;
    }

    try {
      console.log('[ProjectCreator] Creating project from plan:', plan);
      
      // Generate a project ID if not provided
      const projectId = plan.id || `project_${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Process files from the plan
      const processedFiles = (plan.files || []).map(file => ({
        path: file.path || `file_${Date.now()}.txt`,
        content: file.content || '',
        language: file.language || getFileLanguage(file.path),
        isOpen: false,
        isModified: false
      }));
      
      // Create project data structure with defaults
      const projectData = {
        id: projectId,
        name: plan.name || 'New Project',
        description: plan.description || 'A new project created with AI',
        createdAt: timestamp,
        updatedAt: timestamp,
        files: processedFiles.length ? processedFiles : DEFAULT_PROJECT_STRUCTURE.files,
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        // Include the full plan in the project data
        plan: {
          ...plan,
          // Ensure we don't store circular references
          files: undefined, // Remove files from plan since they're already in the root
          metadata: undefined // Remove metadata from plan to avoid duplication
        },
        metadata: {
          ...(plan.metadata || {}),
          createdAt: timestamp,
          updatedAt: timestamp,
          source: 'ai-generated-plan',
          version: '1.0.0',
          lastOpened: timestamp,
          hasPlan: true, // Flag to indicate this project has a plan
          planGeneratedAt: timestamp
        },
        isFavorite: false,
        isLocal: false, // Will be updated based on storage method
        lastModified: timestamp
      };

      // Try to create project via API if authenticated
      try {
        const token = await api.getAuthToken();
        if (token && typeof createProjectFromContext === 'function') {
          console.log('[ProjectCreator] Attempting to create project via API');
          const newProject = await createProjectFromContext(projectData);
          
          if (newProject?.id) {
            console.log('[ProjectCreator] Project created via API:', newProject.id);
            
            // Save a local copy as well
            const localProject = { ...projectData, id: newProject.id, isLocal: false };
            await saveToIndexedDB(localProject);
            saveToLocalStorage(localProject);
            
            showSuccessToast('Project created successfully!');
            navigate(`/project/${newProject.id}`);
            return newProject;
          }
        }
      } catch (apiError) {
        console.warn('[ProjectCreator] API project creation failed, falling back to local storage', apiError);
      }
      
      // If we get here, either the API call failed or we're not authenticated
      // Save to IndexedDB first (preferred offline storage)
      const savedToIndexedDB = await saveToIndexedDB(projectData);
      
      // Then save to localStorage as fallback
      const savedToLocal = saveToLocalStorage(projectData);
      
      if (savedToIndexedDB || savedToLocal) {
        const message = !navigator.onLine ? ' (offline mode)' : ' (local storage)';
        showSuccessToast(`Project created${message}`);
        navigate(`/project/${projectData.id}`);
        return { ...projectData, isLocal: true };
      }
      
      // If all storage methods failed
      throw new Error('Failed to save project. Please check your storage permissions.');
    } catch (error) {
      console.error('[ProjectCreator] Error creating project:', error);
      showErrorToast(`Failed to create project: ${error.message}`);
      throw error;
    }
  }, [api, createProjectFromContext, navigate, showErrorToast, showSuccessToast]);

  // Function to create a project from a template
  const createProjectFromTemplate = useCallback(async (templateData) => {
    if (!templateData) {
      const error = new Error('No template data provided');
      console.error('[ProjectCreator] Error in createProjectFromTemplate:', error);
      showErrorToast('Failed to create project: No template data provided');
      throw error;
    }

    try {
      console.log('[ProjectCreator] Creating project from template:', templateData);
      
      // Generate a project ID
      const projectId = `project_${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Create project data from template
      const projectData = {
        id: projectId,
        name: templateData.name || 'New Project',
        description: templateData.description || 'A new project created from template',
        createdAt: timestamp,
        updatedAt: timestamp,
        files: templateData.files || DEFAULT_PROJECT_STRUCTURE.files,
        tags: Array.isArray(templateData.tags) ? templateData.tags : [],
        metadata: {
          ...(templateData.metadata || {}),
          createdAt: timestamp,
          updatedAt: timestamp,
          source: 'template',
          template: templateData.id || 'default',
          version: '1.0.0',
          lastOpened: timestamp,
          type: templateData.category || 'web'
        },
        isFavorite: false,
        isLocal: true,
        lastModified: timestamp
      };

      console.log('[ProjectCreator] Created project from template:', projectData);
      
      // Save the project using our main creation function
      return await createProjectFromPlan(projectData);
    } catch (error) {
      console.error('[ProjectCreator] Error creating project from template:', error);
      showErrorToast(`Failed to create project from template: ${error.message}`);
      throw error;
    }
  }, [createProjectFromPlan, showErrorToast]);

  // Close project creator modal
  const closeProjectCreator = useCallback(() => {
    setShowProjectCreator(false);
  }, []);
  
  // Reset all project creation state
  const resetProjectState = useCallback(() => {
    setShowProjectCreator(false);
    setShowProjectDescriptionModal(false);
    setShowPlanReview(false);
    setProjectDescription('');
    setProjectPlan(null);
    setProjectError(null);
    setIsGeneratingPlan(false);
  }, []);
  
  return {
    // State
    showProjectCreator,
    showProjectDescriptionModal,
    showPlanReview,
    projectDescription,
    isGeneratingPlan,
    projectPlan,
    projectError,
    
    // Actions
    startNewProject,
    closeProjectDescription,
    closeProjectPlan,
    handleProjectDescriptionSubmit,
    createProjectFromPlan,
    createProjectFromTemplate,
    closeProjectCreator,
    resetProjectState
  };
};

export default useProjectCreation;
