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

  console.log(`[AI Service] Creating axios instance for ${baseURL} with timeout ${timeout}ms`);

  // Create axios instance with default config
  const instance = axios.create({
    baseURL,
    timeout,
    headers: defaultHeaders,
    validateStatus: (status) => status < 500, // Don't reject on 4xx errors
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
class AiService {
  constructor() {
    console.log('[AI Service] Creating new AiService instance');
    
    // Initialize service state first
    this.isInitialized = false;
    this.axios = null;
    this.config = { ...DEFAULT_CONFIG };
    
    // Debug: Check if chat method exists before binding
    console.log('[AI Service] Before binding - chat method exists:', typeof this.chat === 'function');
    
    // Manually bind all methods to ensure they're properly bound
    this.initialize = this.initialize.bind(this);
    this.chat = this.chat.bind(this);
    this.execute = this.execute.bind(this);
    this.getAvailableModels = this.getAvailableModels.bind(this);
    this.getModelInfo = this.getModelInfo.bind(this);
    this.checkHealth = this.checkHealth.bind(this);
    this.bindAllMethods = this.bindAllMethods.bind(this);
    
    // Debug: Check if chat method exists after binding
    console.log('[AI Service] After binding - chat method exists:', typeof this.chat === 'function');
    console.log('[AI Service] Instance methods after binding:', 
      Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .filter(prop => typeof this[prop] === 'function')
    );
    
    console.log('[AI Service] Constructor completed');
  }
  
  /**
   * Bind all class methods to the instance
   */
  bindAllMethods() {
    console.log('[AI Service] Starting method binding...');
    
    // Get all methods from the prototype chain
    const prototypeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor');
    
    // Add any instance methods that might not be on the prototype
    const instanceMethods = Object.getOwnPropertyNames(this)
      .filter(prop => typeof this[prop] === 'function' && 
                     prop !== 'constructor' && 
                     !prototypeMethods.includes(prop));
    
    // Combine all methods to bind
    const methodsToBind = [...new Set([...prototypeMethods, ...instanceMethods])];
    
    console.log('[AI Service] Methods to bind:', methodsToBind);
    
    // Bind each method to the instance
    let boundMethods = [];
    let failedMethods = [];
    
    methodsToBind.forEach(methodName => {
      try {
        if (typeof this[methodName] === 'function') {
          const originalMethod = this[methodName];
          this[methodName] = originalMethod.bind(this);
          
          // Verify the method is properly bound
          if (this[methodName] === originalMethod) {
            console.warn(`[AI Service] Method ${methodName} may not be properly bound`);
          }
          
          boundMethods.push(methodName);
        } else {
          console.warn(`[AI Service] Method ${methodName} is not a function`);
          failedMethods.push(methodName);
        }
      } catch (error) {
        console.error(`[AI Service] Failed to bind method ${methodName}:`, error);
        failedMethods.push(methodName);
      }
    });
    
    console.log(`[AI Service] Successfully bound ${boundMethods.length} methods:`, boundMethods);
    if (failedMethods.length > 0) {
      console.warn(`[AI Service] Failed to bind ${failedMethods.length} methods:`, failedMethods);
    }
    
    // Verify chat method is bound and callable
    if (typeof this.chat !== 'function') {
      const error = new Error('Chat method is not a function after binding');
      console.error('[AI Service] CRITICAL:', error.message);
      console.error('[AI Service] Available methods on instance:', Object.getOwnPropertyNames(this));
      console.error('[AI Service] Available methods on prototype:', 
        Object.getOwnPropertyNames(Object.getPrototypeOf(this))
          .filter(prop => typeof this[prop] === 'function')
      );
      
      // Add more debug info to the error
      error.debugInfo = {
        instanceMethods: Object.getOwnPropertyNames(this),
        prototypeMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(this))
          .filter(prop => typeof this[prop] === 'function'),
        boundMethods,
        failedMethods
      };
      
      throw error;
    }
    
    console.log('[AI Service] All methods bound successfully');
  }
  
  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return this;
    
    try {
      this.axios = getAxiosInstance();
      await this.checkHealth();
      this.isInitialized = true;
      return this;
    } catch (error) {
      console.error('[AI Service] Failed to initialize:', error);
      throw error;
    }
  }
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
    console.log('[AI Service] Starting chat with prompt:', prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''));
    console.log('[AI Service] chat method context:', {
      this: this,
      hasChatMethod: typeof this.chat === 'function',
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(this))
    });
    console.log('[AI Service] Environment check:', {
      isBrowser: typeof window !== 'undefined',
      localStorage: typeof localStorage !== 'undefined' ? 'available' : 'unavailable',
      sessionStorage: typeof sessionStorage !== 'undefined' ? 'available' : 'unavailable',
    });

    try {
      // First check if the service is healthy
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new Error('AI service is not available. Please check if Ollama is running.');
      }
      
      const axiosInstance = getAxiosInstance('http://172.28.112.1:11434', options.timeout || DEFAULT_CONFIG.timeout);

      // Determine which models to try
      const modelsToTry = [
        ...(options.preferred_models || []),
        DEFAULT_CONFIG.ollama.model,
        ...(options.skip_fallbacks ? [] : DEFAULT_CONFIG.fallbackModels)
      ].filter(Boolean);

      console.log('[AI Service] Trying models in order:', modelsToTry);
      
      let lastError = null;
      
      // Try each model in sequence
      for (const currentModel of modelsToTry) {
        try {
          console.log(`[AI Service] Trying model: ${currentModel}`);
          
          // First verify the model is available
          try {
            await axiosInstance.get(`/api/tags`);
          } catch (error) {
            console.warn(`[AI Service] Model listing failed, assuming model is available`, error);
          }
          
          // Prepare the request data
          const modelRequestData = {
            model: currentModel,
            prompt: prompt,
            stream: false,
            options: {
              temperature: options.temperature ?? DEFAULT_CONFIG.ollama.temperature,
              top_p: options.top_p ?? DEFAULT_CONFIG.ollama.top_p,
              num_ctx: options.num_ctx ?? DEFAULT_CONFIG.ollama.num_ctx,
              num_thread: options.num_thread ?? DEFAULT_CONFIG.ollama.num_thread,
            },
          };

          console.log('[AI Service] Sending request to Ollama API', {
            model: currentModel,
            promptLength: prompt.length,
            options: modelRequestData.options
          });

          const response = await axiosInstance.post('/api/generate', modelRequestData, {
            timeout: options.timeout || DEFAULT_CONFIG.timeout,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });
          
          if (!response.data || !response.data.response) {
            throw new Error('Invalid response format from Ollama API');
          }
          
          console.log('[AI Service] Received response from Ollama API');
          
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
          lastError = error;
          console.warn(`[AI Service] Model ${currentModel} failed:`, error.message);
          // Add a small delay before trying the next model
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      // If we get here, all models failed
      throw new Error('All model attempts failed');
    } catch (error) {
      console.error('[AI Service] Chat error after all retries:', error);
      throw error;
    }
  }
  
  // Execute code
  async execute(code, language = 'python') {
    console.log(`[AI Service] Executing ${language} code`);
    // Implementation for code execution
    return {
      output: 'Code execution not implemented',
      error: null,
      language
    };
  }
  
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
  }
  
  // Get model info
  async getModelInfo(modelId) {
    console.log(`[AI Service] Getting info for model: ${modelId}`);
    return {
      id: modelId,
      name: modelId,
      max_tokens: 2000,
      supports_chat: true
    };
  }
  
  // Check if the AI service is healthy
  async checkHealth() {
    try {
      console.log('[AI Service] Checking Ollama service health...');
      const response = await axios.get('http://172.28.112.1:11434/api/tags', { 
        timeout: 10000, // Increased timeout for health check
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log('[AI Service] Ollama service is healthy');
        isServiceHealthy = true;
        return true;
      }
      
      console.warn('[AI Service] Ollama service returned non-200 status:', response.status);
      isServiceHealthy = false;
      return false;
    } catch (error) {
      console.error('[AI Service] Health check failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });
      isServiceHealthy = false;
      return false;
    }
  }
};

// Bind all methods to maintain proper 'this' context
const bindMethods = (obj) => {
  console.log('[AI Service] Binding methods for:', obj.constructor?.name || 'anonymous');
  
  // Get all property names from the object's prototype chain
  let currentObj = obj;
  const methodNames = new Set();
  
  // Walk up the prototype chain to collect all methods
  while (currentObj && currentObj !== Object.prototype) {
    Object.getOwnPropertyNames(currentObj)
      .filter(name => 
        name !== 'constructor' && 
        typeof currentObj[name] === 'function' &&
        !methodNames.has(name)
      )
      .forEach(name => {
        methodNames.add(name);
        // Store the original method for debugging
        const originalMethod = currentObj[name];
        // Bind the method to the instance
        obj[name] = originalMethod.bind(obj);
        console.log(`[AI Service] Bound method: ${name}`);
      });
      
    // Move up the prototype chain
    currentObj = Object.getPrototypeOf(currentObj);
  }
  
  console.log(`[AI Service] Bound ${methodNames.size} methods`);
  return obj;
};

// Helper function to get all methods from an object's prototype chain
const getAllMethods = (obj) => {
  let methods = [];
  let current = obj;
  
  while (current && current !== Object.prototype) {
    const props = Object.getOwnPropertyNames(Object.getPrototypeOf(current) || {})
      .filter(prop => typeof current[prop] === 'function' && prop !== 'constructor');
    methods = [...methods, ...props];
    current = Object.getPrototypeOf(current);
  }
  
  return [...new Set(methods)]; // Remove duplicates
};

/**
 * Create and initialize an AI service instance
 * @returns {Promise<AiService>} Initialized AI service instance
 */
const createAiService = async () => {
  console.log('[AI Service] Starting AI service creation...');
  
  try {
    // Create a new instance of the AI service
    console.log('[AI Service] Creating new AiService instance...');
    const service = new AiService();
    
    // Verify the service instance was created
    if (!service) {
      throw new Error('Failed to create AiService instance');
    }
    
    // Debug: Log all properties of the service instance
    console.log('[AI Service] Service instance properties:', {
      ownProperties: Object.getOwnPropertyNames(service),
      prototypeChain: getPrototypeChain(service).map(p => ({
        name: p.constructor?.name || 'Anonymous',
        properties: Object.getOwnPropertyNames(p)
      })),
      hasChat: 'chat' in service,
      chatType: typeof service.chat,
      chatIsFunction: typeof service.chat === 'function'
    });
    
    // Verify the chat method exists before initialization
    if (typeof service.chat !== 'function') {
      const availableMethods = Object.getOwnPropertyNames(service)
        .filter(prop => typeof service[prop] === 'function');
      
      const error = new Error(
        `Chat method not found on AiService instance. ` +
        `Available methods: ${availableMethods.join(', ')}`
      );
      
      // Add debug information to the error
      error.debugInfo = {
        ownProperties: Object.getOwnPropertyNames(service),
        prototypeChain: getPrototypeChain(service),
        hasChat: 'chat' in service,
        chatType: typeof service.chat
      };
      
      throw error;
    }
    
    console.log('[AI Service] AiService instance created successfully');
    
    // Initialize the service
    console.log('[AI Service] Initializing AI service...');
    const initializedService = await service.initialize();
    
    if (!initializedService) {
      throw new Error('Service initialization returned undefined');
    }
    
    // Double-check the chat method after initialization
    if (typeof initializedService.chat !== 'function') {
      const availableMethods = Object.getOwnPropertyNames(initializedService)
        .filter(prop => typeof initializedService[prop] === 'function');
      
      throw new Error(
        `Chat method lost after initialization. ` +
        `Available methods: ${availableMethods.join(', ')}`
      );
    }
    
    console.log('[AI Service] AI service initialized successfully');
    
    // Log the bound methods for debugging
    const boundMethods = Object.getOwnPropertyNames(initializedService)
      .filter(prop => typeof initializedService[prop] === 'function')
      .filter(prop => !prop.startsWith('_') && prop !== 'constructor');
      
    console.log('[AI Service] Bound methods:', boundMethods);
    
    return initializedService;
    
  } catch (error) {
    console.error('[AI Service] Critical error during service creation:', {
      message: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
      ...(error.availableMethods && { availableMethods: error.availableMethods })
    });
    
    // Create a more descriptive error
    const enhancedError = new Error(`Failed to create AI service: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.name = 'AiServiceInitializationError';
    
    throw enhancedError;
  }
};

// Helper function to get prototype chain for debugging
function getPrototypeChain(obj) {
  const chain = [];
  let current = obj;
  
  while (current) {
    chain.push({
      constructor: current.constructor?.name || 'No constructor',
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(current) || {})
        .filter(prop => typeof current[prop] === 'function' && prop !== 'constructor')
    });
    current = Object.getPrototypeOf(current);
  }
  
  return chain;
}

// Export the createAiService function as a named export
export { createAiService };
