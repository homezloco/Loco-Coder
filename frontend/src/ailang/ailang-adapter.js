/**
 * AILang JavaScript Adapter
 * 
 * This module provides integration between AILang model definitions and frontend React components.
 * It allows you to use AILang's declarative syntax to configure AI components in the browser.
 */

import axios from 'axios';

/**
 * AILang JavaScript Adapter class
 */
class AILangAdapter {
  /**
   * Constructor for AILangAdapter
   * @param {Object} options - Configuration options
   * @param {string} options.modelUrl - URL to fetch the AILang model from
   * @param {string} options.backendUrl - Base URL for backend API calls
   * @param {Object} options.fallbackConfig - Fallback configuration for offline mode
   */
  constructor(options = {}) {
    this.modelUrl = options.modelUrl || '/api/ailang/models/default';
    this.backendUrl = options.backendUrl || '/api';
    this.fallbackConfig = options.fallbackConfig || {};
    this.model = null;
    this.agents = {};
    this.tasks = {};
    this.consensusStrategies = {};
    this.systemConfig = {};
    this.initialized = false;
    this.useWebAssembly = options.useWebAssembly || false;
    this.wasmModule = null;
  }

  /**
   * Initialize the adapter by loading the AILang model
   * @returns {Promise<boolean>} - True if initialization was successful
   */
  async initialize() {
    try {
      // Load the AILang model from the backend
      const response = await axios.get(this.modelUrl);
      this.model = response.data;
      
      // Parse the model components
      this._parseAgents();
      this._parseTasks();
      this._parseConsensusStrategies();
      this._parseSystemConfig();
      
      // Initialize WebAssembly if enabled
      if (this.useWebAssembly) {
        await this._initializeWebAssembly();
      }
      
      this.initialized = true;
      console.log('AILang adapter initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AILang adapter:', error);
      
      // Use fallback configuration if available
      if (Object.keys(this.fallbackConfig).length > 0) {
        console.log('Using fallback configuration');
        this.model = this.fallbackConfig;
        this._parseAgents();
        this._parseTasks();
        this._parseConsensusStrategies();
        this._parseSystemConfig();
        this.initialized = true;
        return true;
      }
      
      return false;
    }
  }

  /**
   * Parse agents from the AILang model
   * @private
   */
  _parseAgents() {
    if (!this.model || !this.model.agents) return;
    
    Object.entries(this.model.agents).forEach(([name, config]) => {
      this.agents[name] = {
        id: name,
        name: config.name,
        role: config.role,
        apiUrl: this._resolveEnvVar(config.api_url),
        apiKey: this._resolveEnvVar(config.api_key),
        weight: config.weight || 1.0,
        timeout: config.timeout || 30.0,
        parameters: config.parameters || {},
        fallback: config.fallback || null
      };
    });
  }

  /**
   * Parse tasks from the AILang model
   * @private
   */
  _parseTasks() {
    if (!this.model || !this.model.tasks) return;
    
    Object.entries(this.model.tasks).forEach(([name, config]) => {
      this.tasks[name] = {
        id: name,
        description: config.description,
        agentIds: config.agents || [],
        consensusStrategy: config.consensus,
        contextTemplate: config.context_template || {}
      };
    });
  }

  /**
   * Parse consensus strategies from the AILang model
   * @private
   */
  _parseConsensusStrategies() {
    if (!this.model || !this.model.consensus_strategies) return;
    
    Object.entries(this.model.consensus_strategies).forEach(([name, config]) => {
      this.consensusStrategies[name] = {
        id: name,
        strategy: config.strategy,
        threshold: config.threshold || 0.5,
        timeout: config.timeout || 30.0,
        retryCount: config.retry_count || 2
      };
    });
  }

  /**
   * Parse system configuration from the AILang model
   * @private
   */
  _parseSystemConfig() {
    if (!this.model || !this.model.system_config) return;
    
    this.systemConfig = {
      maxConcurrentTasks: this.model.system_config.max_concurrent_tasks || 5,
      loggingLevel: this.model.system_config.logging_level || 'info',
      errorHandling: this.model.system_config.error_handling || {}
    };
  }

