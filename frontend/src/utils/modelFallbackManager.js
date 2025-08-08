// modelFallbackManager.js - Robust AI model fallback system with cascading retry logic

import api from '../api/index.js';
import logger from './logger';

const log = logger.ns('api:ai:fallback');

/**
 * ModelFallbackManager provides a complete system for handling AI model failures
 * with multiple levels of fallbacks and persistent offline support.
 */
class ModelFallbackManager {
  constructor(modelConfig = null) {
    this.modelConfig = modelConfig || {
      primaryModels: [
        { id: 'ollama:codellama', provider: 'ollama', model: 'codellama', displayName: 'CodeLlama' },
        { id: 'openai:gpt-4-turbo', provider: 'openai', model: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' }
      ],
      fallbackModels: [
        { id: 'openai:gpt-3.5-turbo', provider: 'openai', model: 'gpt-3.5-turbo', displayName: 'GPT-3.5' },
        { id: 'anthropic:claude-3-opus', provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' }
      ],
      offlineModels: [
        { id: 'local:embedded', provider: 'local', model: 'embedded', displayName: 'Local Fallback' }
      ],
      enableFallbacks: true,
      maxRetries: 3,
      retryDelay: 1000,
      offlineTimeout: 5000,
      userPriorityOrder: [] // User-configured model priority order
    };
    
    this.modelStatus = new Map(); // Track model health status
    this.activeModel = null;      // Currently active model
    this.lastUsedModels = [];     // History of recently used models (most recent first)
    
    // Initialize model status tracking
    this.initializeModelStatus();
    
    // Load saved priority order from settings if available
    this.loadUserPriorityOrder();
    
    // Initial log of available models
    log.info('Model fallback manager initialized with models:', 
      [...this.getAllModels().map(m => m.id)]);
  }
  
  /**
   * Load user's configured model priority order from settings
   */
  loadUserPriorityOrder() {
    try {
      const savedSettings = localStorage.getItem('chatSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.modelPriorityOrder && Array.isArray(settings.modelPriorityOrder)) {
          this.modelConfig.userPriorityOrder = settings.modelPriorityOrder;
          log.info('Loaded user model priority order:', this.modelConfig.userPriorityOrder);
        }
      }
    } catch (err) {
      log.warn('Failed to load user model priority order:', err);
    }
  }

  /**
   * Initialize model status tracking
   */
  initializeModelStatus() {
    const allModels = this.getAllModels();
    
    allModels.forEach(model => {
      if (!this.modelStatus.has(model.id)) {
        this.modelStatus.set(model.id, {
          healthy: true,
          lastCheck: Date.now(),
          failureCount: 0,
          successCount: 0,
          lastError: null,
          lastSuccess: null,
          avgResponseTime: 0,
          totalCalls: 0
        });
      }
    });
  }
  
  /**
   * Get all available models
   * @returns {Array} - All models from all categories
   */
  getAllModels() {
    return [
      ...this.modelConfig.primaryModels,
      ...this.modelConfig.fallbackModels,
      ...this.modelConfig.offlineModels
    ];
  }

  /**
   * Update a model's health status
   * @param {string} modelId - The model ID to update
   * @param {boolean} isHealthy - Whether the model is healthy
   * @param {Error|null} error - Error if applicable
   * @param {number} responseTime - Response time in ms (for successful calls)
   */
  updateModelStatus(modelId, isHealthy, error = null, responseTime = 0) {
    const status = this.modelStatus.get(modelId) || {
      healthy: true,
      lastCheck: Date.now(),
      failureCount: 0,
      successCount: 0,
      lastError: null,
      lastSuccess: null,
      avgResponseTime: 0,
      totalCalls: 0
    };
    
    if (isHealthy) {
      // Update success metrics
      status.healthy = true;
      status.failureCount = 0;
      status.lastError = null;
      status.successCount += 1;
      status.lastSuccess = Date.now();
      
      // Update response time metrics
      if (responseTime > 0) {
        if (status.totalCalls > 0) {
          status.avgResponseTime = 
            (status.avgResponseTime * status.totalCalls + responseTime) / 
            (status.totalCalls + 1);
        } else {
          status.avgResponseTime = responseTime;
        }
      }
      
      status.totalCalls += 1;
    } else {
      // Update failure metrics
      status.healthy = false;
      status.failureCount += 1;
      status.lastError = error;
      status.totalCalls += 1;
    }
    
    // Mark as unhealthy if too many failures
    if (status.failureCount >= this.modelConfig.maxRetries) {
      status.healthy = false;
    }
    
    status.lastCheck = Date.now();
    this.modelStatus.set(modelId, status);
    
    // Log status changes for debugging
    log.debug(`Model ${modelId} status updated: healthy=${status.healthy}, failures=${status.failureCount}, successes=${status.successCount}`);
  }

  /**
   * Get a list of healthy models, prioritized by type and status
   * @param {boolean} isOffline - Whether we're currently offline
   * @returns {Array} List of available models
   */
  getAvailableModels(isOffline = false) {
    let modelPool;
    const allModels = [
      ...this.modelConfig.primaryModels,
      ...this.modelConfig.fallbackModels,
      ...this.modelConfig.offlineModels
    ];
    
    if (isOffline) {
      // When offline, use offline models + any fallback models with offline capability
      modelPool = [
        ...this.modelConfig.offlineModels,
        ...this.modelConfig.fallbackModels.filter(m => m.offlineCapable)
      ];
    } else {
      // When online, start with primary models, then include fallbacks if enabled
      modelPool = [...this.modelConfig.primaryModels];
      if (this.modelConfig.enableFallbacks) {
        modelPool = [...modelPool, ...this.modelConfig.fallbackModels];
      }
    }
    
    // If user has configured a priority order, use that to sort the models
    if (this.modelConfig.userPriorityOrder && this.modelConfig.userPriorityOrder.length > 0) {
      // Sort models based on user priority - models not in priority list will be at the end
      return modelPool.sort((a, b) => {
        const aIndex = this.modelConfig.userPriorityOrder.indexOf(a.id);
        const bIndex = this.modelConfig.userPriorityOrder.indexOf(b.id);
        
        // If both models are in the priority list, sort by index
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only one model is in the priority list, it should come first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither model is in the priority list, maintain original order
        return 0;
      });
    }
    
    // Filter out unhealthy models with too many failures
    return modelPool.filter(model => {
      const status = this.modelStatus.get(model.id);
      if (!status) return true; // No status yet, assume healthy
      return status.healthy || status.failureCount < this.modelConfig.maxRetries;
    }).sort((a, b) => a.priority - b.priority); // Sort by priority
  }

  /**
   * Try to get a response from models with automatic fallbacks
   * @param {Function} apiCallFn - Function to call the model API
   * @param {Object} params - Parameters for the API call
   * @returns {Promise<Object>} The model response
   */
  async getModelResponse(apiCallFn, params) {
    const isOffline = !(await api.isOnline());
    const availableModels = this.getAvailableModels(isOffline);
    
    if (availableModels.length === 0) {
      throw new Error("No available AI models found. Please check your network connection or configuration.");
    }
    
    // Try each model in sequence
    let lastError = null;
    for (const model of availableModels) {
      try {
        log.info(`Trying model: ${model.id} (${model.provider})`);
        
        // Add exponential backoff for retries
        const modelStatus = this.modelStatus.get(model.id);
        const retryCount = modelStatus ? modelStatus.failureCount : 0;
        
        if (retryCount > 0) {
          const delay = Math.min(
            this.modelConfig.retryDelay * Math.pow(2, retryCount - 1),
            10000 // Max 10 seconds
          );
          log.info(`Backing off for ${delay}ms before retrying ${model.id}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Call the API with this model
        const response = await apiCallFn({
          ...params,
          modelId: model.id,
          provider: model.provider
        });
        
        // Mark this model as healthy
        this.updateModelStatus(model.id, true);
        
        // Add metadata about which model was used
        return {
          ...response,
          _modelInfo: {
            id: model.id,
            name: model.name,
            provider: model.provider,
            wasFallback: model.id !== this.modelConfig.primaryModels[0]?.id,
            offlineMode: isOffline
          }
        };
      } catch (error) {
        log.error(`Error with model ${model.id}:`, error);
        this.updateModelStatus(model.id, false, error);
        lastError = error;
        // Continue to next model
      }
    }
    
    // If we get here, all models failed
    throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Record a successful API call for a model
   * @param {string} modelId - The model ID that succeeded
   * @param {Object} response - The API response
   * @param {number} responseTime - Response time in ms
   */
  recordSuccess(modelId, response = {}, responseTime = 0) {
    if (!modelId) return;
    
    log.info(`Model ${modelId} API call succeeded in ${responseTime}ms`);    
    this.updateModelStatus(modelId, true, null, responseTime);
    
    // Update active model
    this.activeModel = modelId;
    
    // Update recently used models
    this.lastUsedModels = [
      modelId,
      ...this.lastUsedModels.filter(id => id !== modelId)
    ].slice(0, 5); // Keep only the 5 most recent
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('lastActiveModel', modelId);
      localStorage.setItem('lastUsedModels', JSON.stringify(this.lastUsedModels));
    } catch (e) {
      log.warn('Failed to save active model to localStorage:', e);
    }
  }

  /**
   * Get model health statistics for the UI
   * @returns {Object} - Health statistics for all models
   */
  getModelHealthStats() {
    let healthyModels = 0;
    let unhealthyModels = 0;
    const modelStats = {};
    
    this.modelStatus.forEach((status, modelId) => {
      modelStats[modelId] = {
        healthy: status.healthy,
        lastCheck: status.lastCheck,
        failureCount: status.failureCount,
        successCount: status.successCount,
        avgResponseTime: status.avgResponseTime,
        totalCalls: status.totalCalls
      };
      
      if (status.healthy) {
        healthyModels++;
      } else {
        unhealthyModels++;
      }
    });
    
    // Get model details for active model
    const activeModelDetails = this.activeModel ? {
      id: this.activeModel,
      provider: this.activeModel.split(':')[0],
      model: this.activeModel.split(':')[1] || 'default',
      lastUsed: Date.now(),
      isFallback: this.isModelFallback(this.activeModel)
    } : null;
    
    // Get user priority information
    const userPriority = this.modelConfig.userPriorityOrder || [];
    
    return {
      healthyModels,
      unhealthyModels,
      totalModels: healthyModels + unhealthyModels,
      models: modelStats,
      activeModel: activeModelDetails,
      userPriority: userPriority,
      lastUsedModels: this.lastUsedModels.slice(0, 3) // Last 3 models used
    };
  }
  
  /**
   * Check if a model is a fallback model
   * @param {string} modelId - The model ID to check
   * @returns {boolean} - True if this is a fallback model
   */
  isModelFallback(modelId) {
    if (!modelId) return false;
    
    // If it's in the primary models list and at the top of user priority, it's not a fallback
    const isPrimary = this.modelConfig.primaryModels.some(m => m.id === modelId);
    const userPriority = this.modelConfig.userPriorityOrder;
    
    if (userPriority && userPriority.length > 0) {
      return userPriority[0] !== modelId;
    }
    
    // If not in user priority, use the default categorization
    return !isPrimary;
  }

  /**
   * Get the next best model to try based on the current model and available models
   * @param {string} currentModelId - The current model that failed
   * @param {Array} preferredModels - Optional list of preferred model IDs in order of preference
   * @returns {Object|null} The next best model to try, or null if no more models available
   */
  getNextBestModel(currentModelId, preferredModels = []) {
    if (!currentModelId) return null;
    
    // Get all available models
    const allModels = this.getAllModels();
    
    // If we have preferred models, try those first
    if (preferredModels && preferredModels.length > 0) {
      // Find the first preferred model that's not the current one and is healthy
      for (const modelId of preferredModels) {
        if (modelId === currentModelId) continue;
        
        const model = allModels.find(m => m.id === modelId);
        if (!model) continue;
        
        const status = this.modelStatus.get(modelId);
        if (!status || status.healthy) {
          return model;
        }
      }
    }
    
    // Otherwise, find the next healthy model that's not the current one
    for (const model of allModels) {
      if (model.id === currentModelId) continue;
      
      const status = this.modelStatus.get(model.id);
      if (!status || status.healthy) {
        return model;
      }
    }
    
    // If no healthy models found, return the first available model that's not the current one
    const nextModel = allModels.find(m => m.id !== currentModelId);
    return nextModel || null;
  }

  /**
   * Reset all model health status
   */
  resetModelHealth() {
    this.modelStatus.forEach((status, modelId) => {
      status.healthy = true;
      status.failureCount = 0;
      status.lastError = null;
      status.lastCheck = Date.now();
      // Keep success metrics for historical data
      this.modelStatus.set(modelId, status);
    });
    
    log.info('All model health statuses have been reset');
    
    // Force refresh active model status
    if (this.activeModel) {
      this.recordSuccess(this.activeModel, {}, 0);
    }
    
    // Try to restore initial active model from local storage
    try {
      const savedActiveModel = localStorage.getItem('lastActiveModel');
      if (savedActiveModel) {
        this.activeModel = savedActiveModel;
      }
      
      const savedUsedModels = localStorage.getItem('lastUsedModels');
      if (savedUsedModels) {
        this.lastUsedModels = JSON.parse(savedUsedModels);
      }
    } catch (e) {
      log.warn('Failed to restore active model data:', e);
    }
  }
}

// Create and export singleton instance
const modelFallbackManager = new ModelFallbackManager();
export default modelFallbackManager;

// Export class for testing or custom instances
export { ModelFallbackManager };
