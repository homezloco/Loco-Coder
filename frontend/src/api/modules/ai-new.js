import axios from 'axios';

// Default configuration for the AI service
const DEFAULT_CONFIG = {
  // Timeout configurations
  timeout: 300000, // 5 minutes for complex queries
  maxRetries: 3,
  retryDelay: 3000, // 3 seconds initial delay with exponential backoff
  
  // Ollama specific configuration
  ollama: {
    model: 'codellama:instruct',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2000,
    num_ctx: 4096,
    num_thread: 4
  },
  
  // Fallback models (only include models that are known to be available)
  fallbackModels: [
    'codellama:instruct',
    'codellama:7b-instruct-q4_0'
  ]
};

// Simple in-memory cache
const memoryCache = new Map();

class AIService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.axios = this._createAxiosInstance();
  }

  _createAxiosInstance() {
    const baseURL = 'http://172.28.112.1:11434';
    console.log(`[AI Service] Creating axios instance with baseURL: ${baseURL}`);
    
    const instance = axios.create({
      baseURL: baseURL,
      timeout: 30000, // 30 second timeout for the actual request
      headers: {
        'Content-Type': 'application/json',
      },
      // Let Axios automatically choose the appropriate adapter for the environment
      // This will use xhr for browsers and http for Node.js
      adapter: axios.defaults.adapter
    });

    // Add request interceptor for logging
    instance.interceptors.request.use(
      config => {
        const requestId = Math.random().toString(36).substring(2, 8);
        config.metadata = { requestId, startTime: Date.now() };
        
        console.log(`[AI Service] [${requestId}] Starting ${config.method?.toUpperCase()} ${config.url} at ${new Date().toISOString()}`);
        
        if (config.data) {
          console.log(`[AI Service] [${requestId}] Request data:`, 
            typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
        }
        
        return config;
      },
      error => {
        console.error('[AI Service] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    instance.interceptors.response.use(
      response => {
        const { requestId, startTime } = response.config.metadata || {};
        const duration = Date.now() - startTime;
        
        console.log(`[AI Service] [${requestId || 'unknown'}] Request completed in ${duration}ms with status ${response.status}`);
        
        if (response.status >= 400) {
          console.error(`[AI Service] [${requestId || 'unknown'}] Request failed with status ${response.status}:`, 
            response.statusText);
        }
        
        return response;
      },
      error => {
        const { requestId, startTime } = error.config?.metadata || {};
        const duration = Date.now() - (startTime || Date.now());
        
        if (error.code === 'ECONNABORTED') {
          console.error(`[AI Service] [${requestId || 'unknown'}] Request timed out after ${duration}ms`);
        } else if (error.response) {
          console.error(`[AI Service] [${requestId || 'unknown'}] Request failed with status ${error.response.status} after ${duration}ms`);
        } else if (error.request) {
          console.error(`[AI Service] [${requestId || 'unknown'}] No response received after ${duration}ms:`, error.message);
        } else {
          console.error(`[AI Service] [${requestId || 'unknown'}] Request setup error:`, error.message);
        }
        
        return Promise.reject(error);
      }
    );
    
    // Request interceptor for logging
    instance.interceptors.request.use(
      config => {
        console.log(`[AI Service] Sending request to: ${config.url}`);
        return config;
      },
      error => {
        console.error('[AI Service] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add retry logic with enhanced error handling
    instance.interceptors.response.use(
      response => {
        console.log(`[AI Service] Received response from: ${response.config.url} (${response.status})`);
        return response;
      },
      async error => {
        const { config, message, response } = error;
        console.error('[AI Service] Response error:', {
          message: error.message,
          code: error.code,
          status: response?.status,
          statusText: response?.statusText,
          url: config?.url,
          method: config?.method
        });
        
        if (!config || !config.retry) {
          return Promise.reject(error);
        }

        config.retryCount = config.retryCount || 0;
        
        if (config.retryCount >= this.config.maxRetries) {
          return Promise.reject(error);
        }

        config.retryCount += 1;
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, config.retryCount - 1),
          30000 // Max 30s delay
        );

        console.log(`Retrying request (${config.retryCount}/${this.config.maxRetries}) in ${delay}ms`);
        
        return new Promise(resolve => 
          setTimeout(() => resolve(instance(config)), delay)
        );
      }
    );

    return instance;
  }

  async chat(prompt, options = {}) {
    const {
      model = this.config.ollama.model,
      temperature = this.config.ollama.temperature,
      max_tokens = this.config.ollama.max_tokens,
      num_ctx = this.config.ollama.num_ctx,
      num_thread = this.config.ollama.num_thread,
      top_p = this.config.ollama.top_p,
      stream = false,
      retry = true,
    } = options;

    try {
      const response = await this.axios.post('/api/generate', {
        model,
        prompt,
        stream,
        options: {
          temperature,
          top_p,
          num_ctx,
          num_thread,
          num_predict: max_tokens,
        }
      }, { 
        retry,
        timeout: this.config.timeout 
      });

      return {
        success: true,
        data: response.data.response || response.data,
        model: response.data.model || model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI chat request failed:', error);
      throw error;
    }
  }

  async execute(code, language = 'python') {
    try {
      const response = await this.axios.post('/api/execute', {
        code,
        language
      });

      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('Code execution failed:', error);
      throw error;
    }
  }

  async getAvailableModels() {
    try {
      const response = await this.axios.get('/api/tags');
      return {
        success: true,
        models: response.data.models || []
      };
    } catch (error) {
      console.error('Failed to get available models:', error);
      return {
        success: false,
        error: error.message,
        models: this.config.fallbackModels
      };
    }
  }

  async getModelInfo(modelId) {
    try {
      const response = await this.axios.post('/api/show', { name: modelId });
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error(`Failed to get info for model ${modelId}:`, error);
      return {
        success: false,
        error: error.message,
        model: modelId
      };
    }
  }
}

// Create and export a singleton instance
const aiService = new AIService();
export default aiService;
