// aiConnectionHelper.js - Tools to detect, diagnose, and fix AI model connection issues
import logger from './logger';

/**
 * Comprehensive tools for diagnosing AI model connection problems
 * and providing actionable solutions to users
 */

/**
 * Different connection types that might be used
 */
export const CONNECTION_TYPES = {
  OLLAMA_LOCAL: 'ollama_local',
  OLLAMA_REMOTE: 'ollama_remote',
  OPENAI_API: 'openai_api',
  ANTHROPIC_API: 'anthropic_api',
  HUGGINGFACE_API: 'huggingface_api',
  AZURE_OPENAI: 'azure_openai',
  OFFLINE_EMBEDDED: 'offline_embedded'
};

/**
 * Diagnostic tests for different connection types
 */
export const connectionTests = {
  [CONNECTION_TYPES.OLLAMA_LOCAL]: [
    {
      name: 'Ollama Process',
      description: 'Check if Ollama process is running locally',
      test: async () => {
        try {
          // In a browser context, we can only indirectly check via our API
          const response = await fetch('/api/service-status?service=ollama');
          const data = await response.json();
          return {
            success: data.running === true,
            details: data.running ? 'Ollama process detected' : 'Ollama process not detected'
          };
        } catch (error) {
          return {
            success: false,
            details: `Error checking Ollama process: ${error.message}`
          };
        }
      },
      fixSteps: [
        'Install Ollama if not already installed (https://ollama.ai)',
        'Run "ollama serve" to start the Ollama service',
        'Verify Ollama is running with "ollama ps"'
      ]
    },
    {
      name: 'Model Availability',
      description: 'Check if required models are available',
      test: async (modelName = 'codellama:instruct') => {
        try {
          const response = await fetch('/api/model-status?name=' + encodeURIComponent(modelName));
          const data = await response.json();
          return {
            success: data.available === true,
            details: data.available ? `Model ${modelName} is available` : `Model ${modelName} not found`
          };
        } catch (error) {
          return {
            success: false,
            details: `Error checking model availability: ${error.message}`
          };
        }
      },
      fixSteps: [
        'Pull the required model: "ollama pull codellama:instruct"',
        'Verify model is available with "ollama list"',
        'Ensure you have enough disk space for the model'
      ]
    },
    {
      name: 'API Connectivity',
      description: 'Check if the Ollama API endpoint is reachable',
      test: async (port = 11434) => {
        try {
          // Just a health check to see if we can reach the API at all
          const response = await fetch(`/api/health-check?endpoint=ollama&port=${port}`);
          const data = await response.json();
          return {
            success: data.reachable === true,
            details: data.reachable ? 
              `Ollama API reachable on port ${port}` : 
              `Ollama API not reachable on port ${port}`
          };
        } catch (error) {
          return {
            success: false,
            details: `Error checking API connectivity: ${error.message}`
          };
        }
      },
      fixSteps: [
        'Make sure Ollama is running with "ollama serve"',
        'Check if another service is using port 11434',
        'Check your firewall settings',
        'Try restarting the Ollama service'
      ]
    }
  ],
  
  // Other connection types would have their own test arrays here...
  [CONNECTION_TYPES.OFFLINE_EMBEDDED]: [
    {
      name: 'Browser Support',
      description: 'Check if browser supports WebGPU/WebGL for local inference',
      test: async () => {
        const hasWebGPU = 'gpu' in navigator;
        const hasWebGL = !!(
          window.WebGLRenderingContext && 
          (document.createElement('canvas').getContext('webgl') || 
           document.createElement('canvas').getContext('experimental-webgl'))
        );
        
        return {
          success: hasWebGPU || hasWebGL,
          details: hasWebGPU ? 
            'WebGPU supported (best performance)' : 
            hasWebGL ? 
              'WebGL supported (limited performance)' : 
              'Neither WebGPU nor WebGL supported'
        };
      },
      fixSteps: [
        'Update to a modern browser that supports WebGPU (Chrome 113+)',
        'Enable WebGPU in browser settings if available',
        'Ensure hardware acceleration is enabled in your browser'
      ]
    }
  ]
};

/**
 * Run diagnostic tests for a specific connection type
 * @param {string} connectionType - Type of connection to test
 * @param {Object} options - Additional options for tests
 * @returns {Promise<Object>} Test results and recommendations
 */
export async function runDiagnostics(connectionType, options = {}) {
  if (!connectionTests[connectionType]) {
    return {
      success: false,
      message: `Unknown connection type: ${connectionType}`,
      results: []
    };
  }
  
  const tests = connectionTests[connectionType];
  const results = [];
  let overallSuccess = true;
  
  for (const test of tests) {
    const result = await test.test(options[test.name]);
    results.push({
      name: test.name,
      description: test.description,
      success: result.success,
      details: result.details,
      fixSteps: result.success ? [] : test.fixSteps
    });
    
    if (!result.success) {
      overallSuccess = false;
    }
  }
  
  return {
    success: overallSuccess,
    connectionType,
    message: overallSuccess ? 
      `All ${connectionType} connection tests passed` : 
      `Some ${connectionType} connection tests failed`,
    results
  };
}

