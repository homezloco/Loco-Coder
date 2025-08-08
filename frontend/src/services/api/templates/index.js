import { ENDPOINTS } from '../config';
import { get, post, fetchWithTimeout } from '../utils/fetch';
import { withCache } from '../utils/cache';
import { handleApiError, BadRequestError } from '../utils/errors';
import logger from '../../../utils/logger';
const tplLog = logger.ns('api:templates');

/**
 * Fetches all available templates
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Array>} List of templates
 */
export const getTemplates = async (options = {}) => {
  try {
    const cacheKey = 'templates:all';
    
    // Return cached data if available
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    const response = await fetchWithTimeout(ENDPOINTS.TEMPLATES, {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const templates = await response.json();
    const result = Array.isArray(templates) ? templates : [];
    
    // Cache the result for 1 hour
    setInCache(cacheKey, result, 60 * 60 * 1000);
    
    return result;
    
  } catch (error) {
    tplLog.error('Error fetching templates:', error);
    
    // Return default templates if available in cache
    const cached = getFromCache('templates:default');
    if (cached) {
      tplLog.warn('Using cached default templates due to error:', error.message);
      return cached;
    }
    
    // Fallback to built-in templates
    const defaultTemplates = [
      {
        id: 'web-app',
        name: 'Web Application',
        description: 'A basic web application template with HTML, CSS, and JavaScript',
        tags: ['web', 'javascript', 'html', 'css'],
        defaultFiles: [
          { path: 'index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Web App</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <h1>Welcome to My Web App</h1>\n  <p>Start building your application here.</p>\n  <script src="app.js"></script>\n</body>\n</html>' },
          { path: 'styles.css', content: 'body {\n  font-family: Arial, sans-serif;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 20px;\n  line-height: 1.6;\n}\n\nh1 {\n  color: #333;\n}\n' },
          { path: 'app.js', content: '// Your JavaScript goes here\nconsole.log(\'Hello, World!\');\n\n// Example: Add interactivity\ndocument.addEventListener(\'DOMContentLoaded\', () => {\n  console.log(\'DOM fully loaded and parsed\');\n});' }
        ]
      },
      {
        id: 'react-app',
        name: 'React Application',
        description: 'A modern React application with Vite',
        tags: ['react', 'javascript', 'frontend'],
        defaultFiles: [
          { 
            path: 'package.json', 
            content: JSON.stringify({
              name: 'my-react-app',
              private: true,
              version: '0.1.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview',
                test: 'vitest'
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.20.0'
              },
              devDependencies: {
                '@types/react': '^18.2.37',
                '@types/react-dom': '^18.2.15',
                '@vitejs/plugin-react': '^4.2.0',
                vite: '^5.0.0',
                vitest: '^1.0.0'
              }
            }, null, 2)
          },
          {
            path: 'vite.config.js',
            content: 'import { defineConfig } from \'vite\'\nimport react from \'@vitejs/plugin-react\'\n\n// https://vitejs.dev/config/\nexport default defineConfig({\n  plugins: [react()],\n  test: {\n    globals: true,\n    environment: \'jsdom\',\n    setupFiles: \'./src/test/setup.js\'\n  }\n})\n'
          },
          {
            path: 'index.html',
            content: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n'
          },
          {
            path: 'src/main.jsx',
            content: 'import React from \'react\'\nimport ReactDOM from \'react-dom/client\'\nimport App from \'./App\'\nimport \'./index.css\'\n\nReactDOM.createRoot(document.getElementById(\'root\')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n)\n'
          },
          {
            path: 'src/App.jsx',
            content: 'import { useState } from \'react\'\nimport \'./App.css\'\n\nfunction App() {\n  const [count, setCount] = useState(0)\n\n  return (\n    <div className="App">\n      <h1>React App</h1>\n      <div className="card">\n        <button onClick={() => setCount((count) => count + 1)}>\n          Count is {count}\n        </button>\n        <p>\n          Edit <code>src/App.jsx</code> and save to test HMR\n        </p>\n      </div>\n    </div>\n  )\n}\n\nexport default App\n'
          },
          {
            path: 'src/App.css',
            content: '#root {\n  max-width: 1280px;\n  margin: 0 auto;\n  padding: 2rem;\n  text-align: center;\n}\n\n.logo {\n  height: 6em;\n  padding: 1.5em;\n  will-change: filter;\n  transition: filter 300ms;\n}\n.logo:hover {\n  filter: drop-shadow(0 0 2em #646cffaa);\n}\n.logo.react:hover {\n  filter: drop-shadow(0 0 2em #61dafbaa);\n}\n\n@keyframes logo-spin {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n@media (prefers-reduced-motion: no-preference) {\n  a:nth-of-type(2) .logo {\n    animation: logo-spin infinite 20s linear;\n  }\n}\n\n.card {\n  padding: 2em;\n}\n\n.read-the-docs {\n  color: #888;\n}\n'
          },
          {
            path: 'src/index.css',
            content: ':root {\n  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n\n  color-scheme: light dark;\n  color: rgba(255, 255, 255, 0.87);\n  background-color: #242424;\n\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\na {\n  font-weight: 500;\n  color: #646cff;\n  text-decoration: inherit;\n}\na:hover {\n  color: #535bf2;\n}\n\nbody {\n  margin: 0;\n  display: flex;\n  place-items: center;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nh1 {\n  font-size: 3.2em;\n  line-height: 1.1;\n}\n\nbutton {\n  border-radius: 8px;\n  border: 1px solid transparent;\n  padding: 0.6em 1.2em;\n  font-size: 1em;\n  font-weight: 500;\n  font-family: inherit;\n  background-color: #1a1a1a;\n  cursor: pointer;\n  transition: border-color 0.25s;\n}\nbutton:hover {\n  border-color: #646cff;\n}\nbutton:focus,\nbutton:focus-visible {\n  outline: 4px auto -webkit-focus-ring-color;\n}\n\n@media (prefers-color-scheme: light) {\n  :root {\n    color: #213547;\n    background-color: #ffffff;\n  }\n  a:hover {\n    color: #747bff;\n  }\n  button {\n    background-color: #f9f9f9;\n  }\n}\n'
          }
        ]
      },
      {
        id: 'node-api',
        name: 'Node.js API',
        description: 'A RESTful API server with Node.js and Express',
        tags: ['node', 'javascript', 'api', 'backend'],
        defaultFiles: [
          { 
            path: 'package.json', 
            content: JSON.stringify({
              name: 'node-api',
              version: '1.0.0',
              description: 'A RESTful API with Node.js and Express',
              main: 'src/index.js',
              scripts: {
                start: 'node src/index.js',
                dev: 'nodemon src/index.js',
                test: 'jest'
              },
              dependencies: {
                'express': '^4.18.2',
                'cors': '^2.8.5',
                'helmet': '^7.0.0',
                'morgan': '^1.10.0',
                'winston': '^3.8.2'
              },
              devDependencies: {
                'nodemon': '^2.0.20',
                'jest': '^29.3.1',
                'supertest': '^6.3.3',
                'eslint': '^8.30.0',
                'prettier': '^2.8.1'
              }
            }, null, 2)
          },
          {
            path: 'src/index.js',
            content: 'const express = require(\'express\')\nconst cors = require(\'cors\')\nconst helmet = require(\'helmet\')\nconst morgan = require(\'morgan\')\n\n// Create Express app\nconst app = express()\nconst PORT = process.env.PORT || 3000\n\n// Middleware\napp.use(helmet())\napp.use(cors())\napp.use(express.json())\napp.use(morgan(\'dev\'))\n\n// Routes\napp.get(\'/\', (req, res) => {\n  res.json({ message: \'Welcome to the API\' })\n})\n\n// Error handling middleware\napp.use((err, req, res, next) => {\n  console.error(err.stack)\n  res.status(500).json({ error: \'Something went wrong!\' })\n})\n\n// Start server\napp.listen(PORT, () => {\n  console.log(`Server is running on port ${PORT}`)\n})\n\nmodule.exports = app\n'
          },
          {
            path: 'README.md',
            content: '# Node.js API\n\nA RESTful API built with Node.js and Express.\n\n## Getting Started\n\n1. Install dependencies:\n   ```bash\n   npm install\n   ```\n\n2. Start the development server:\n   ```bash\n   npm run dev\n   ```\n\n3. The API will be available at `http://localhost:3000`\n\n## Available Scripts\n\n- `npm start` - Start the production server\n- `npm run dev` - Start the development server with hot-reload\n- `npm test` - Run tests\n\n## Project Structure\n\n- `src/` - Source code\n  - `index.js` - Application entry point\n  - `routes/` - API route handlers\n  - `controllers/` - Request handlers\n  - `models/` - Data models\n  - `middleware/` - Custom middleware\n  - `utils/` - Utility functions\n\n## Environment Variables\n\nCreate a `.env` file in the root directory and add the following variables:\n\n```\nPORT=3000\nNODE_ENV=development\n```\n'
          }
        ]
      }
    ];
    
    // Cache the default templates
    setInCache('templates:default', defaultTemplates, 24 * 60 * 60 * 1000); // 24 hours
    
    return defaultTemplates;
  }
};

/**
 * Gets a template by ID
 * @param {string} templateId - The ID of the template to fetch
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The template data
 */
export const getTemplate = async (templateId, options = {}) => {
  try {
    if (!templateId) {
      throw new BadRequestError('Template ID is required');
    }
    
    const cacheKey = `template:${templateId}`;
    
    // Return cached data if available
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    const response = await fetchWithTimeout(`${ENDPOINTS.TEMPLATES}/${templateId}`, {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    const template = await response.json();
    
    // Cache the result for 1 hour
    setInCache(cacheKey, template, 60 * 60 * 1000);
    
    return template;
    
  } catch (error) {
    tplLog.error(`Error fetching template ${templateId}:`, error);
    
    // Try to find in default templates
    const defaultTemplates = getFromCache('templates:default') || [];
    const defaultTemplate = defaultTemplates.find(t => t.id === templateId);
    
    if (defaultTemplate) {
      return defaultTemplate;
    }
    
    handleApiError(error, { rethrow: true });
  }
};

/**
 * Creates a new project from a template
 * @param {string} templateId - The ID of the template to use
 * @param {Object} projectData - The project data
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} The created project
 */
export const createProjectFromTemplate = async (templateId, projectData, options = {}) => {
  try {
    if (!templateId) {
      throw new BadRequestError('Template ID is required');
    }
    
    if (!projectData || !projectData.name) {
      throw new BadRequestError('Project name is required');
    }
    
    const response = await fetchWithTimeout(
      `${ENDPOINTS.TEMPLATES}/${templateId}/create-project`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
        ...options,
      }
    );
    
    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }
    
    return response.json();
    
  } catch (error) {
    tplLog.error(`Error creating project from template ${templateId}:`, error);
    
    // Fallback: Use local template files if available
    if (error.code === 'NETWORK_ERROR' || error.status >= 500) {
      const template = await getTemplate(templateId);
      if (template && template.defaultFiles) {
        // Create project with template files
        const project = {
          ...projectData,
          files: template.defaultFiles
        };
        
        // In a real implementation, you would create the project with these files
        tplLog.warn('Using local template fallback due to network/server error');
        return project;
      }
    }
    
    handleApiError(error, { rethrow: true });
  }
};

// Export all template-related functions
export default {
  getTemplates,
  getTemplate,
  createProjectFromTemplate,
};
