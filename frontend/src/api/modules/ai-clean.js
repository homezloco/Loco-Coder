// Import dependencies
import axios from 'axios';

// Default configuration for the AI service
const DEFAULT_CONFIG = {
  // Timeout configurations
  timeout: 300000, // 5 minutes for complex queries
  healthCheckTimeout: 5000, // 5 seconds for health checks
  
  // Ollama specific configuration
  ollama: {
    model: 'codellama:instruct', // Default model
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2000,
    num_ctx: 4096, // Context window size
    num_thread: 4,  // Number of threads to use
  },
  
  // Fallback models
  fallbackModels: [
    'codellama:7b-instruct-q4_0'  // Fallback model
  ]
};

// Track the health status of the AI service
let isServiceHealthy = false;

// Create a function to get axios instance with current config
const getAxiosInstance = (baseURL = 'http://172.28.112.1:11434', timeout = DEFAULT_CONFIG.timeout) => {
  // Default headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Create axios instance with default config
  const instance = axios.create({
    baseURL,
    timeout,
    headers: defaultHeaders,
  });

  // Add request interceptor for logging
  instance.interceptors.request.use(
    (config) => {
      console.log(`[Axios] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
      return config;
    },
    (error) => {
      console.error('[Axios] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      console.log(`[Axios] Response from ${response.config.url}:`, response.status);
      return response;
    },
    (error) => {
      if (error.response) {
        console.error('[Axios] Response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      } else if (error.request) {
        console.error('[Axios] No response received:', error.request);
      } else {
        console.error('[Axios] Request setup error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Core AI Service Implementation
const aiServiceImplementation = {
  /**
   * Chat with AI
   * @param {string} prompt - User message
   * @param {Object} options - Additional options
   * @param {boolean} [options.health_check=false] - If true, just check service health
   * @param {number} [options.timeout=30000] - Request timeout in ms
   * @param {boolean} [options.skip_fallbacks=false] - Skip fallback models
   * @param {Array} [options.preferred_models=[]] - Preferred models to try first
   * @returns {Promise<Object>} Chat response with metadata
   */
  async chat(prompt, options = {}) {
    // Log environment and storage availability
    console.log('[AI Service] Environment check:', {
      isBrowser: typeof window !== 'undefined',
      localStorage: typeof localStorage !== 'undefined' ? 'available' : 'unavailable',
      sessionStorage: typeof sessionStorage !== 'undefined' ? 'available' : 'unavailable',
    });

    try {
      const axiosInstance = getAxiosInstance('http://172.28.112.1:11434', options.timeout || DEFAULT_CONFIG.timeout);
      
      // Check if this is just a health check
      if (options.health_check) {
        const health = await this.checkHealth();
        return { healthy: health };
      }

      // Determine which models to try
      const modelsToTry = [
        ...(options.preferred_models || []),
        DEFAULT_CONFIG.ollama.model,
        ...(options.skip_fallbacks ? [] : DEFAULT_CONFIG.fallbackModels)
      ].filter(Boolean);

      console.log('[AI Service] Trying models in order:', modelsToTry);
      
      // Try each model in sequence
      for (const currentModel of modelsToTry) {
        // Update the model in the request data
        const modelRequestData = {
          model: currentModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || DEFAULT_CONFIG.ollama.temperature,
            top_p: options.top_p || DEFAULT_CONFIG.ollama.top_p,
            num_ctx: options.num_ctx || DEFAULT_CONFIG.ollama.num_ctx,
            num_thread: options.num_thread || DEFAULT_CONFIG.ollama.num_thread,
          },
        };

        try {
          const response = await axiosInstance.post('/api/generate', modelRequestData);
          
          // Format the response to match expected format
          return {
            id: `chat-${Date.now()}`,
            model: currentModel,
            choices: [{
              message: {
                role: 'assistant',
                content: response.data.response
              }
            }],
            usage: {
              prompt_tokens: 0, // Ollama doesn't provide token counts
              completion_tokens: 0,
              total_tokens: 0
            },
            raw: response.data
          };
        } catch (error) {
          console.warn(`[AI Service] Model ${currentModel} failed, trying next...`, error);
          // Continue to next model if available
          continue;
        }
      }
      
      // If we get here, all models failed
      throw new Error('All model attempts failed');
    } catch (error) {
      console.error('[AI Service] Chat error after all retries:', error);
      throw error;
    }
  },
  
  // Execute code
  async execute(code, language = 'python') {
    console.log(`[AI Service] Executing ${language} code`);
    // Implementation for code execution
    return {
      output: 'Code execution not implemented',
      error: null,
      language,
    };
  },
  
  // Get available models
  async getAvailableModels() {
    try {
      console.log('[AI Service] Fetching available models');
      const response = await axios.get('http://172.28.112.1:11434/api/tags');
      return response.data.models || [
        { name: 'codellama:instruct' },
        { name: 'codellama:7b-instruct-q4_0' },
      ];
    } catch (error) {
      console.error('[AI Service] Error getting models:', error);
      return [
        { name: 'codellama:instruct' },
        { name: 'codellama:7b-instruct-q4_0' },
      ];
    }
  },
  
  // Get model info
  async getModelInfo(modelId) {
    console.log(`[AI Service] Getting info for model: ${modelId}`);
    return {
      id: modelId,
      name: modelId,
      max_tokens: 2000,
      supports_chat: true,
    };
  },
  
  // Check if the AI service is healthy
  async checkHealth() {
    try {
      await axios.get('http://172.28.112.1:11434/api/tags', { timeout: 5000 });
      isServiceHealthy = true;
      return true;
    } catch (error) {
      console.error('[AI Service] Health check failed:', error);
      isServiceHealthy = false;
      return false;
    }
  }
};

// Bind all methods to maintain proper 'this' context
const bindMethods = (obj) => {
  const bound = {};
  Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).forEach(key => {
    if (typeof obj[key] === 'function' && key !== 'constructor') {
      bound[key] = obj[key].bind(obj);
    }
  });
  return bound;
};

// Create the AI service instance
const createAiService = () => {
  // Create a new instance with bound methods
  const service = Object.create(aiServiceImplementation);
  
  // Bind all methods
  const boundService = bindMethods(service);
  
  // Add utility methods
  boundService.isInitialized = true;
  boundService.isHealthy = () => isServiceHealthy;
  
  return boundService;
};

// Create and export the singleton instance
const aiService = createAiService();

export { createAiService };
export default aiService;