  /**
   * Initialize WebAssembly module for AILang
   * @private
   * @returns {Promise<void>}
   */
  async _initializeWebAssembly() {
    try {
      // This is a placeholder for actual WebAssembly initialization
      // In a real implementation, you would load the AILang WebAssembly module
      const wasmResponse = await fetch('/ailang/wasm/ailang.wasm');
      const wasmBuffer = await wasmResponse.arrayBuffer();
      
      // Instantiate WebAssembly module
      const wasmResult = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          // Environment functions that the WASM module can call
          consoleLog: (ptr, len) => {
            // Implementation for console.log from WASM
          },
          fetchData: (urlPtr, urlLen) => {
            // Implementation for fetching data from WASM
          }
        }
      });
      
      this.wasmModule = wasmResult.instance;
      console.log('AILang WebAssembly module initialized');
    } catch (error) {
      console.error('Failed to initialize WebAssembly module:', error);
      // Continue without WebAssembly support
    }
  }

  /**
   * Resolve environment variables in strings
   * @private
   * @param {string} value - Value that might contain env var references
   * @returns {string} - Resolved value
   */
  _resolveEnvVar(value) {
    if (typeof value !== 'string') return value;
    
    // Check for env() function calls
    const envRegex = /env\("([^"]+)"\)/g;
    return value.replace(envRegex, (match, envName) => {
      // In browser, we use environment variables from process.env or window.__ENV__
      const envValue = window.__ENV__?.[envName] || process.env?.[envName];
      return envValue || '';
    });
  }

  /**
   * Validate task context against the template
   * @param {string} taskName - Name of the task
   * @param {Object} context - Context object to validate
   * @returns {Object} - Validation result {valid: boolean, missing: string[]}
   */
  validateTaskContext(taskName, context) {
    const task = this.tasks[taskName];
    if (!task) {
      return { valid: false, missing: ['Task not found'] };
    }
    
    const template = task.contextTemplate;
    const missing = [];
    
    // Check for required fields
    Object.entries(template).forEach(([field, requirement]) => {
      if (requirement === 'required' && !context[field]) {
        missing.push(field);
      }
    });
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Create a task from an AILang task template
   * @param {string} taskName - Name of the task template
   * @param {Object} context - Context for the task
   * @returns {Promise<string>} - Task ID
   */
  async createTask(taskName, context) {
    if (!this.initialized) {
      throw new Error('AILang adapter not initialized');
    }
    
    // Validate task context
    const validation = this.validateTaskContext(taskName, context);
    if (!validation.valid) {
      throw new Error(`Invalid task context. Missing required fields: ${validation.missing.join(', ')}`);
    }
    
    const task = this.tasks[taskName];
    
    try {
      // Create task via backend API
      const response = await axios.post(`${this.backendUrl}/tasks`, {
        description: task.description,
        context,
        agent_ids: task.agentIds,
        consensus_config: this.consensusStrategies[task.consensusStrategy]
      });
      
      return response.data.task_id;
    } catch (error) {
      console.error('Failed to create task:', error);
      
      // If WebAssembly is enabled, try to use local processing
      if (this.useWebAssembly && this.wasmModule) {
        return this._createTaskWithWebAssembly(taskName, context);
      }
      
      throw error;
    }
  }

  /**
   * Create a task using WebAssembly for local processing
   * @private
   * @param {string} taskName - Name of the task template
   * @param {Object} context - Context for the task
   * @returns {string} - Task ID
   */
  _createTaskWithWebAssembly(taskName, context) {
    // This is a placeholder for actual WebAssembly task creation
    // In a real implementation, you would call the AILang WebAssembly module
    const taskJson = JSON.stringify({
      name: taskName,
      context
    });
    
    // Allocate memory for the task JSON
    const taskPtr = this.wasmModule.exports.allocateString(taskJson.length);
    
    // Write the task JSON to WebAssembly memory
    const memory = new Uint8Array(this.wasmModule.exports.memory.buffer);
    for (let i = 0; i < taskJson.length; i++) {
      memory[taskPtr + i] = taskJson.charCodeAt(i);
    }
    
    // Call the WebAssembly function to create a task
    const resultPtr = this.wasmModule.exports.createTask(taskPtr, taskJson.length);
    
    // Read the result from WebAssembly memory
    let resultStr = '';
    let i = 0;
    while (memory[resultPtr + i] !== 0) {
      resultStr += String.fromCharCode(memory[resultPtr + i]);
      i++;
    }
    
    // Parse the result
    const result = JSON.parse(resultStr);
    return result.task_id;
  }

  /**
   * Execute a task
   * @param {string} taskId - ID of the task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeTask(taskId) {
    if (!this.initialized) {
      throw new Error('AILang adapter not initialized');
    }
    
    try {
      // Execute task via backend API
      const response = await axios.post(`${this.backendUrl}/tasks/${taskId}/execute`);
      return response.data;
    } catch (error) {
      console.error('Failed to execute task:', error);
      
      // If WebAssembly is enabled, try to use local processing
      if (this.useWebAssembly && this.wasmModule) {
        return this._executeTaskWithWebAssembly(taskId);
      }
      
      throw error;
    }
  }

  /**
   * Execute a task using WebAssembly for local processing
   * @private
   * @param {string} taskId - ID of the task to execute
   * @returns {Object} - Task result
   */
  _executeTaskWithWebAssembly(taskId) {
    // This is a placeholder for actual WebAssembly task execution
    // Similar implementation to _createTaskWithWebAssembly
    // ...
    
    // Return a mock result
    return {
      task_id: taskId,
      status: 'completed',
      result: 'Task executed locally with WebAssembly'
    };
  }

  /**
   * Get available agents
   * @returns {Object[]} - Array of agent objects
   */
  getAgents() {
    return Object.values(this.agents);
  }

  /**
   * Get available task templates
   * @returns {Object[]} - Array of task template objects
   */
  getTaskTemplates() {
    return Object.values(this.tasks);
  }

  /**
   * Get system configuration
   * @returns {Object} - System configuration
   */
  getSystemConfig() {
    return this.systemConfig;
  }
}

/**
 * Create a React hook for using the AILang adapter
 * @param {Object} options - Configuration options for the adapter
 * @returns {Object} - Hook API
 */
export const useAILang = (options = {}) => {
  const [adapter] = React.useState(() => new AILangAdapter(options));
  const [initialized, setInitialized] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    const initAdapter = async () => {
      setLoading(true);
      try {
        const success = await adapter.initialize();
        setInitialized(success);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    initAdapter();
  }, [adapter]);
  
  return {
    adapter,
    initialized,
    loading,
    error,
    agents: adapter.getAgents(),
    taskTemplates: adapter.getTaskTemplates(),
    systemConfig: adapter.getSystemConfig(),
    createTask: adapter.createTask.bind(adapter),
    executeTask: adapter.executeTask.bind(adapter),
    validateTaskContext: adapter.validateTaskContext.bind(adapter)
  };
};

export default AILangAdapter;
