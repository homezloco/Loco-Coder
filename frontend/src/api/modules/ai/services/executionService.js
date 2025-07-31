import { httpClient } from '../utils/httpClient';
import { API_ENDPOINTS } from '../config/defaults';

/**
 * Service for executing code through the AI
 */
class ExecutionService {
  /**
   * Execute code
   * @param {string} code - The code to execute
   * @param {string} language - The programming language
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Execution result
   */
  async execute(code, language = 'python', options = {}) {
    try {
      const response = await httpClient.post(API_ENDPOINTS.EXECUTE, {
        code,
        language,
        ...options
      });

      return response.data;
    } catch (error) {
      console.error('[ExecutionService] Error executing code:', error);
      throw error;
    }
  }

  /**
   * Execute code with a specific model
   * @param {string} code - The code to execute
   * @param {string} model - The model to use
   * @param {string} language - The programming language
   * @returns {Promise<Object>} Execution result
   */
  async executeWithModel(code, model, language = 'python') {
    return this.execute(code, language, { model });
  }
}

// Export a singleton instance
export const executionService = new ExecutionService();
