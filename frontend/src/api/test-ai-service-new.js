import aiService from './modules/ai-new.js';

// Test configuration
const MESSAGE_TIMEOUT = 300000; // 5 minutes max per message
const MAX_RETRIES = 2; // Reduced since we have better error handling now
const INITIAL_RETRY_DELAY = 3000; // 3 seconds

// Model configuration - using known working models from Ollama
const MODEL_CONFIG = {
  model: 'codellama:instruct',
  fallbackModels: ['codellama:7b-instruct-q4_0'],
  options: {
    temperature: 0.2, // Lower temperature for more deterministic responses
    top_p: 0.9,
    num_ctx: 4096,
    num_thread: 4
  }
};

// Enhanced debug logging with timestamps
const debugLog = (...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [TEST]`, ...args);
};

const debugError = (...args) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [TEST ERROR]`, ...args);
};

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
  },
  {
    text: 'Explain quantum computing in simple terms',
    timeout: 60000, // 1 minute
    description: 'Concept explanation',
    options: {
      temperature: 0.5,
      max_tokens: 300
    }
  },
  {
    text: 'Generate a React component for a todo list',
    timeout: 120000, // 2 minutes
    description: 'Complex code generation',
    options: {
      temperature: 0.3,
      max_tokens: 500
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
          const testId = `Test-${index + 1}-${Date.now()}`;
          
          debugLog(`[${testId}] Starting test: "${test.description || 'Untitled Test'}"`);
          debugLog(`[${testId}] Sending message: "${test.text}"`);
          
          try {
            const requestStart = Date.now();
            const response = await aiService.chat(test.text, {
              ...MODEL_CONFIG.options,
              ...test.options,
              temperature: test.options?.temperature || MODEL_CONFIG.options.temperature,
              max_tokens: test.options?.max_tokens || 500,
              model: MODEL_CONFIG.model,
              retry: attempt < MAX_RETRIES - 1, // Don't retry on last attempt
              timeout: Math.min(test.timeout || MESSAGE_TIMEOUT, 60000) // Max 60s per request
            });
            
            const requestTime = Date.now() - requestStart;
            debugLog(`[${testId}] Request completed in ${requestTime}ms`);
            
            if (!response) {
              throw new Error('Empty response from AI service');
            }
            
            if (response.error) {
              throw new Error(`AI service error: ${response.error}`);
            }
            
            const result = {
              ...response,
              model: response.model || MODEL_CONFIG.model,
              requestTime
            };
            
            return {
              test,
              response: result,
              duration: Date.now() - startTime,
              success: true
            };
          } catch (error) {
            debugError(`[${testId}] Request failed:`, error.message);
            throw error; // Re-throw to trigger retry logic
          }
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

// Export for potential module usage
export default runTests;
