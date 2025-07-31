// Main entry point for the AI service
import { chatService } from './services/chatService';
import { executionService } from './services/executionService';
import { modelService } from './services/modelService';
import { DEFAULT_CONFIG } from './config/defaults';

/**
 * Main AI service that provides access to all AI functionality
 */
class AIService {
  constructor() {
    this.chat = chatService;
    this.execute = executionService;
    this.models = modelService;
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Configure the AI service
   * @param {Object} config - Configuration options
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    
    // Update sub-services with new configuration
    if (config.ollama) {
      this.chat.configure(config.ollama);
    }
    
    if (config.fallbackModels) {
      this.models.fallbackModels = [...config.fallbackModels];
    }
  }

  /**
   * Check if the AI service is available
   * @returns {Promise<boolean>} True if the service is available
   */
  async isAvailable() {
    try {
      await this.models.getAvailableModels();
      return true;
    } catch (error) {
      console.error('[AIService] Service not available:', error);
      return false;
    }
  }

  /**
   * Get the current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

// Create and export a singleton instance
export const aiService = new AIService();

// For backward compatibility
export default aiService;
