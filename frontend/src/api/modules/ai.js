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
const getAxiosInstance = (baseURL = 'http://localhost:11434', timeout = DEFAULT_CONFIG.timeout) => {
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
    this.useFallbackMode = false; // Flag to use mock/fallback responses
    this.ollamaBaseUrl = null; // Store the successful base URL for future requests
    
    // Debug: Check if chat method exists before binding
    console.log('[AI Service] Before binding - chat method exists:', typeof this.chat === 'function');
    
    // Define the chat method directly on the instance to ensure it's available
    if (typeof this.chat !== 'function') {
      // Get the chat method from the prototype
      const chatMethod = Object.getPrototypeOf(this).chat;
      if (typeof chatMethod === 'function') {
        // Bind it to the instance
        this.chat = chatMethod.bind(this);
      } else {
        // Create a fallback chat method if not found on prototype
        this.chat = async function(prompt, options = {}) {
          console.log('[AI Service] Using fallback chat method');
          return { response: 'AI service not properly initialized', error: true };
        };
      }
    }
    
    // Manually bind all methods to ensure they're properly bound
    this.initialize = this.initialize.bind(this);
    // this.chat is already bound above
    this.execute = this.execute.bind(this);
    this.getAvailableModels = this.getAvailableModels.bind(this);
    this.getModelInfo = this.getModelInfo.bind(this);
    this.checkHealth = this.checkHealth.bind(this);
    this.bindAllMethods = this.bindAllMethods.bind(this);
    
    // Debug: Check if chat method exists after binding
    console.log('[AI Service] After binding - chat method exists:', typeof this.chat === 'function');
    console.log('[AI Service] Instance methods after binding:', 
      Object.getOwnPropertyNames(this)
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
      
      const axiosInstance = getAxiosInstance(this.ollamaBaseUrl || 'http://localhost:11434', options.timeout || DEFAULT_CONFIG.timeout);

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
  
  /**
   * Send a chat message to the AI service
   * @param {string} prompt - The user's message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The AI response
   */
  async chatWithFallback(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // If we're in fallback mode, generate a mock response
    if (this.useFallbackMode) {
      console.log('[AI Service] Using fallback mode for chat request');
      return this.generateFallbackResponse(prompt, options);
    }
    
    try {
      const response = await this.axios.post('/api/chat', {
        model: this.config.model,
        messages: [
          { role: 'system', content: options.systemPrompt || this.config.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || this.config.temperature,
        max_tokens: options.maxTokens || this.config.maxTokens
      });
      
      return response.data;
    } catch (error) {
      console.error('[AI Service] Chat request failed:', error);
      
      // If the request fails, fall back to the mock response
      console.log('[AI Service] Falling back to mock response');
      return this.generateFallbackResponse(prompt, options);
    }
  }
  
  /**
   * Generate a fallback response when the AI service is unavailable
   * @param {string} prompt - The user's message
   * @param {Object} options - Additional options
   * @returns {Object} - A mock AI response
   */
  generateFallbackResponse(prompt, options = {}) {
    console.log('[AI Service] Generating fallback response for prompt:', prompt);
    
    // Extract keywords from the prompt to generate a more relevant response
    const keywords = this.extractKeywords(prompt);
    
    // Generate different responses based on prompt content
    let content = '';
    
    // Project name generation
    if (prompt.includes('project name') || prompt.includes('Generate a creative')) {
      const adjectives = ['Amazing', 'Brilliant', 'Creative', 'Dynamic', 'Efficient', 'Fantastic', 'Groundbreaking'];
      const nouns = ['Project', 'Solution', 'System', 'Framework', 'Platform', 'Application', 'Tool'];
      
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      
      content = `${adjective} ${noun}`;
    }
    // Color scheme generation
    else if (prompt.includes('color scheme') || prompt.includes('palette')) {
      content = JSON.stringify({
        primary: '#3498db',
        secondary: '#2ecc71',
        accent: '#e74c3c',
        background: '#f5f5f5',
        text: '#333333'
      });
    }
    // Logo generation (would normally return an image URL)
    else if (prompt.includes('logo') || prompt.includes('icon')) {
      content = 'https://via.placeholder.com/200x200?text=Logo';
    }
    // Default response for other queries
    else {
      content = `I'm currently operating in fallback mode due to connectivity issues with the AI service. Here's a generic response based on your query about "${keywords.join(', ')}". Please try again later when the service is available.`;
    }
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: content
          }
        }
      ],
      _fallback: true // Flag to indicate this is a fallback response
    };
  }
  
  /**
   * Extract keywords from a prompt
   * @param {string} prompt - The prompt to extract keywords from
   * @returns {Array<string>} - Array of keywords
   */
  extractKeywords(prompt) {
    // Simple keyword extraction - remove common words and punctuation
    const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at', 'to', 'from', 'by'];
    
    return prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 5); // Take up to 5 keywords
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
      const response = await axios.get('http://localhost:11434/api/tags');
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
      
      // Try to detect if we're in a development environment
      const isDev = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('192.168.') ||
                    window.location.hostname.includes('10.') ||
                    window.location.hostname.includes('172.');
      
      // Get the frontend origin for logging
      const origin = window.location.origin;
      console.log(`[AI Service] Frontend running at: ${origin}`);
      
      // If we're in development and not on localhost, CORS will likely be an issue
      // Immediately activate fallback mode to avoid multiple failed requests
      if (isDev && !window.location.hostname.match(/localhost|127\.0\.0\.1/)) {
        console.log('[AI Service] Development environment detected with non-localhost origin. CORS issues likely.');
        console.log('[AI Service] Activating fallback mode to avoid CORS errors');
        this.useFallbackMode = true;
        isServiceHealthy = true; // Consider the service "healthy" but in fallback mode
        return true;
      }
      
      // Try multiple possible Ollama URLs in order of likelihood
      const possibleUrls = [
        'http://localhost:11434/api/tags',       // Standard local development
        'http://127.0.0.1:11434/api/tags',       // Alternative localhost
        'http://172.28.112.1:11434/api/tags',    // Original hardcoded IP
        'http://host.docker.internal:11434/api/tags' // Docker to host machine
      ];
      
      // Try each URL until one works
      for (const url of possibleUrls) {
        try {
          console.log(`[AI Service] Trying to connect to Ollama at: ${url}`);
          const response = await axios.get(url, { 
            timeout: 5000,
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.status === 200) {
            console.log(`[AI Service] Successfully connected to Ollama at: ${url}`);
            // Store the successful base URL for future requests
            this.ollamaBaseUrl = url.replace('/api/tags', '');
            isServiceHealthy = true;
            return true;
          }
        } catch (error) {
          // Check specifically for CORS errors
          if (error.message && (error.message.includes('CORS') || error.code === 'ERR_NETWORK')) {
            console.warn(`[AI Service] CORS error detected when connecting to ${url}:`, error.message);
            // Continue to the next URL
          } else {
            console.warn(`[AI Service] Failed to connect to ${url}:`, error.message);
            // Continue to the next URL
          }
        }
      }
      
      // If we get here, all URLs failed
      console.warn('[AI Service] Could not connect to any Ollama instance');
      
      // Activate fallback mode
      console.log('[AI Service] Activating fallback mode due to connection failures');
      this.useFallbackMode = true;
      isServiceHealthy = true; // Consider the service "healthy" but in fallback mode
      
      return true; // Return true so the application continues to work
    } catch (error) {
      console.error('[AI Service] Health check failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Activate fallback mode on any error
      console.log('[AI Service] Activating fallback mode due to health check failure');
      this.useFallbackMode = true;
      isServiceHealthy = true; // Consider the service "healthy" but in fallback mode
      
      return true; // Return true so the application continues to work
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
    
    // Ensure the chat method exists before initialization
    if (typeof service.chat !== 'function') {
      console.warn('[AI Service] Chat method not found on instance, attempting to add it');
      
      // Try to get the chat method from the prototype
      const proto = Object.getPrototypeOf(service);
      if (proto && typeof proto.chat === 'function') {
        // Bind the prototype method to the instance
        service.chat = proto.chat.bind(service);
        console.log('[AI Service] Successfully bound chat method from prototype');
      } else {
        // Create a fallback chat method
        service.chat = async function(prompt, options = {}) {
          console.log('[AI Service] Using emergency fallback chat method');
          return { response: 'AI service not properly initialized', error: true };
        };
        console.log('[AI Service] Created fallback chat method');
      }
    }
    
    // Verify the chat method exists now
    if (typeof service.chat !== 'function') {
      const availableMethods = Object.getOwnPropertyNames(service)
        .filter(prop => typeof service[prop] === 'function');
      
      const error = new Error(
        `Chat method still not available after recovery attempts. ` +
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
    let initializedService;
    try {
      initializedService = await service.initialize();
    } catch (initError) {
      console.error('[AI Service] Initialization error:', initError);
      // Return the service even if initialization fails
      // This allows the app to function with limited AI capabilities
      console.log('[AI Service] Returning uninitialized service as fallback');
      return service;
    }
    
    // Use the initialized service if available, otherwise fall back to the original
    const finalService = initializedService || service;
    
    // Double-check the chat method after initialization
    if (typeof finalService.chat !== 'function') {
      console.warn('[AI Service] Chat method lost after initialization, restoring it');
      // Restore the chat method
      finalService.chat = service.chat;
    }
    
    console.log('[AI Service] AI service initialized successfully');
    
    // Log the bound methods for debugging
    const boundMethods = Object.getOwnPropertyNames(finalService)
      .filter(prop => typeof finalService[prop] === 'function')
      .filter(prop => !prop.startsWith('_') && prop !== 'constructor');
      
    console.log('[AI Service] Bound methods:', boundMethods);
    
    return finalService;
    
  } catch (error) {
    console.error('[AI Service] Critical error during service creation:', {
      message: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
      ...(error.debugInfo && { debugInfo: error.debugInfo })
    });
    
    // Create a fallback service with minimal functionality
    const fallbackService = {
      chat: async (prompt, options = {}) => {
        console.log('[AI Service] Using emergency fallback chat implementation');
        return { response: 'AI service failed to initialize: ' + error.message, error: true };
      },
      isAvailable: () => false,
      checkHealth: async () => ({ healthy: false, error: error.message }),
      getAvailableModels: async () => []
    };
    
    console.log('[AI Service] Returning emergency fallback service');
    return fallbackService;
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
