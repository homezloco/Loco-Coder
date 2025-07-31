// aiModelManager.js - AI model selection, fallback logic and API routing
import { selectConsensusModels, processConsensusVotes } from './modelConfig';

/**
 * Handles the selection of an appropriate AI model based on settings, availability, and network status
 * @param {Object} settings - User settings including model preferences
 * @param {boolean} isOffline - Whether the application is currently offline
 * @param {Array} availableModels - Array of available AI models
 * @returns {Object} Selected model and fallback options
 */
export async function selectAIModel(settings, isOffline, availableModels) {
  // Default to the active model from settings or fallback to first available
  const activeModelId = settings.activeModel || 'gpt-4-turbo';
  const activeModel = availableModels.find(model => model.id === activeModelId);
  
  // If we have the active model and we're online (for cloud) or it's local, use it
  if (activeModel && (!isOffline || activeModel.type === 'local')) {
    return {
      selectedModel: activeModel,
      fallbackModels: settings.useFallbackModels ? generateFallbackList(activeModel, settings, isOffline, availableModels) : [],
      consensusModels: settings.consensus?.enabled ? 
        selectConsensusModels(availableModels, settings.consensus, isOffline) : []
    };
  }
  
  // We're offline or the selected model is unavailable - need fallback
  // First try to find a local model if offline and preferLocalModels is enabled
  if (isOffline && settings.preferLocalModels) {
    const localModels = availableModels.filter(model => model.type === 'local');
    
    if (localModels.length > 0) {
      // Sort by priority (lower is better)
      const sortedLocalModels = [...localModels].sort((a, b) => a.priority - b.priority);
      
      return {
        selectedModel: sortedLocalModels[0],
        fallbackModels: sortedLocalModels.slice(1),
        isUsingFallback: true,
        fallbackReason: 'Offline - using local model',
        consensusModels: settings.consensus?.enabled ? 
          selectConsensusModels(localModels, settings.consensus, true) : []
      };
    }
  }
  
  // If we get here, we can't serve the request with available models
  return {
    selectedModel: null,
    fallbackModels: [],
    error: isOffline ? 
      'You are offline and no local models are available' : 
      `Model ${activeModelId} is unavailable and no fallback models are configured`,
    consensusModels: []
  };
}

/**
 * Generate an ordered list of fallback models
 * @param {Object} primaryModel - The primary model to exclude from fallbacks
 * @param {Object} settings - User settings
 * @param {boolean} isOffline - Whether we're currently offline
 * @param {Array} availableModels - All available models
 * @returns {Array} Ordered list of fallback models
 */
function generateFallbackList(primaryModel, settings, isOffline, availableModels) {
  // Create a copy of models to work with
  const fallbackCandidates = [...availableModels].filter(model => {
    // Don't include the primary model in fallbacks
    if (model.id === primaryModel.id) return false;
    
    // When offline, only include local models
    if (isOffline && model.type !== 'local') return false;
    
    // For cloud models, check if we have the API key configured
    if (model.type === 'cloud' && model.provider) {
      const apiKeyAvailable = settings.apiKeys && settings.apiKeys[model.provider];
      if (!apiKeyAvailable) return false;
    }
    
    // For local models, check if we have a path configured
    if (model.type === 'local') {
      const modelPathAvailable = settings.localModelPaths && settings.localModelPaths[model.id];
      if (!modelPathAvailable) return false;
    }
    
    return true;
  });
  
  // Sort by priority first (lower is better)
  fallbackCandidates.sort((a, b) => a.priority - b.priority);
  
  // Then sort so that local models come first if offline or preferLocalModels is true
  if (isOffline || settings.preferLocalModels) {
    fallbackCandidates.sort((a, b) => {
      if (a.type === 'local' && b.type !== 'local') return -1;
      if (a.type !== 'local' && b.type === 'local') return 1;
      return 0;
    });
  }
  
  return fallbackCandidates;
}

/**
 * Route a chat message to the appropriate AI model API
 * @param {string} message - User message to send to AI
 * @param {Array} history - Chat history for context
 * @param {Object} modelInfo - Model selection information
 * @param {Object} settings - User settings
 * @returns {Promise<Object>} Response from AI model
 */
