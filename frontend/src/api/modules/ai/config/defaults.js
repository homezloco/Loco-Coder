// Default configuration for the AI service
export const DEFAULT_CONFIG = {
  // Timeout configurations
  timeout: 300000, // 5 minutes for complex queries
  healthCheckTimeout: 5000, // 5 seconds for health checks
  requestTimeout: 120000, // 2 minutes for regular requests
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 3000, // 3 seconds initial delay with exponential backoff
  
  // Health check endpoints
  healthCheckEndpoints: [
    '/api/health',
    '/health',
    '/api/status',
    '/api/tags' // Ollama health check endpoint
  ],
  
  // Ollama specific configuration
  ollama: {
    model: 'codellama:instruct', // Default model
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2000,
    num_ctx: 4096, // Context window size
    num_thread: 4   // Number of threads to use
  },
  
  // Fallback configuration
  fallbackModels: [
    'codellama:instruct',
    'codellama:7b-instruct-q4_0',
    'deepseek-coder:33b'
  ]
};

export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  EXECUTE: '/api/execute',
  MODELS: '/api/tags',
  HEALTH: '/api/health'
};

export const STORES = {
  CACHE: 'ai-cache',
  SETTINGS: 'ai-settings',
  HISTORY: 'ai-chat-history'
};