/**
 * Get recommended actions based on diagnostic results
 * @param {Object} diagnosticResults - Results from runDiagnostics
 * @returns {Object} Recommended actions with priority levels
 */
export function getRecommendedActions(diagnosticResults) {
  if (diagnosticResults.success) {
    return {
      criticalActions: [],
      recommendedActions: [],
      optionalActions: ['Periodically update your models for best performance']
    };
  }
  
  const criticalActions = [];
  const recommendedActions = [];
  const optionalActions = [];
  
  // Process failed tests
  diagnosticResults.results.forEach(result => {
    if (!result.success) {
      // Add the first fix step to critical actions
      if (result.fixSteps.length > 0) {
        criticalActions.push(result.fixSteps[0]);
      }
      
      // Add remaining steps to recommended actions
      if (result.fixSteps.length > 1) {
        recommendedActions.push(...result.fixSteps.slice(1));
      }
    }
  });
  
  // Add a fallback recommendation if appropriate
  if (diagnosticResults.connectionType === CONNECTION_TYPES.OLLAMA_LOCAL && criticalActions.length > 0) {
    optionalActions.push('Switch to offline mode while fixing Ollama issues');
  }
  
  return {
    criticalActions,
    recommendedActions,
    optionalActions
  };
}

/**
 * Format diagnostic results into a user-friendly HTML report
 * @param {Object} diagnosticResults - Results from runDiagnostics
 * @returns {string} HTML formatted report
 */
export function formatDiagnosticReport(diagnosticResults) {
  const { criticalActions, recommendedActions, optionalActions } = 
    getRecommendedActions(diagnosticResults);
  
  let html = `<div class="diagnostic-report">
    <h3 class="text-lg font-medium mb-2">${diagnosticResults.connectionType} Connection Report</h3>
    <div class="status ${diagnosticResults.success ? 'text-green-600' : 'text-red-600'} mb-4">
      ${diagnosticResults.message}
    </div>
    <div class="test-results mb-4">`;
  
  diagnosticResults.results.forEach(result => {
    const statusClass = result.success ? 'text-green-600' : 'text-red-600';
    const statusIcon = result.success ? '✓' : '✗';
    
    html += `<div class="test-result mb-2 pb-2 border-b">
      <div class="flex justify-between">
        <span class="font-medium">${result.name}</span>
        <span class="${statusClass}">${statusIcon}</span>
      </div>
      <div class="text-sm text-gray-600">${result.details}</div>
    </div>`;
  });
  
  html += `</div>`;
  
  if (criticalActions.length > 0) {
    html += `<div class="critical-actions mb-3">
      <h4 class="font-medium text-red-600">Critical Actions:</h4>
      <ul class="list-disc pl-5">
        ${criticalActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
    </div>`;
  }
  
  if (recommendedActions.length > 0) {
    html += `<div class="recommended-actions mb-3">
      <h4 class="font-medium text-yellow-600">Recommended Actions:</h4>
      <ul class="list-disc pl-5">
        ${recommendedActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
    </div>`;
  }
  
  if (optionalActions.length > 0) {
    html += `<div class="optional-actions">
      <h4 class="font-medium text-blue-600">Optional Actions:</h4>
      <ul class="list-disc pl-5">
        ${optionalActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
    </div>`;
  }
  
  html += `</div>`;
  return html;
}

/**
 * Check for common configuration issues
 * @returns {Promise<Object>} Configuration status and recommendations
 */
export async function checkConfiguration() {
  // Example implementation that could be expanded
  const checks = {
    backendConnectivity: false,
    ollamaConfigured: false,
    modelAvailable: false
  };
  
  try {
    // Check backend connectivity
    const healthResponse = await fetch('/health');
    checks.backendConnectivity = healthResponse.ok;
    
    if (checks.backendConnectivity) {
      // Check Ollama configuration
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      checks.ollamaConfigured = !!config.ollama_url && !!config.ollama_model;
      
      // Check model availability
      if (checks.ollamaConfigured) {
        const modelResponse = await fetch('/api/model-status?name=' + encodeURIComponent(config.ollama_model));
        const modelStatus = await modelResponse.json();
        checks.modelAvailable = modelStatus.available;
      }
    }
  } catch (error) {
    logger.ns('api:connectivity:helper').error('Error checking configuration', { error });
  }
  
  return {
    checks,
    allPassed: Object.values(checks).every(Boolean),
    recommendations: !checks.backendConnectivity ? [
      "Backend server appears to be offline. Start the server with 'python main.py' from the backend directory."
    ] : !checks.ollamaConfigured ? [
      "Ollama configuration missing. Check your .env file for OLLAMA_URL and OLLAMA_MODEL settings."
    ] : !checks.modelAvailable ? [
      "Required model not available. Pull the model with 'ollama pull codellama:instruct'."
    ] : []
  };
}

export default {
  CONNECTION_TYPES,
  runDiagnostics,
  getRecommendedActions,
  formatDiagnosticReport,
  checkConfiguration
};
