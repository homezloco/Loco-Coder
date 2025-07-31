import { STORES } from './config/constants.js';
import { apiClient } from './config/axios-config.js';
import { getFromFallbackDB, saveToFallbackDB, queryFallbackDB } from '../../utils/database-fallback.js';
import { fileSyncManager, SYNC_STATUS } from '../../utils/file-sync-manager.js';

// Language detection patterns
const LANGUAGE_PATTERNS = {
  // JavaScript/TypeScript
  '\.jsx?$': 'javascript',
  '\.tsx?$': 'typescript',
  // Python
  '\.py$': 'python',
  // HTML/CSS
  '\.html?$': 'html',
  '\.css$': 'css',
  '\.scss$': 'scss',
  '\.sass$': 'sass',
  '\.less$': 'less',
  // JSON/XML
  '\.json$': 'json',
  '\.xml$': 'xml',
  // Markdown
  '\.md$': 'markdown',
  '\.markdown$': 'markdown',
  // Shell
  '^\.?bashrc$': 'shell',
  '^\.?bash_': 'shell',
  '^Dockerfile': 'dockerfile',
  '^\.gitignore$': 'gitignore',
  '^Makefile$': 'makefile',
  '^Rakefile$': 'ruby',
  '^Gemfile': 'ruby',
  '^package\.json$': 'json',
  '^package-lock\.json$': 'json',
  '^yarn\.lock$': 'yaml',
  '^Dockerfile\..*$': 'dockerfile',
  '^docker-compose\..*$': 'yaml',
  '^.*\.(c|h|cc|cpp|hpp|c\+\+|h\+\+)$': 'cpp',
  '^.*\.(java|class|jsp)$': 'java',
  '^.*\.(cs)$': 'csharp',
  '^.*\.(go)$': 'go',
  '^.*\.(rs)$': 'rust',
  '^.*\.(swift)$': 'swift',
  '^.*\.(kt|kts)$': 'kotlin',
  '^.*\.(dart)$': 'dart',
  '^.*\.(php)$': 'php',
  '^.*\.(rb)$': 'ruby',
  '^.*\.(sh|bash|zsh|fish)$': 'shell',
  '^.*\.(sql)$': 'sql',
  '^.*\.(yaml|yml)$': 'yaml',
  '^.*\.(toml)$': 'toml',
  '^.*\.(ini|cfg|prefs|properties)$': 'ini',
  '^.*\.(bat|cmd|ps1)$': 'powershell',
  '^.*\.(lua)$': 'lua',
  '^.*\.(pl|pm|t|pod)$': 'perl',
  '^.*\.(r|R)$': 'r',
  '^.*\.(m|h)$': 'objectivec',
  '^.*\.(scala|sbt)$': 'scala',
  '^.*\.(vue)$': 'vue',
  '^.*\.(svelte)$': 'svelte',
  '^.*\.(graphql|gql)$': 'graphql',
  '^.*\.(wasm)$': 'wasm',
  '^.*\.(dockerfile)$': 'dockerfile',
  '^.*\.(tf|tfvars|hcl)$': 'hcl', // Terraform
  '^.*\.(pug|jade)$': 'pug',
  '^.*\.(coffee|litcoffee|coffee\.md)$': 'coffeescript',
  '^.*\.(handlebars|hbs|hjs|hjsx)$': 'handlebars',
  '^.*\.(ejs|ejs\.html)$': 'ejs',
  '^.*\.(haml)$': 'haml',
  '^.*\.(slim|slm)$': 'slim',
  '^.*\.(styl|stylus)$': 'stylus',
  '^.*\.(pug|jade)$': 'pug',
  '^.*\.(mustache|hogan|hulk|hjs)$': 'mustache',
  '^.*\.(dust|dst)$': 'dust',
  '^.*\.(jade)$': 'jade',
  '^.*\.(pug)$': 'pug',
  '^.*\.(ejs)$': 'ejs',
  '^.*\.(hbs|handlebars)$': 'handlebars',
  '^.*\.(njk|nunjucks)$': 'nunjucks',
  '^.*\.(twig|swig|tpl|tmpl|tmpl\.html)$': 'twig',
  '^.*\.(liquid)$': 'liquid',
  '^.*\.(marko)$': 'marko',
  '^.*\.(ejs\.html|ejs)$': 'ejs',
  '^.*\.(hbs\.html|hbs)$': 'handlebars',
  '^.*\.(pug\.html|pug)$': 'pug',
  '^.*\.(njk\.html|njk)$': 'nunjucks',
  '^.*\.(twig\.html|twig)$': 'twig',
  '^.*\.(liquid\.html|liquid)$': 'liquid',
  '^.*\.(marko\.html|marko)$': 'marko',
  '^.*\.(ejs\.html\.erb|ejs\.erb)$': 'ejs',
  '^.*\.(hbs\.html\.erb|hbs\.erb)$': 'handlebars',
  '^.*\.(pug\.html\.erb|pug\.erb)$': 'pug',
  '^.*\.(njk\.html\.erb|njk\.erb)$': 'nunjucks',
  '^.*\.(twig\.html\.erb|twig\.erb)$': 'twig',
  '^.*\.(liquid\.html\.erb|liquid\.erb)$': 'liquid',
  '^.*\.(marko\.html\.erb|marko\.erb)$': 'marko',
  '^.*\.(ejs\.html\.haml|ejs\.haml)$': 'ejs',
  '^.*\.(hbs\.html\.haml|hbs\.haml)$': 'handlebars',
  '^.*\.(pug\.html\.haml|pug\.haml)$': 'pug',
  '^.*\.(njk\.html\.haml|njk\.haml)$': 'nunjucks',
  '^.*\.(twig\.html\.haml|twig\.haml)$': 'twig',
  '^.*\.(liquid\.html\.haml|liquid\.haml)$': 'liquid',
  '^.*\.(marko\.html\.haml|marko\.haml)$': 'marko',
  '^.*\.(ejs\.html\.slim|ejs\.slim)$': 'ejs',
  '^.*\.(hbs\.html\.slim|hbs\.slim)$': 'handlebars',
  '^.*\.(pug\.html\.slim|pug\.slim)$': 'pug',
  '^.*\.(njk\.html\.slim|njk\.slim)$': 'nunjucks',
  '^.*\.(twig\.html\.slim|twig\.slim)$': 'twig',
  '^.*\.(liquid\.html\.slim|liquid\.slim)$': 'liquid',
  '^.*\.(marko\.html\.slim|marko\.slim)$': 'marko',
  '^.*\.(ejs\.html\.jade|ejs\.jade)$': 'ejs',
  '^.*\.(hbs\.html\.jade|hbs\.jade)$': 'handlebars',
  '^.*\.(pug\.html\.jade|pug\.jade)$': 'pug',
  '^.*\.(njk\.html\.jade|njk\.jade)$': 'nunjucks',
  '^.*\.(twig\.html\.jade|twig\.jade)$': 'twig',
  '^.*\.(liquid\.html\.jade|liquid\.jade)$': 'liquid',
  '^.*\.(marko\.html\.jade|marko\.jade)$': 'marko',
};

