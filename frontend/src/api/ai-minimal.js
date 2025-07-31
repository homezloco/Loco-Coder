// Minimal AI service implementation with enhanced logging
console.log('[AI Minimal] Initializing minimal AI service...');

const aiService = {
  chat: async (prompt, options = {}) => {
    console.log('[AI Minimal] chat method called with:', { prompt, options });
    try {
      // This is a minimal implementation that just returns a resolved promise
      return { success: true, message: 'Minimal AI service response', prompt };
    } catch (error) {
      console.error('[AI Minimal] Error in chat:', error);
      throw error;
    }
  }
};

console.log('[AI Minimal] Service created with methods:', Object.keys(aiService));

export default aiService;
