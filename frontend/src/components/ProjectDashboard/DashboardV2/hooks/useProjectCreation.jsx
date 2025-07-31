import { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../../contexts/NewApiContext';
import { useFeedback } from '../../../../components/feedback/FeedbackContext.jsx';
import { v4 as uuidv4 } from 'uuid';

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
      // Simulate API call to generate project plan
      // In a real app, this would call your backend API
      const plan = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            name: `Project ${Math.floor(Math.random() * 1000)}`,
            description,
            template: 'web-app',
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
  <p>${description}</p>
  <script src="app.js"></script>
</body>
</html>` 
              },
              { 
                path: 'styles.css', 
                content: '/* Add your styles here */\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  line-height: 1.6;\n  margin: 0;\n  padding: 20px;\n  max-width: 800px;\n  margin: 0 auto;\n  color: #333;\n}\n\nh1 {\n  color: #2c3e50;\n  border-bottom: 2px solid #eee;\n  padding-bottom: 10px;\n}' 
              },
              { 
                path: 'app.js', 
                content: '// Add your JavaScript here\nconsole.log("Hello, world!");\n\n// Example function\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// Example event listener\ndocument.addEventListener("DOMContentLoaded", () => {\n  console.log("App loaded!");\n});' 
              },
              { 
                path: 'README.md', 
                content: `# ${description.split('.')[0]}\n\n## Description\n${description}\n\n## Getting Started\n\n1. Clone this repository\n2. Open index.html in your browser\n3. Start coding!\n\n## Project Structure\n\n- \`index.html\`: Main HTML file\n- \`styles.css\`: CSS styles\n- \`app.js\`: JavaScript code\n- \`README.md\`: Project documentation`
              }
            ]
          });
        }, 1500);
      });
      
      setProjectPlan(plan);
      setProjectError(null);
    } catch (err) {
      console.error('Error generating project plan:', err);
      setProjectError('Failed to generate project plan. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  }, []);
  
  // Create a new project from an AI-generated plan with comprehensive fallbacks
  const createProjectFromPlan = useCallback(async (plan) => {
    try {
      if (!plan) {
        throw new Error('No project plan provided');
      }

      const timestamp = new Date().toISOString();
      const projectData = {
        id: uuidv4(),
        name: plan.name || 'New Project',
        description: plan.description || 'A new project created with AI',
        createdAt: timestamp,
        updatedAt: timestamp,
        files: plan.files?.length ? plan.files : DEFAULT_PROJECT_STRUCTURE.files,
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        metadata: {
          ...(plan.metadata || {}),
          createdAt: timestamp,
          updatedAt: timestamp,
          source: 'ai-generated-plan',
          version: '1.0.0',
          lastOpened: timestamp
        },
        isFavorite: false,
        isLocal: false, // Will be set to true if saved locally
        lastModified: timestamp
      };

      console.log('[ProjectCreator] Creating project from plan:', projectData);
      
      // Try to save to IndexedDB first (primary offline storage)
      try {
        const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        if (indexedDB) {
          const request = indexedDB.open('CoderProjectsDB', 1);
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('projects')) {
              db.createObjectStore('projects', { keyPath: 'id' });
            }
          };
          
          await new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
              const db = event.target.result;
              const transaction = db.transaction(['projects'], 'readwrite');
              const store = transaction.objectStore('projects');
              
              // Add project to IndexedDB
              const addRequest = store.add({ ...projectData, isLocal: true });
              
              addRequest.onsuccess = () => {
                console.log('[ProjectCreator] Project saved to IndexedDB:', projectData.id);
                resolve();
              };
              
              addRequest.onerror = (e) => {
                console.warn('[ProjectCreator] Failed to save to IndexedDB:', e);
                resolve(); // Continue with fallbacks
              };
            };
            
            request.onerror = (e) => {
              console.warn('[ProjectCreator] Error opening IndexedDB:', e);
              resolve(); // Continue with fallbacks
            };
          });
        }
      } catch (indexedDBError) {
        console.warn('[ProjectCreator] Error with IndexedDB, falling back to localStorage:', indexedDBError);
      }
      
      // Try to create project via API context
      try {
        if (typeof createProjectFromContext !== 'function') {
          console.warn('[ProjectCreator] createProject is not available in API context, falling back to localStorage');
          throw new Error('API method not available');
        }
        
        console.log('[ProjectCreator] Creating project via API context with data:', projectData);
        const newProject = await createProjectFromContext(projectData);
        
        if (!newProject) {
          console.warn('[ProjectCreator] API context returned null/undefined project, falling back to localStorage');
          throw new Error('Invalid response from API context');
        }
        
        console.log('[ProjectCreator] Project created via API context:', newProject);
        showSuccessToast('Project created successfully!');
        
        // Handle navigation with fallback to local ID
        const projectId = newProject.id || projectData.id;
        if (projectId) {
          navigate(`/project/${projectId}`);
        } else {
          console.error('[ProjectCreator] No project ID available for navigation');
          throw new Error('No project ID available');
        }
        
        return newProject;
      } catch (apiError) {
        console.warn('[ProjectCreator] API project creation failed, falling back to localStorage', apiError);
        
        // Fallback to localStorage with robust error handling
        try {
          // Safely get and parse existing projects
          let existingProjects = [];
          try {
            const projectsJson = localStorage.getItem('projects');
            if (projectsJson) {
              const parsed = JSON.parse(projectsJson);
              if (Array.isArray(parsed)) {
                existingProjects = parsed;
              } else {
                console.warn('[ProjectCreator] Found non-array projects in localStorage, resetting');
                existingProjects = [];
              }
            }
          } catch (parseError) {
            console.warn('[ProjectCreator] Error parsing projects from localStorage, resetting:', parseError);
            existingProjects = [];
          }
          
          // Create updated projects array with the new project
          const updatedProjects = [...existingProjects, { ...projectData, isLocal: true }];
          
          // Save to localStorage
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
          localStorage.setItem(`project_${projectData.id}`, JSON.stringify(projectData));
          
          // Also save to sessionStorage for immediate availability
          sessionStorage.setItem(`project_${projectData.id}`, JSON.stringify(projectData));
          
          console.log('[ProjectCreator] Project saved to localStorage:', projectData.id);
          showSuccessToast('Project created (offline mode)');
          navigate(`/project/${projectData.id}`);
          return projectData;
        } catch (fallbackError) {
          console.error('[ProjectCreator] Fallback project creation failed:', fallbackError);
          throw new Error('Failed to create project. Please check your connection and try again.');
        }
      }
    } catch (error) {
      console.error('[ProjectCreator] Error in createProjectFromPlan:', error);
      showErrorToast(error.message || 'Failed to create project');
      throw error;
    }
  }, [navigate, api, showSuccessToast, showErrorToast]);
  
  // Handle project creation from template with comprehensive fallbacks
  const createProjectFromTemplate = useCallback(async (templateData) => {
    try {
      const projectId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Ensure we have valid template data with default values
      const templateName = templateData.name || 'New Project';
      const templateDescription = templateData.description || 'A new project created with Coder AI';
      
      // Create default files based on template type
      const defaultFiles = templateData.files || DEFAULT_PROJECT_STRUCTURE.files;
      
      // Process files to ensure they have proper content
      const processedFiles = defaultFiles.map(file => ({
        ...file,
        content: file.content || '' // Ensure content is never undefined
      }));
      
      const projectData = {
        id: projectId,
        name: templateName,
        description: templateDescription,
        createdAt: timestamp,
        updatedAt: timestamp,
        files: processedFiles,
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
        isLocal: false, // Will be set to true if saved locally
        lastModified: timestamp,
        template: templateData.id || 'default'
      };
      
      console.log('[ProjectCreator] Creating project with data:', projectData);
      
      console.log('[ProjectCreator] Creating project from template:', projectData);
      
      // Try to save to IndexedDB first (primary offline storage)
      try {
        const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        if (indexedDB) {
          const request = indexedDB.open('CoderProjectsDB', 1);
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('projects')) {
              db.createObjectStore('projects', { keyPath: 'id' });
            }
          };
          
          await new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
              const db = event.target.result;
              const transaction = db.transaction(['projects'], 'readwrite');
              const store = transaction.objectStore('projects');
              
              // Add project to IndexedDB
              const addRequest = store.add({ ...projectData, isLocal: true });
              
              addRequest.onsuccess = () => {
                console.log('[ProjectCreator] Project saved to IndexedDB:', projectData.id);
                resolve();
              };
              
              addRequest.onerror = (e) => {
                console.warn('[ProjectCreator] Failed to save to IndexedDB:', e);
                resolve(); // Continue with fallbacks
              };
            };
            
            request.onerror = (e) => {
              console.warn('[ProjectCreator] Error opening IndexedDB:', e);
              resolve(); // Continue with fallbacks
            };
          });
        }
      } catch (indexedDBError) {
        console.warn('[ProjectCreator] Error with IndexedDB, falling back to localStorage:', indexedDBError);
      }
      
      // Try to create project via API
      try {
        const newProject = await api.projects.createProject(projectData);
        console.log('[ProjectCreator] Project created via API:', newProject);
        showSuccessToast('Project created from template successfully!');
        navigate(`/project/${newProject.id}`);
        return newProject;
      } catch (apiError) {
        console.warn('[ProjectCreator] API project creation failed, falling back to localStorage', apiError);
        
        // Fallback to localStorage
        try {
          const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
          const updatedProjects = [...existingProjects, { ...projectData, isLocal: true }];
          
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
          localStorage.setItem(`project_${projectData.id}`, JSON.stringify(projectData));
          
          // Also save to sessionStorage for immediate availability
          sessionStorage.setItem(`project_${projectData.id}`, JSON.stringify(projectData));
          
          console.log('[ProjectCreator] Project saved to localStorage:', projectData.id);
          showSuccessToast('Project created from template (offline mode)');
          navigate(`/project/${projectData.id}`);
          return projectData;
        } catch (fallbackError) {
          console.error('[ProjectCreator] Fallback project creation failed:', fallbackError);
          throw new Error('Failed to create project from template. Please check your connection and try again.');
        }
      }
    } catch (error) {
      console.error('[ProjectCreator] Error in createProjectFromTemplate:', error);
      showErrorToast(error.message || 'Failed to create project from template');
      throw error;
    }
  }, [navigate, api, showSuccessToast, showErrorToast]);
  
  // Close project creator modal
  const closeProjectCreator = useCallback(() => {
    setShowProjectCreator(false);
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
  };
};

export default useProjectCreation;