/**
 * Get language from filename
 * @param {string} filename - The filename to detect language from
 * @returns {string} - Detected language or 'plaintext' if unknown
 */
const getLanguageFromFilename = (filename) => {
  if (!filename) return 'plaintext';
  
  const lowerFilename = filename.toLowerCase();
  
  // Check for exact matches first
  for (const [pattern, language] of Object.entries(LANGUAGE_PATTERNS)) {
    if (lowerFilename.match(pattern)) {
      return language;
    }
  }
  
  // Check file extensions last
  const extension = filename.split('.').pop().toLowerCase();
  const extensionMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'php': 'php',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'r': 'r',
    'm': 'objectivec',
    'scala': 'scala',
    'vue': 'vue',
    'svelte': 'svelte',
    'graphql': 'graphql',
    'gql': 'graphql',
    'wasm': 'wasm',
    'dockerfile': 'dockerfile',
    'tf': 'hcl',
    'tfvars': 'hcl',
    'hcl': 'hcl',
    'pug': 'pug',
    'coffee': 'coffeescript',
    'litcoffee': 'coffeescript',
    'ejs': 'ejs',
    'hbs': 'handlebars',
    'njk': 'nunjucks',
    'twig': 'twig',
    'liquid': 'liquid',
    'marko': 'marko',
    'haml': 'haml',
    'slim': 'slim',
    'styl': 'stylus',
    'stylus': 'stylus',
    'mustache': 'mustache',
    'dust': 'dust',
    'jade': 'jade',
    'nunj': 'nunjucks',
    'nunjs': 'nunjucks',
    'nunjucks': 'nunjucks',
    'nun': 'nunjucks',
    'nunjs': 'nunjucks',
    'nunj': 'nunjucks',
  };
  
  return extensionMap[extension] || 'plaintext';
};

