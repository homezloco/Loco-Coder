// Simple AI service implementation with minimal dependencies
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Update with your actual API URL

// Create a simple AI service object
const aiService = {
  async chat(prompt, options = {}) {
    try {
      console.log('Sending chat request with prompt:', prompt);
      
      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        { prompt, ...options },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      
      console.log('Chat response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in aiService.chat:', error);
      throw error;
    }
  }
};

// Export the service directly
export default aiService;
