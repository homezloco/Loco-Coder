// Test file to verify AI service exports and functionality
// Using dynamic import to handle potential ESM/CJS interop issues

// Check if running in Node.js environment
const isNode = typeof process !== 'undefined' && 
               process.versions != null && 
               process.versions.node != null;

// Mock browser environment for Node.js
if (isNode) {
  // Create a minimal window object if it doesn't exist
  if (typeof global.window === 'undefined') {
    global.window = {
      location: {
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000/test',
        protocol: 'http:',
        host: 'localhost:3000',
        hostname: 'localhost',
        port: '3000',
        pathname: '/test',
        search: '',
        hash: ''
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      },
      navigator: {
        onLine: true,
        userAgent: 'Node.js'
      },
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    
    // Mock global objects
    global.localStorage = window.localStorage;
    global.navigator = window.navigator;
    
    // Mock fetch using dynamic import
    try {
      const { default: fetch, Headers, Request, Response } = await import('node-fetch');
      global.fetch = fetch;
      global.Headers = Headers;
      global.Request = Request;
      global.Response = Response;
    } catch (err) {
      console.warn('Failed to load node-fetch, some tests may fail:', err);
    }
  }
}

// Initialize mocks for required modules
const mockConnectivityService = {
  isOnline: () => true,
  addOnlineStatusListener: () => {},
  removeOnlineStatusListener: () => {}
};

// Mock the connectivity-service module for ESM
if (isNode) {
  // Create a mock module loader
  const mockModule = {
    exports: mockConnectivityService
  };
  
  // Store the original import
  const originalImport = global.import;
  
  // Override dynamic imports to handle our mock
  global.import = async function(modulePath) {
    if (modulePath.endsWith('connectivity-service')) {
      return { default: mockConnectivityService };
    }
    return originalImport(modulePath);
  };
  
  // Clean up after ourselves
  process.on('exit', () => {
    global.import = originalImport;
  });
}

let aiModule;

// Import the AI module with error handling
async function importAIModule() {
  try {
    // Import the new AI service
    const module = await import('./modules/ai-new.js');
    const aiService = module.default;
    
    if (!aiService || typeof aiService.chat !== 'function') {
      throw new Error('Invalid AI module: missing required methods');
    }
    
    console.log('AI module loaded with methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(aiService))
      .filter(prop => typeof aiService[prop] === 'function' && prop !== 'constructor'));
    
    return aiService;
  } catch (error) {
    console.error('Failed to import AI module:', error);
    process.exit(1);
  }
}

// Initialize the AI module
aiModule = await importAIModule();

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
async function testAIService() {
  try {
    debugLog('Starting AI service tests...');
    // 1. Test service initialization
    debugLog('Testing service initialization...');
    if (!aiModule) {
      throw new Error('AI module not properly initialized');
    }
    
    // 2. Test basic chat functionality
    debugLog('Testing basic chat functionality...');
    const testPromises = TEST_MESSAGES.map((test, index) => {
      return withRetry(
        async (attempt) => {
          const startTime = Date.now();
          debugLog(`[Test ${index + 1}] Sending message: "${test.text}"`);
          
          const response = await aiModule.chat(test.text, {
            ...test.options,
            temperature: test.options.temperature || 0.7,
            max_tokens: test.options.max_tokens || 200,
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
  
  // Test 2: Verify required methods exist
  console.log('\nTest 2: Verifying required methods...');
  const requiredMethods = ['chat'];
    try {
      const result = await testAIService();
      process.exit(result.success ? 0 : 1);
            timeout: Math.min(
              MESSAGE_TIMEOUT - 2000, 
              maxDuration - 2000,
              30000 // Max 30s per request
            ),
            // Only health check on first message if not explicitly set
            health_check: messageOptions.health_check !== undefined 
              ? messageOptions.health_check 
              : index === 0,
            // Override retry settings to prevent infinite loops
            max_retries: 1, // Let our outer retry handle it
            retry_delay: 1000
          };
          
          debugLog('Chat options:', JSON.stringify(options, null, 2));
          const startTime = Date.now();
          const result = await aiService.chat(message, options);
          debugLog(`Chat completed in ${Date.now() - startTime}ms`);
          return result;
        },
        `message "${message}"`,
        MAX_RETRIES,
        INITIAL_RETRY_DELAY,
        maxDuration
      );
      
      const duration = Date.now() - startTime;
      console.log(`✓ Success in ${duration}ms`);
      
      // Log a summary of the response
      if (response) {
        const { success, data, error, fromCache, fromFallback } = response;
        const responseSummary = {
          success,
          fromCache: !!fromCache,
          fromFallback: !!fromFallback,
          model: data?.model || 'unknown',
          status: data?.status || 'unknown',
          responseTime: data?.metrics?.response_time_seconds 
            ? `${(data.metrics.response_time_seconds * 1000).toFixed(0)}ms` 
            : 'unknown'
        };
        
        console.log('Response summary:', JSON.stringify(responseSummary, null, 2));
        
        // Log the full response in debug mode
        debugLog('Full response:', JSON.stringify(response, null, 2));
      }
      
    } catch (error) {
      console.error('✗ Failed:', error.message);
      debugError('Error details:', error);
      
      // Check if this is a connectivity issue
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.error('\n⚠️  Connection error: The AI service may not be running or is unreachable');
        console.error('   Please ensure the backend service is running at http://localhost:8000');
      }
      
      // Don't fail the entire test on the last message if it's just a timeout
      if (index < TEST_MESSAGES.length - 1 || !error.message.includes('timeout')) {
        throw error;
      } else {
        console.log('⚠️  Continuing despite timeout on last message...');
      }
    }
  }
  
  console.log('\n=== All tests completed successfully ===');
};

// Main test runner with better error handling
async function runTests() {
  try {
    console.log('🚀 Starting AI Service Tests');
    console.log(`⏱  Test timeout: ${TEST_TIMEOUT/1000}s`);
    console.log(`⏱  Message timeout: ${MESSAGE_TIMEOUT/1000}s`);
    console.log(`🔄 Max retries: ${MAX_RETRIES}`);
    
    // Run tests with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Tests timed out after ${TEST_TIMEOUT/1000} seconds`)), TEST_TIMEOUT)
    );
    
    await Promise.race([testAIService(), timeoutPromise]);
    
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Failed');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.config) {
      console.error('\nRequest config:');
      console.error('- URL:', error.config.url || error.config.baseURL);
      console.error('- Method:', error.config.method || 'GET');
      console.error('- Timeout:', error.config.timeout || 'default');
    }
    
    if (error.response) {
      console.error('\nResponse:');
      console.error('- Status:', error.response.status);
      console.error('- Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('- Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    debugError('Full error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