/**
 * File operations service
 */
export const fileService = {
  /**
   * Load file listing
   * @returns {Promise<Array>} - List of files
   */
  async loadFiles() {
    try {
      const response = await apiClient.get('/files');
      return response.data;
    } catch (error) {
      console.error('Failed to load files:', error);
      // Try to get from fallback
      const files = await getFromFallbackDB(STORES.FILE_LISTS, 'file_list');
      return files || [];
    }
  },

  /**
   * Load file content
   * @param {string} filename - The filename to load
   * @returns {Promise<Object>} - File content and metadata
   */
  async loadFile(filename) {
    if (!filename) {
      throw new Error('Filename is required');
    }

    try {
      const response = await apiClient.get(`/files/${encodeURIComponent(filename)}`);
      
      // Update local cache
      await saveToFallbackDB(STORES.FILE_CONTENTS, filename, response.data);
      
      return {
        ...response.data,
        language: getLanguageFromFilename(filename),
        fromCache: false
      };
    } catch (error) {
      console.error(`Failed to load file ${filename}:`, error);
      
      // Try to get from fallback
      const cachedContent = await getFromFallbackDB(STORES.FILE_CONTENTS, filename);
      if (cachedContent) {
        return {
          ...cachedContent,
          language: getLanguageFromFilename(filename),
          fromCache: true
        };
      }
      
      throw error;
    }
  },

  /**
   * Save file content
   * @param {Object} fileData - File data to save
   * @param {string} fileData.filename - The filename
   * @param {string} fileData.content - The file content
   * @param {string} [fileData.language] - The file language
   * @returns {Promise<Object>} - Saved file data
   */
  async saveFile({ filename, content, language }) {
    if (!filename) {
      throw new Error('Filename is required');
    }

    const fileData = {
      filename,
      content: content || '',
      language: language || getLanguageFromFilename(filename),
      lastModified: new Date().toISOString(),
    };

    try {
      // Save to server
      const response = await apiClient.put(
        `/files/${encodeURIComponent(filename)}`,
        fileData
      );
      
      // Update local cache
      await saveToFallbackDB(STORES.FILE_CONTENTS, filename, fileData);
      
      return response.data;
    } catch (error) {
      console.error(`Failed to save file ${filename}:`, error);
      
      // If offline, queue for sync
      if (!navigator.onLine) {
        await fileSyncManager.addToQueue({
          type: 'save',
          payload: fileData,
          status: SYNC_STATUS.PENDING,
          timestamp: new Date().toISOString(),
        });
        
        // Save to local cache
        await saveToFallbackDB(STORES.FILE_CONTENTS, filename, {
          ...fileData,
          pendingSync: true,
        });
        
        return { ...fileData, pendingSync: true };
      }
      
      throw error;
    }
  },

  /**
   * Get recent projects
   * @returns {Promise<Array>} - List of recent projects
   */
  async getRecentProjects() {
    try {
      const response = await apiClient.get('/projects/recent');
      return response.data;
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      // Try to get from fallback
      const projects = await getFromFallbackDB(STORES.FILE_LISTS, 'recent_projects');
      return projects || [];
    }
  },

  /**
   * Open project folder
   * @param {string} folderPath - The folder path to open as project
   * @returns {Promise<Object>} - Project information
   */
  async openProjectFolder(folderPath) {
    try {
      const response = await apiClient.post('/projects/open', { path: folderPath });
      return response.data;
    } catch (error) {
      console.error('Failed to open project folder:', error);
      throw error;
    }
  },

  /**
   * Get project files
   * @param {string} projectId - The project ID
   * @returns {Promise<Array>} - List of files in the project
   */
  async getProjectFiles(projectId) {
    try {
      const response = await apiClient.get(`/projects/${projectId}/files`);
      return response.data;
    } catch (error) {
      console.error(`Failed to load project files for ${projectId}:`, error);
      // Try to get from fallback
      const files = await getFromFallbackDB(STORES.FILE_LISTS, `project_${projectId}_files`);
      return files || [];
    }
  },

  /**
   * Read project file
   * @param {string} projectId - The project ID
   * @param {string} filePath - The file path relative to project root
   * @returns {Promise<Object>} - File content and metadata
   */
  async readProjectFile(projectId, filePath) {
    try {
      const response = await apiClient.get(
        `/projects/${projectId}/files/${encodeURIComponent(filePath)}`
      );
      
      // Update local cache
      const cacheKey = `project_${projectId}_${filePath}`;
      await saveToFallbackDB(STORES.FILE_CONTENTS, cacheKey, response.data);
      
      return {
        ...response.data,
        language: getLanguageFromFilename(filePath),
        fromCache: false
      };
    } catch (error) {
      console.error(`Failed to read project file ${filePath}:`, error);
      
      // Try to get from fallback
      const cacheKey = `project_${projectId}_${filePath}`;
      const cachedContent = await getFromFallbackDB(STORES.FILE_CONTENTS, cacheKey);
      
      if (cachedContent) {
        return {
          ...cachedContent,
          language: getLanguageFromFilename(filePath),
          fromCache: true
        };
      }
      
      throw error;
    }
  },

  /**
   * Write project file
   * @param {string} projectId - The project ID
   * @param {string} filePath - The file path relative to project root
   * @param {string} content - The file content
   * @returns {Promise<Object>} - Saved file data
   */
  async writeProjectFile(projectId, filePath, content) {
    const fileData = {
      path: filePath,
      content: content || '',
      language: getLanguageFromFilename(filePath),
      lastModified: new Date().toISOString(),
    };

    try {
      // Save to server
      const response = await apiClient.put(
        `/projects/${projectId}/files/${encodeURIComponent(filePath)}`,
        fileData
      );
      
      // Update local cache
      const cacheKey = `project_${projectId}_${filePath}`;
      await saveToFallbackDB(STORES.FILE_CONTENTS, cacheKey, fileData);
      
      return response.data;
    } catch (error) {
      console.error(`Failed to write project file ${filePath}:`, error);
      
      // If offline, queue for sync
      if (!navigator.onLine) {
        const syncItem = {
          type: 'project_file_write',
          projectId,
          payload: fileData,
          status: SYNC_STATUS.PENDING,
          timestamp: new Date().toISOString(),
        };
        
        await fileSyncManager.addToQueue(syncItem);
        
        // Save to local cache
        const cacheKey = `project_${projectId}_${filePath}`;
        await saveToFallbackDB(STORES.FILE_CONTENTS, cacheKey, {
          ...fileData,
          pendingSync: true,
        });
        
        return { ...fileData, pendingSync: true };
      }
      
      throw error;
    }
  },

  /**
   * Get language from filename
   * @param {string} filename - The filename
   * @returns {string} - Detected language
   */
  getLanguageFromFilename,
};

export default fileService;
