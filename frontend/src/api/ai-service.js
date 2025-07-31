// Minimal AI service implementation
console.log('[AI Service] Initializing AI service module...');
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Update with your actual API URL
console.log('[AI Service] Using API base URL:', API_BASE_URL);

// Create a simple AI service object
const aiService = {
  async chat(prompt, options = {}) {
    try {
      console.log('[AI Service] Sending chat request with prompt:', prompt);
      
      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        { 
          prompt,
          ...options 
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      
      console.log('[AI Service] Chat response received');
      return response.data;
    } catch (error) {
      console.error('[AI Service] Error in chat:', error);
      throw error;
    }
  }
};

// Export the service directly
export default aiService;
