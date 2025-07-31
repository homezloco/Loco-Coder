# AI Agent Configuration Guide

## Overview

This document explains how to configure and extend the AI agent system in the ChatPanel component. The system supports multiple AI models from various providers including:

- Cloud-based models (OpenAI, Anthropic)
- Local models (CodeLlama, Mistral)
- Consensus decision-making between multiple models

The architecture provides robust fallback mechanisms, ensuring continued functionality even when primary models or APIs are unavailable.

## Architecture

The AI agent system consists of several key components:

### 1. Components

- `ChatSettings.jsx`: UI for configuring AI models and consensus settings
- `ChatPanel.jsx`: Main chat interface that integrates with AI models

### 2. Utilities

- `modelConfig.js`: Configuration data and utilities for available models and consensus
- `aiModelManager.js`: Model selection, fallback logic, and API routing
- `chatUtils.js`: Chat API utilities with storage and persistence

## Adding a New AI Model/Agent

To add a new AI model to the system, follow these steps:

### 1. Update Model Configuration

In `frontend/src/utils/modelConfig.js`, add your new model to the `defaultModels` array:

```javascript
export const defaultModels = [
  // Existing models...
  
  // Add your new model
  { 
    id: 'your-model-id',
    name: 'Your Model Display Name',
    provider: 'provider-name',  // Use existing provider or create new one
    type: 'cloud',              // 'cloud' or 'local'
    capabilities: ['code', 'reasoning'], // List capabilities
    priority: 3                 // Priority (lower is better)
  }
];
```

### 2. Add API Integration

If adding a model from a new provider, implement the API integration in `frontend/src/utils/aiModelManager.js`:

1. Create a new API calling function similar to existing ones:

```javascript
/**
 * Call YourProvider API
 * @param {string} modelId - Provider model ID
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {Object} settings - User settings with API key
 * @returns {Promise<Object>} API response
 */
async function callYourProviderAPI(modelId, message, history, settings) {
  // Extract API key from settings
  const apiKey = settings.apiKeys?.yourprovider;
  if (!apiKey) {
    throw new Error('YourProvider API key is not configured');
  }
  
  // Your provider API endpoint
  const endpoint = 'https://api.yourprovider.com/v1/chat';
  
  // Format history for your provider's API format
  const formattedHistory = history.map(msg => ({
    // Map message format to provider's requirements
  }));
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
        // Add any other headers required by the API
      },
      body: JSON.stringify({
        model: modelId,
        messages: [...formattedHistory, { role: 'user', content: message }],
        // Add any other parameters required by the API
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Provider API returned ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.content, // Adjust based on API response structure
      type: 'text'
    };
  } catch (error) {
    console.error('Provider API error:', error);
    throw error;
  }
}
```

2. Update the `callModelAPI` function to include your new provider:

```javascript
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
    case 'yourprovider':  // Add your new provider case
      return await callYourProviderAPI(model.id, message, history, settings);
    case 'local':
      return await callLocalModelAPI(model.id, message, history, settings);
    default:
      throw new Error(`Unknown model provider: ${model.provider}`);
  }
}
```

### 3. Update ChatSettings UI (Optional)

If your new model requires specific settings, update `frontend/src/components/ChatSettings.jsx`:

1. Add UI elements for provider-specific settings
2. Add appropriate handlers for the new settings
3. Update the settings object structure to include your new settings

## Configuring Consensus Decision Making

The consensus system allows multiple AI models to collaborate on decisions. To configure consensus:

1. Enable consensus in the settings panel
2. Select a consensus strategy:
   - **Model Diversity**: Uses models from different providers
   - **Best Available**: Uses the highest priority models
   - **Random Selection**: Randomly selects from available models

3. Adjust agreement threshold (percentage of models that must agree)
4. Configure advanced settings:
   - Minimum models required for consensus
   - Maximum models to consult
   - Timeout duration

## Best Practices

1. **Security**: Never hardcode API keys in the application. Always use the settings system to manage keys.

2. **Fallbacks**: Ensure each model has appropriate fallback options configured:
   - Cloud models should have local model fallbacks
   - Provider-specific fallbacks should be prioritized

3. **Error Handling**: Always include robust error handling in API integrations:
   - Handle timeouts gracefully
   - Provide meaningful error messages to users
   - Log errors for debugging

4. **Performance**: Consider model loading time and resource requirements:
   - Large local models may require significant RAM
   - Specify requirements in model metadata

5. **Testing**: Test each model thoroughly:
   - Verify online and offline behavior
   - Test fallback chains work as expected
   - Validate consensus mechanisms with different model combinations

## Examples

### Example: Adding a New Hugging Face Model

```javascript
// In modelConfig.js
export const defaultModels = [
  // Existing models...
  
  // Add Hugging Face model
  { 
    id: 'mistral-7b-instruct-v0.2',
    name: 'Mistral 7B Instruct v0.2',
    provider: 'huggingface',
    type: 'cloud',
    capabilities: ['code', 'reasoning'],
    priority: 4
  }
];

// In aiModelManager.js, add Hugging Face API integration
async function callHuggingFaceAPI(modelId, message, history, settings) {
  const apiKey = settings.apiKeys?.huggingface;
  if (!apiKey) {
    throw new Error('Hugging Face API key is not configured');
  }
  
  const endpoint = 'https://api-inference.huggingface.co/models/' + modelId;
  
  // Implementation details...
}

// Update callModelAPI function
switch (model.provider) {
  // Existing cases...
  case 'huggingface':
    return await callHuggingFaceAPI(model.id, message, history, settings);
  // Other cases...
}
```

### Example: Adding a Custom Local Model Server

```javascript
// In modelConfig.js
export const defaultModels = [
  // Existing models...
  
  // Add custom local model
  { 
    id: 'custom-local-model',
    name: 'Custom Local Model',
    provider: 'custom-local',
    type: 'local',
    capabilities: ['code'],
    priority: 2,
    requiredRAM: '16GB'
  }
];

// In aiModelManager.js
async function callCustomLocalAPI(modelId, message, history, settings) {
  const modelPath = settings.localModelPaths?.[modelId];
  if (!modelPath) {
    throw new Error(`Path for local model ${modelId} is not configured`);
  }
  
  const endpoint = settings.customLocalEndpoint || 'http://localhost:9000/generate';
  
  // Implementation details...
}
```