export async function routeMessageToAI(message, history, modelInfo, settings) {
  const { selectedModel, fallbackModels, consensusModels } = modelInfo;
  
  // If we have consensus enabled and have enough consensus models, use them
  if (consensusModels && consensusModels.length >= (settings.consensus?.minModels || 2)) {
    return await performConsensusRouting(message, history, consensusModels, settings);
  }
  
  // Otherwise use the selected model with fallbacks
  return await performModelRouting(message, history, selectedModel, fallbackModels, settings);
}

/**
 * Route a message to multiple models for consensus decision making
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Array} models - Models to consult
 * @param {Object} settings - User settings
 * @returns {Promise<Object>} Consensus result
 */
async function performConsensusRouting(message, history, models, settings) {
  // Track start time for timeout calculation
  const startTime = Date.now();
  const timeout = settings.consensus?.timeout || 30000; // Default 30s timeout
  
  // Create a promise for each model
  const modelPromises = models.map(model => {
    return new Promise(async (resolve) => {
      try {
        const response = await callModelAPI(model, message, history, settings);
        resolve({
          success: true,
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          content: response.content,
          type: response.type || 'text'
        });
      } catch (error) {
        resolve({
          success: false,
          modelId: model.id,
          modelName: model.name,
          error: error.message || 'Unknown error'
        });
      }
    });
  });
  
  // Use Promise.race with a timeout promise
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => {
      resolve({ timedOut: true, elapsedMs: timeout });
    }, timeout);
  });
  
  // Wait for all promises to resolve or timeout
  const results = await Promise.race([
    Promise.all(modelPromises),
    timeoutPromise.then(timeout => ({ timeout }))
  ]);
  
  // If we got a timeout, return what we have so far
  if (results.timeout) {
    const successfulResponses = modelPromises
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value)
      .filter(r => r.success);
      
    return {
      timedOut: true,
      elapsedMs: timeout,
      partialConsensus: successfulResponses.length >= (settings.consensus?.minModels || 2) ?
        processConsensusVotes(successfulResponses, settings.consensus) : null,
      message: "Consensus timed out. Using partial results if available."
    };
  }
  
  // Filter successful responses
  const successfulResponses = results.filter(r => r.success);
  
  // If we don't have enough successful responses, fall back to best individual model
  if (successfulResponses.length < (settings.consensus?.minModels || 2)) {
    // If we have at least one successful response, use it
    if (successfulResponses.length > 0) {
      const bestResponse = successfulResponses[0];
      return {
        consensusFailed: true,
        content: bestResponse.content,
        modelId: bestResponse.modelId,
        modelName: bestResponse.modelName,
        message: "Insufficient responses for consensus. Using best available model."
      };
    } else {
      // Otherwise we have a complete failure
      return {
        consensusFailed: true,
        error: "No models returned successful responses",
        failedModels: results.map(r => ({ modelId: r.modelId, error: r.error }))
      };
    }
  }
  
  // Process consensus among the successful responses
  const consensusResult = processConsensusVotes(successfulResponses, settings.consensus);
  
  // Add timing information
  consensusResult.elapsedMs = Date.now() - startTime;
  
  return consensusResult;
}

/**
 * Route a message to a single model with fallbacks
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Object} primaryModel - Primary model to try first
 * @param {Array} fallbackModels - Fallback models to try if primary fails
 * @param {Object} settings - User settings
 * @returns {Promise<Object>} Model response
 */
async function performModelRouting(message, history, primaryModel, fallbackModels, settings) {
  // If no models are available, return an error
  if (!primaryModel) {
    return {
      error: "No AI models are available",
      offline: !navigator.onLine
    };
  }

  try {
    // Try the primary model first
    const response = await callModelAPI(primaryModel, message, history, settings);
    return {
      ...response,
      modelId: primaryModel.id,
      modelName: primaryModel.name,
      provider: primaryModel.provider
    };
  } catch (primaryError) {
    console.error(`Error with primary model ${primaryModel.id}:`, primaryError);
    
    // If no fallback models or fallbacks disabled, return the error
    if (!settings.useFallbackModels || !fallbackModels || fallbackModels.length === 0) {
      return {
        error: `Model ${primaryModel.id} error: ${primaryError.message}`,
        modelId: primaryModel.id,
        offline: !navigator.onLine && primaryModel.type === 'cloud'
      };
    }
    
    // Try each fallback model in sequence
    for (const fallbackModel of fallbackModels) {
      try {
        console.log(`Trying fallback model: ${fallbackModel.id}`);
        const fallbackResponse = await callModelAPI(fallbackModel, message, history, settings);
        return {
          ...fallbackResponse,
          modelId: fallbackModel.id,
          modelName: fallbackModel.name,
          provider: fallbackModel.provider,
          isUsingFallback: true,
          fallbackReason: `Primary model (${primaryModel.id}) error: ${primaryError.message}`
        };
      } catch (fallbackError) {
        console.error(`Fallback model ${fallbackModel.id} error:`, fallbackError);
        // Continue to next fallback
      }
    }
    
    // If all fallbacks failed, return error
    return {
      error: `All models failed. Primary error: ${primaryError.message}`,
      modelId: primaryModel.id,
      fallbackAttempted: true,
      offline: !navigator.onLine
    };
  }
}

