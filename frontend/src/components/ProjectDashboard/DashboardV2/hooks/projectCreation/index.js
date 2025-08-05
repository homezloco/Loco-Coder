import { useState, useCallback } from 'react';
import { useApi } from '../../../../../contexts/NewApiContext';
import { useFeedback } from '../../../../../components/feedback/FeedbackContext.jsx';
import { v4 as uuidv4 } from 'uuid';
import { TOKEN_KEYS } from '../../../../../services/api/config';
import { generateFallbackSvg } from '../../../../../services/aiService';

// Import helpers and templates
import { 
  DEFAULT_PROJECT_STRUCTURE, 
  getFileLanguage, 
  generateReadmeContent, 
  prepareDataForStorage,
  saveToIndexedDB,
  saveToLocalStorage
} from './helpers';

import { additionalFiles, getHtmlTemplate } from './templates';
import { getCssTemplate, getJsTemplate, getBackendFiles, getDockerFiles, getGitHubWorkflowFiles } from './moreTemplates';

/**
 * Custom hook to manage project creation state and logic
 */
const useProjectCreation = () => {
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
    
    try {
      // Generate a project name from the description
      const projectName = description.split(' ')
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const projectSlug = projectName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      
      // Generate the project plan
      const plan = {
        id: `plan_${Date.now()}`,
        name: projectName,
        description,
        template: 'fullstack-app',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          generatedBy: 'ai',
          aiModel: 'gpt-4',
          prompt: description,
          stack: {
            frontend: 'react',
            backend: 'python-fastapi',
            database: 'postgres',
            deployment: 'docker'
          }
        },
        structure: {
          directories: [
            // Frontend structure
            { name: 'frontend', type: 'directory' },
            { name: 'frontend/src', type: 'directory' },
            { name: 'frontend/src/components', type: 'directory' },
            { name: 'frontend/src/services', type: 'directory' },
            { name: 'frontend/src/hooks', type: 'directory' },
            { name: 'frontend/src/contexts', type: 'directory' },
            { name: 'frontend/src/pages', type: 'directory' },
            { name: 'frontend/src/assets', type: 'directory' },
            { name: 'frontend/src/utils', type: 'directory' },
            { name: 'frontend/public', type: 'directory' },
            { name: 'frontend/public/assets', type: 'directory' },
            
            // Backend structure
            { name: 'backend', type: 'directory' },
            { name: 'backend/app', type: 'directory' },
            { name: 'backend/app/api', type: 'directory' },
            { name: 'backend/app/api/api_v1', type: 'directory' },
            { name: 'backend/app/api/api_v1/endpoints', type: 'directory' },
            { name: 'backend/app/core', type: 'directory' },
            { name: 'backend/app/db', type: 'directory' },
            { name: 'backend/app/schemas', type: 'directory' },
            { name: 'backend/app/services', type: 'directory' },
            { name: 'backend/app/utils', type: 'directory' },
            { name: 'backend/tests', type: 'directory' },
            
            // Shared resources
            { name: 'docs', type: 'directory' },
            { name: '.github', type: 'directory' },
            { name: '.github/workflows', type: 'directory' }
          ],
          files: [
            // Frontend configuration files
            {
              path: 'frontend/package.json',
              type: 'file',
              language: 'json',
              content: `{
  "name": "${projectSlug}-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "axios": "^1.3.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.9.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`
            },
            {
              path: 'frontend/.env',
              type: 'file',
              language: 'text',
              content: `REACT_APP_API_URL=http://localhost:8000
REACT_APP_VERSION=$npm_package_version
`
            },
            {
              path: 'frontend/.gitignore',
              type: 'file',
              language: 'gitignore',
              content: `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
`
            },
            // Backend configuration files
            {
              path: 'backend/.env',
              type: 'file',
              language: 'text',
              content: `# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=${projectSlug.replace(/-/g, '_')}_db

# Security
SECRET_KEY=changethissecretkey

# CORS
CORS_ORIGINS=http://localhost:3000
`
            },
            {
              path: 'backend/.gitignore',
              type: 'file',
              language: 'gitignore',
              content: `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
*.egg-info/
.installed.cfg
*.egg

# Unit test / coverage reports
htmlcov/
.tox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Database
*.db
*.sqlite3
`
            },
            // Root files
            {
              path: 'README.md',
              type: 'file',
              language: 'markdown',
              content: generateReadmeContent(projectName, description, projectSlug)
            }
          ]
        }
      };
      
      // Add additional files to the plan
      // Get all template files
      const allTemplateFiles = [
        ...additionalFiles,
        {
          path: 'index.html',
          type: 'file',
          language: 'html',
          content: getHtmlTemplate(projectName, description)
        },
        {
          path: 'frontend/public/assets/styles.css',
          type: 'file',
          language: 'css',
          content: getCssTemplate()
        },
        {
          path: 'frontend/public/assets/app.js',
          type: 'file',
          language: 'javascript',
          content: getJsTemplate(projectName)
        },
        ...getBackendFiles(),
        ...getDockerFiles(),
        ...getGitHubWorkflowFiles()
      ];
      
      // Add all template files to the plan
      plan.structure.files = [...plan.structure.files, ...allTemplateFiles];
      
      // Generate a logo for the project
      try {
        const logoSvg = await generateFallbackSvg(projectName);
        if (logoSvg) {
          plan.structure.files.push({
            path: 'frontend/public/assets/logo.svg',
            type: 'file',
            language: 'svg',
            content: logoSvg
          });
        }
      } catch (logoError) {
        console.warn('Failed to generate logo:', logoError);
      }
      
      setProjectPlan(plan);
      setIsGeneratingPlan(false);
    } catch (error) {
      console.error('Error generating project plan:', error);
      setProjectError(error.message || 'Failed to generate project plan');
      setIsGeneratingPlan(false);
    }
  }, []);
  
  // Function to create a project from a plan
  const createProjectFromPlan = useCallback(async (planData) => {
    if (!planData) {
      const error = new Error('No plan data provided');
      console.error('[ProjectCreator] Error in createProjectFromPlan:', error);
      showErrorToast('Failed to create project: No plan data provided');
      throw error;
    }
    
    try {
      console.log('[ProjectCreator] Creating project from plan:', planData);
      
      // Ensure the plan data has an ID
      if (!planData.id) {
        planData.id = `project_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        console.log('[ProjectCreator] Generated new project ID:', planData.id);
      }
      
      // Prepare project data for storage
      const projectData = prepareDataForStorage(planData);
      
      // Double-check that ID is present after preparation
      if (!projectData.id) {
        projectData.id = planData.id || `project_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        console.log('[ProjectCreator] Restored project ID after preparation:', projectData.id);
      }
      
      // Try to create project via API if authenticated
      const api = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      
      if (api && navigator.onLine) {
        try {
          const apiProject = await createProjectFromContext(projectData);
          
          if (apiProject && apiProject.id) {
            showSuccessToast('Project created successfully');
            console.log('[ProjectCreator] Navigating to project:', apiProject.id);
            window.location.href = `/project/${apiProject.id}`;
            return apiProject;
          }
        } catch (apiError) {
          console.warn('[ProjectCreator] API project creation failed, falling back to local storage', apiError);
        }
      }
      
      // If we get here, either the API call failed or we're not authenticated
      // Log the project data before saving to storage
      console.log('[ProjectCreator] Saving project to storage:', {
        id: projectData.id,
        name: projectData.name,
        hasId: Boolean(projectData.id)
      });
      
      // Save to IndexedDB first (preferred offline storage)
      let savedToIndexedDB = false;
      try {
        savedToIndexedDB = await saveToIndexedDB(projectData);
        console.log('[ProjectCreator] Saved to IndexedDB:', savedToIndexedDB);
      } catch (indexedDBError) {
        console.error('[ProjectCreator] IndexedDB save error:', indexedDBError);
      }
      
      // Then save to localStorage as fallback
      let savedToLocal = false;
      try {
        savedToLocal = saveToLocalStorage(projectData);
        console.log('[ProjectCreator] Saved to localStorage:', savedToLocal);
      } catch (localStorageError) {
        console.error('[ProjectCreator] localStorage save error:', localStorageError);
      }
      
      if (savedToIndexedDB || savedToLocal) {
        const message = !navigator.onLine ? ' (offline mode)' : ' (local storage)';
        showSuccessToast(`Project created${message}`);
        console.log('[ProjectCreator] Navigating to project:', projectData.id);
        window.location.href = `/project/${projectData.id}`;
        return { ...projectData, isLocal: true };
      }
      
      // If all storage methods failed
      throw new Error('Failed to save project. Please check your storage permissions.');
    } catch (error) {
      console.error('[ProjectCreator] Error creating project:', error);
      showErrorToast(`Failed to create project: ${error.message}`);
      throw error;
    }
  }, [createProjectFromContext, showErrorToast, showSuccessToast]);
  
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

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @param {Object} options - Options for project creation
   * @returns {Promise<Object>} - Created project
   */
  const createProject = async (projectData, options = {}) => {
    try {
      console.log('[ProjectCreator] Creating project:', projectData.name);
      
      // Ensure project has an ID
      if (!projectData.id) {
        projectData.id = generateUniqueId();
        console.log('[ProjectCreator] Generated new project ID:', projectData.id);
      }
      
      // Add creation timestamp if not present
      if (!projectData.createdAt) {
        projectData.createdAt = new Date().toISOString();
      }
      
      // Prepare data for storage
      const preparedData = prepareDataForStorage(projectData);
      
      // Log the project data before saving
      console.log('[ProjectCreator] Project data prepared for storage:', {
        id: preparedData.id,
        name: preparedData.name,
        hasId: Boolean(preparedData.id)
      });
      
      // Try to save to IndexedDB first
      let savedToIndexedDB = false;
      try {
        savedToIndexedDB = await saveToIndexedDB(preparedData);
        console.log('[ProjectCreator] Saved to IndexedDB:', savedToIndexedDB);
      } catch (error) {
        console.error('[ProjectCreator] Failed to save to IndexedDB:', error);
      }
      
      // Fallback to localStorage if IndexedDB fails
      let savedToLocalStorage = false;
      if (!savedToIndexedDB) {
        try {
          savedToLocalStorage = saveToLocalStorage(preparedData);
          console.log('[ProjectCreator] Saved to localStorage:', savedToLocalStorage);
        } catch (error) {
          console.error('[ProjectCreator] Failed to save to localStorage:', error);
        }
      }
      
      // If both storage methods failed, throw an error
      if (!savedToIndexedDB && !savedToLocalStorage) {
        throw new Error('Failed to save project. Please check your storage permissions.');
      }
      
      return preparedData;
    } catch (error) {
      console.error('[ProjectCreator] Error creating project:', error);
      throw error;
    }
  };

  /**
   * Generate a unique ID for a project
   * @returns {string} - Unique ID
   */
  const generateUniqueId = () => {
    // Use a timestamp + random string for uniqueness
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `project_${timestamp}_${randomStr}`;
  };

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
    resetProjectState,
    createProject,
    generateUniqueId
  };
};

export default useProjectCreation;
