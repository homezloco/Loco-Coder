import { httpClient } from '../utils/httpClient';
import { DEFAULT_CONFIG, API_ENDPOINTS } from '../config/defaults';

/**
 * Service for managing AI models
 */
class ModelService {
  constructor() {
    this.availableModels = [];
    this.defaultModel = DEFAULT_CONFIG.ollama.model;
    this.fallbackModels = [...DEFAULT_CONFIG.fallbackModels];
  }

  /**
   * Get available models from the server
   * @param {boolean} forceRefresh - Force refresh the model list
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels(forceRefresh = false) {
    if (this.availableModels.length > 0 && !forceRefresh) {
      return this.availableModels;
    }

    try {
      const response = await httpClient.get(API_ENDPOINTS.MODELS);
      this.availableModels = response.data.models || [];
      return this.availableModels;
    } catch (error) {
      console.error('[ModelService] Error fetching available models:', error);
      // Return fallback models if API fails
      return this.fallbackModels.map(model => ({
        name: model,
        id: model,
        supports_chat: true,
        supports_execution: true
      }));
    }
  }

  /**
   * Get model information
   * @param {string} modelId - The model ID
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(modelId) {
    try {
      const models = await this.getAvailableModels();
      const model = models.find(m => m.id === modelId || m.name === modelId);
      
      if (model) {
        return model;
      }
      
      // Return default model info if not found
      return {
        id: modelId,
        name: modelId,
        supports_chat: true,
        supports_execution: true,
        max_tokens: 2000,
        is_fallback: true
      };
    } catch (error) {
      console.error(`[ModelService] Error getting info for model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Set the default model
   * @param {string} modelId - The model ID to set as default
   */
  setDefaultModel(modelId) {
    this.defaultModel = modelId;
  }

  /**
   * Get the default model
   * @returns {string} Default model ID
   */
  getDefaultModel() {
    return this.defaultModel;
  }
}

// Export a singleton instance
export const modelService = new ModelService();
