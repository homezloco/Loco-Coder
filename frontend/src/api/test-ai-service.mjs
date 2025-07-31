import aiService from './modules/ai-new.js';

// Test configuration
const MESSAGE_TIMEOUT = 300000; // 5 minutes max per message
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// Debug logging
const debugLog = (...args) => console.log('[TEST]', ...args);
const debugError = (...args) => console.error('[TEST ERROR]', ...args);

// Test messages with expected max duration (in ms)
const TEST_MESSAGES = [
  { 
    text: 'Hello, world!', 
    timeout: 10000, // 10 seconds
    description: 'Simple greeting',
    options: {
      temperature: 0.7,
      max_tokens: 100
    }
  },
  {
    text: 'What is the capital of France?',
    timeout: 15000, // 15 seconds
    description: 'Basic fact question',
    options: {
      temperature: 0.3,
      max_tokens: 50
    }
  },
  {
    text: 'Write a Python function to calculate factorial',
    timeout: 30000, // 30 seconds
    description: 'Simple code generation',
    options: {
      temperature: 0.2,
      max_tokens: 200
    }
  }
];

// Helper function for retry logic with better error handling
function withRetry(fn, description, maxRetries = MAX_RETRIES, baseDelay = INITIAL_RETRY_DELAY, maxDuration = MESSAGE_TIMEOUT) {
  let lastError;
  let attempt = 0;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const attemptFn = async () => {
      attempt++;
      const attemptStartTime = Date.now();
      
      try {
        debugLog(`Attempt ${attempt}/${maxRetries} - ${description}`);
        const result = await fn(attempt);
        debugLog(`Attempt ${attempt} succeeded after ${Date.now() - attemptStartTime}ms`);
        resolve(result);
      } catch (error) {
        lastError = error;
        const elapsed = Date.now() - startTime;
        
        // Log the error with context
        debugError(`Attempt ${attempt} failed after ${elapsed}ms:`, error.message);
        
        // Check if we should retry
        if (attempt >= maxRetries || elapsed >= maxDuration) {
          debugError(`All ${maxRetries} retry attempts failed or max duration reached`);
          reject(lastError);
          return;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          Math.floor(baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5)),
          maxDuration - elapsed
        );
        
        debugLog(`Retrying in ${delay}ms... (${maxRetries - attempt} attempts remaining)`);
        setTimeout(attemptFn, delay);
      }
    };
    
    attemptFn();
  });
}

// Main test function
async function runTests() {
  try {
    debugLog('Starting AI service tests...');
    
    // 1. Test service initialization
    debugLog('Testing service initialization...');
    if (!aiService) {
      throw new Error('AI service not properly initialized');
    }
    
    // 2. Test basic chat functionality
    debugLog('Testing basic chat functionality...');
    const testPromises = TEST_MESSAGES.map((test, index) => {
      return withRetry(
        async (attempt) => {
          const startTime = Date.now();
          debugLog(`[Test ${index + 1}] Sending message: "${test.text}"`);
          
          const response = await aiService.chat(test.text, {
            ...test.options,
            retry: attempt < MAX_RETRIES
          });
          
          const duration = Date.now() - startTime;
          
          if (!response || !response.success) {
            throw new Error(response?.error || 'Invalid response format');
          }
          
          debugLog(`[Test ${index + 1}] Received response in ${duration}ms`);
          
          return {
            test,
            response,
            duration,
            success: true
          };
        },
        `Test ${index + 1}: ${test.text}`,
        MAX_RETRIES,
        INITIAL_RETRY_DELAY,
        test.timeout
      ).catch(error => ({
        test,
        error: error.message,
        success: false
      }));
    });
    
    const results = await Promise.all(testPromises);
    
    // 3. Print test summary
    console.log('\n=== Test Results ===');
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach((result, index) => {
      if (result.success) {
        successCount++;
        console.log(`✅ [${index + 1}/${results.length}] ${result.test.description || 'Test'}`);
        console.log(`   Message: "${result.test.text}"`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Model: ${result.response.model || 'default'}`);
        console.log(`   Response: ${JSON.stringify(result.response.data).substring(0, 100)}...`);
      } else {
        failureCount++;
        console.log(`❌ [${index + 1}/${results.length}] ${result.test.description || 'Test'}`);
        console.log(`   Message: "${result.test.text}"`);
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });
    
    console.log(`\nTests completed: ${successCount} passed, ${failureCount} failed`);
    
    if (failureCount > 0) {
      throw new Error(`${failureCount} test(s) failed`);
    }
    
    return {
      success: true,
      passed: successCount,
      failed: failureCount,
      results
    };
    
  } catch (error) {
    debugError('Test suite failed:', error);
    return {
      success: false,
      error: error.message,
      passed: 0,
      failed: 1,
      results: []
    };
  }
}

// Run the tests immediately when this file is executed
(async () => {
  try {
    console.log('Starting AI Service Tests...\n');
    const result = await runTests();
    
    if (result.success) {
      console.log('\n✅ All tests passed successfully!');
    } else {
      console.error('\n❌ Some tests failed');
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Unhandled error in test script:', error);
    process.exit(1);
  }
})();

export default runTests;
