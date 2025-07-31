import { httpClient } from '../utils/httpClient';
import { DEFAULT_CONFIG, API_ENDPOINTS } from '../config/defaults';

/**
 * Chat service for interacting with the AI chat API
 */
class ChatService {
  constructor() {
    this.config = { ...DEFAULT_CONFIG.ollama };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - Configuration overrides
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Send a chat message
   * @param {string} prompt - The user's message
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The AI's response
   */
  async send(prompt, options = {}) {
    const {
      model = this.config.model,
      temperature = this.config.temperature,
      top_p = this.config.top_p,
      max_tokens = this.config.max_tokens,
      stream = false,
      ...restOptions
    } = options;

    try {
      const response = await httpClient.post(API_ENDPOINTS.CHAT, {
        model,
        prompt,
        temperature,
        top_p,
        max_tokens,
        stream,
        ...restOptions
      });

      return response.data;
    } catch (error) {
      console.error('[ChatService] Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * Stream chat responses
   * @param {string} prompt - The user's message
   * @param {Object} options - Additional options
   * @returns {AsyncGenerator<Object>} Stream of response chunks
   */
  async *stream(prompt, options = {}) {
    const response = await this.send(prompt, { ...options, stream: true });
    
    // Process streaming response if needed
    // This is a simplified version - implement actual streaming logic here
    for (const chunk of response) {
      yield chunk;
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService();
