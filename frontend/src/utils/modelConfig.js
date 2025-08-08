// modelConfig.js - Configuration and utilities for AI models and consensus decision making
import logger from './logger';
const log = logger.ns('api:ai:model');

/**
 * Default available AI models with metadata
 */
export const defaultModels = [
  // Cloud Models - OpenAI
  { 
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    type: 'cloud',
    capabilities: ['code', 'reasoning', 'knowledge'],
    priority: 1
  },
  { 
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    type: 'cloud',
    capabilities: ['code', 'reasoning', 'knowledge'],
    priority: 2
  },
  { 
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    type: 'cloud',
    capabilities: ['code', 'basic-reasoning'],
    priority: 3
  },

  // Cloud Models - Anthropic
  { 
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    type: 'cloud',
    capabilities: ['code', 'reasoning', 'knowledge'],
    priority: 1
  },
  { 
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    type: 'cloud',
    capabilities: ['code', 'reasoning'],
    priority: 2
  },
  { 
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    type: 'cloud',
    capabilities: ['code', 'basic-reasoning'],
    priority: 3
  },

  // Local Models - CodeLlama
  { 
    id: 'codellama-34b',
    name: 'CodeLlama 34B',
    provider: 'local',
    type: 'local',
    capabilities: ['code'],
    priority: 1,
    requiredRAM: '32GB'
  },
  { 
    id: 'codellama-13b',
    name: 'CodeLlama 13B',
    provider: 'local',
    type: 'local',
    capabilities: ['code'],
    priority: 2,
    requiredRAM: '16GB'
  },
  { 
    id: 'codellama-7b',
    name: 'CodeLlama 7B',
    provider: 'local',
    type: 'local',
    capabilities: ['code'],
    priority: 3,
    requiredRAM: '8GB'
  },

  // Local Models - Mistral
  { 
    id: 'mistral-7b-instruct',
    name: 'Mistral 7B Instruct',
    provider: 'local',
    type: 'local',
    capabilities: ['code', 'basic-reasoning'],
    priority: 2,
    requiredRAM: '8GB'
  },
];

/**
 * Default consensus configuration
 */
export const defaultConsensusConfig = {
  enabled: false,
  votingThreshold: 0.6, // 60% agreement needed
  timeout: 30000, // 30 seconds timeout
  minModels: 2, // Minimum models required for consensus
  maxModels: 3, // Maximum models to consult
  requiredCapabilities: ['code'], // Required capabilities for participating models
  modelSelectionStrategy: 'diversity', // 'diversity', 'best', or 'random'
};

/**
 * Select appropriate models based on consensus configuration and available models
 * 
 * @param {Array} availableModels - List of all available models
 * @param {Object} consensusConfig - Consensus configuration settings
 * @param {boolean} isOffline - Whether the system is currently offline
 * @returns {Array} Selected models for consensus decision making
 */
export function selectConsensusModels(availableModels, consensusConfig, isOffline = false) {
  if (!consensusConfig.enabled) {
    return [];
  }

  // Filter models based on required capabilities and online status
  let eligibleModels = availableModels.filter(model => {
    // Filter out cloud models when offline
    if (isOffline && model.type === 'cloud') {
      return false;
    }
    
    // Check if model has all required capabilities
    return consensusConfig.requiredCapabilities.every(cap => 
      model.capabilities.includes(cap)
    );
  });

  if (eligibleModels.length < consensusConfig.minModels) {
    log.warn('Not enough eligible models for consensus decision making');
    return [];
  }

  // Apply model selection strategy
  switch (consensusConfig.modelSelectionStrategy) {
    case 'diversity':
      // Select diverse models (different providers/types)
      const selectedModels = [];
      const providers = new Set();
      
      // First select by unique providers up to max
      eligibleModels.sort((a, b) => a.priority - b.priority);
      
      for (const model of eligibleModels) {
        if (selectedModels.length >= consensusConfig.maxModels) {
          break;
        }
        
        if (!providers.has(model.provider)) {
          selectedModels.push(model);
          providers.add(model.provider);
        }
      }
      
      // If we still need more models, add best remaining ones
      if (selectedModels.length < consensusConfig.minModels) {
        const remainingModels = eligibleModels.filter(
          model => !selectedModels.includes(model)
        );
        
        selectedModels.push(
          ...remainingModels.slice(0, consensusConfig.minModels - selectedModels.length)
        );
      }
      
      return selectedModels;
      
    case 'best':
      // Simply select the highest priority models
      return eligibleModels
        .sort((a, b) => a.priority - b.priority)
        .slice(0, consensusConfig.maxModels);
      
    case 'random':
      // Randomly select models
      const shuffled = [...eligibleModels].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, consensusConfig.maxModels);
      
    default:
      return eligibleModels.slice(0, consensusConfig.maxModels);
  }
}

/**
 * Process consensus voting from multiple model outputs
 * 
 * @param {Array} modelOutputs - Array of outputs from different models
 * @param {Object} consensusConfig - Consensus configuration
 * @returns {Object} Final consensus result and metadata
 */
export function processConsensusVotes(modelOutputs, consensusConfig) {
  if (!modelOutputs || modelOutputs.length < consensusConfig.minModels) {
    return {
      success: false,
      error: 'Insufficient model outputs for consensus',
      result: null,
      confidenceScore: 0,
      modelAgreement: 0,
      participatingModels: []
    };
  }

  // In a real implementation, this would analyze the outputs and find consensus
  // This is a simplified version that uses direct voting on structured outputs
  
  const participatingModels = modelOutputs.map(output => output.modelId);
  
  // For simple text responses, we could use similarity scoring
  // For structured data like code, we need more sophisticated consensus mechanisms
  // Here's a simplified approach for demonstration
  
  if (modelOutputs[0].type === 'code') {
    // For code, we could use syntax tree comparison or more basic similarity
    // This is simplified for demonstration
    const codeResponses = {};
    
    // Count similar responses (using string equality as simplification)
    modelOutputs.forEach(output => {
      const code = output.content;
      codeResponses[code] = (codeResponses[code] || 0) + 1;
    });
    
    // Find majority response
    let maxCount = 0;
    let consensusCode = null;
    
    Object.entries(codeResponses).forEach(([code, count]) => {
      if (count > maxCount) {
        maxCount = count;
        consensusCode = code;
      }
    });
    
    const agreementRatio = maxCount / modelOutputs.length;
    
    return {
      success: agreementRatio >= consensusConfig.votingThreshold,
      result: consensusCode,
      confidenceScore: agreementRatio,
      modelAgreement: agreementRatio,
      participatingModels,
      metadata: {
        voteCounts: codeResponses
      }
    };
  } else {
    // For text responses, we could use semantic similarity
    // Simplified implementation for demonstration
    return {
      success: true,
      result: modelOutputs[0].content, // Default to first model in simple case
      confidenceScore: 0.8, // Placeholder
      modelAgreement: 0.8, // Placeholder
      participatingModels,
      metadata: {
        note: "Actual consensus would use semantic similarity scoring"
      }
    };
  }
}