/**
 * Call the appropriate API for a specific model
 * @param {Object} model - Model to call
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Object} settings - User settings
 * @returns {Promise<Object>} Model response
 */
async function callModelAPI(model, message, history, settings) {
  // Check if model is available before attempting
  if (!isModelAvailable(model, settings)) {
    throw new Error(`Model ${model.id} is not available`);
  }
  
  // Route based on model provider
  switch (model.provider) {
    case 'openai':
      return await callOpenAIAPI(model.id, message, history, settings);
    case 'anthropic':
      return await callAnthropicAPI(model.id, message, history, settings);
    case 'local':
      return await callLocalModelAPI(model.id, message, history, settings);
    default:
      throw new Error(`Unknown model provider: ${model.provider}`);
  }
}

/**
 * Check if a model is available based on configuration and online status
 * @param {Object} model - Model to check
 * @param {Object} settings - User settings
 * @returns {boolean} Whether the model is available
 */
function isModelAvailable(model, settings) {
  // Check for cloud models
  if (model.type === 'cloud') {
    // Verify we have an API key configured
    const apiKeyAvailable = settings.apiKeys && settings.apiKeys[model.provider];
    if (!apiKeyAvailable) return false;
    
    // Verify we're online
    if (!navigator.onLine) return false;
  }
  
  // Check for local models
  if (model.type === 'local') {
    // Verify we have a path configured
    const modelPathAvailable = settings.localModelPaths && settings.localModelPaths[model.id];
    if (!modelPathAvailable) return false;
  }
  
  return true;
}

/**
 * Call OpenAI API
 * @param {string} modelId - OpenAI model ID
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Object} settings - User settings with API key
 * @returns {Promise<Object>} API response
 */
async function callOpenAIAPI(modelId, message, history, settings) {
  // Extract API key from settings
  const apiKey = settings.apiKeys?.openai;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }
  
  // Default to main API endpoint
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  // Format history for OpenAI
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));
  
  // Add the new message
  formattedHistory.push({ role: 'user', content: message });
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: formattedHistory,
        temperature: 0.7,
        max_tokens: 2048
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenAI API returned ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      type: 'text'
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Call Anthropic API
 * @param {string} modelId - Anthropic model ID
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Object} settings - User settings with API key
 * @returns {Promise<Object>} API response
 */
async function callAnthropicAPI(modelId, message, history, settings) {
  // Extract API key from settings
  const apiKey = settings.apiKeys?.anthropic;
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured');
  }
  
  // Anthropic API endpoint
  const endpoint = 'https://api.anthropic.com/v1/messages';
  
  // Format history for Anthropic
  let formattedHistory = [];
  
  history.forEach(msg => {
    formattedHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [...formattedHistory, { role: 'user', content: message }],
        max_tokens: 2048
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Anthropic API returned ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.content[0].text,
      type: 'text'
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw error;
  }
}

/**
 * Call local model API
 * @param {string} modelId - Local model ID
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Object} settings - User settings with model path
 * @returns {Promise<Object>} API response
 */
async function callLocalModelAPI(modelId, message, history, settings) {
  // Extract model path from settings
  const modelPath = settings.localModelPaths?.[modelId];
  if (!modelPath) {
    throw new Error(`Path for local model ${modelId} is not configured`);
  }
  
  // Local API endpoint (assuming a local server is running)
  const endpoint = settings.localApiEndpoint || 'http://localhost:8000/v1/chat/completions';
  
  // Format history for local model (assumes OpenAI-compatible API)
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));
  
  // Add the new message
  formattedHistory.push({ role: 'user', content: message });
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelPath,
        messages: formattedHistory,
        temperature: 0.7,
        max_tokens: 2048
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Local API returned ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      type: 'text'
    };
  } catch (error) {
    console.error(`Local model ${modelId} API error:`, error);
    throw error;
  }
}
