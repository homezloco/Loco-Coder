// Test file to verify the simplified AI service
import { createAiService } from './modules/ai';

console.log('[Test] Starting AI service test...');
console.log('[Test] AI Service:', aiService);
console.log('[Test] AI Service type:', typeof aiService);
console.log('[Test] AI Service methods:', Object.keys(aiService).filter(key => typeof aiService[key] === 'function'));

// Test if chat method exists and is callable
if (aiService && typeof aiService.chat === 'function') {
  console.log('[Test] chat method exists and is callable');
  
  // Test a simple chat request
  console.log('[Test] Sending test chat request...');
  aiService.chat('Test message from simple AI service test')
    .then(response => {
      console.log('[Test] Chat response:', response);
    })
    .catch(error => {
      console.error('[Test] Chat error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    });
} else {
  console.error('[Test] chat method is not available or not a function');
  console.error('[Test] aiService:', aiService);
  console.error('[Test] aiService.chat:', aiService?.chat);
  console.error('[Test] aiService prototype:', Object.getPrototypeOf(aiService || {}));
}
