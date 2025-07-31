// API constants and configuration that don't depend on other modules
export const STORES = {
  CODE_SNIPPETS: 'code_snippets',
  FILES: 'files',
  PROJECTS: 'projects',
  SETTINGS: 'settings',
  EXECUTION_HISTORY: 'execution_history',
  API_QUEUE: 'api_queue',
  FILE_CONTENTS: 'file_contents',
  FILE_LISTS: 'file_lists',
  PENDING_WRITES: 'pending_writes',
  PENDING_CHANGES: 'pending_changes'
};

export const TOKEN_STORAGE_KEY = 'local_ai_platform_auth_token';
export const USERNAME_STORAGE_KEY = 'local_ai_platform_username';
export const FORCE_ONLINE_KEY = 'force_online_mode';

// Base API URL with multiple fallback options (ordered by preference)
const getApiEndpoints = () => {
  // Get endpoints from environment variables or use defaults
  const customEndpoints = import.meta.env.VITE_API_ENDPOINTS;
  
  // Default fallback endpoints for development
  const defaultEndpoints = [
    'http://localhost:11434',   // Local Ollama server
    '/api/ollama',              // Vite proxy
    window.location.origin      // Same-origin
  ];
  
  try {
    // If VITE_API_ENDPOINTS is defined, parse it as JSON
    if (customEndpoints) {
      const parsedEndpoints = JSON.parse(customEndpoints);
      if (Array.isArray(parsedEndpoints) && parsedEndpoints.length > 0) {
        return [...new Set([...parsedEndpoints, ...defaultEndpoints])];
      }
    }
  } catch (e) {
    console.warn('Failed to parse VITE_API_ENDPOINTS, using default endpoints', e);
  }
  
  return defaultEndpoints;
};

export const API_ENDPOINTS = getApiEndpoints();

// Ollama API specific endpoints
export const OLLAMA_API_PATHS = {
  CHAT: '/api/chat',
  GENERATE: '/api/generate',
  TAGS: '/api/tags',
  SHOW: '/api/show',
  PULL: '/api/pull',
  PUSH: '/api/push',
  CREATE: '/api/create',
  DELETE: '/api/delete',
  COPY: '/api/copy'
};
