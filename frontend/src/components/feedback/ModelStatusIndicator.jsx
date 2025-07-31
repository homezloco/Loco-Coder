import React, { useState, useEffect } from 'react';
import modelFallbackManager from '../../utils/modelFallbackManager';
import api from '../../api';
import './ModelStatusIndicator.css';

/**
 * ModelStatusIndicator displays the current status of AI models with visual feedback
 * to show when fallbacks are being used or if there are connectivity issues
 */
const ModelStatusIndicator = ({ className = '' }) => {
  const [modelStats, setModelStats] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    // Update status periodically
    const checkModelStatus = async () => {
      const stats = modelFallbackManager.getModelHealthStats();
      setModelStats(stats);
      
      const online = await api.isOnline();
      setIsOffline(!online);
    };
    
    checkModelStatus();
    const interval = setInterval(checkModelStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  if (!modelStats) {
    return null; // Don't render until we have data
  }
  
  // Get active model info
  const activeModel = modelStats.activeModel || {};
  
  // Determine status level
  let statusLevel = 'normal';
  let statusMessage = 'AI models operating normally';
  let statusIcon = '✓';
  
  // Provider-specific icons
  const getProviderIcon = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'openai':
        return '🔷'; // OpenAI
      case 'ollama':
        return '🦙'; // Ollama llama
      case 'anthropic':
        return '🔶'; // Anthropic
      case 'local':
        return '💻'; // Local model
      default:
        return '🤖'; // Generic AI
    }
  };
  
  const providerIcon = getProviderIcon(activeModel.provider);
  
  if (isOffline) {
    statusLevel = 'critical';
    statusMessage = 'Offline mode - Using local fallback models';
    statusIcon = '⚠️';
  } else if (modelStats.healthyModels === 0) {
    statusLevel = 'critical';
    statusMessage = 'All AI models unavailable';
    statusIcon = '❌';
  } else if (modelStats.unhealthyModels > 0 && activeModel.isFallback) {
    statusLevel = 'warning';
    statusMessage = `Using ${activeModel.provider || 'fallback'} (${modelStats.healthyModels}/${modelStats.totalModels})`;
    statusIcon = providerIcon;
  } else if (activeModel.provider) {
    statusMessage = `${activeModel.provider}: ${activeModel.model || 'unknown'}`;
    statusIcon = providerIcon;
  }

  const getStatusColorClass = () => {
    switch (statusLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className={`model-status-indicator ${className}`}>
      <div 
        className={`flex items-center px-3 py-1 rounded-md border ${getStatusColorClass()} cursor-pointer`}
        onClick={() => setShowDetails(prev => !prev)}
        title="Click for model status details"
      >
        <span className="mr-2 text-lg">{statusIcon}</span>
        <span className="text-sm font-medium">{statusMessage}</span>
      </div>
      
      {showDetails && (
        <div className="model-status-details mt-2 p-3 bg-white rounded-md border shadow-lg text-sm">
          <h4 className="font-bold mb-2">AI Model Status</h4>
          
          {activeModel.provider && (
            <div className="active-model mb-3 p-2 bg-blue-50 rounded-md">
              <div className="font-medium flex items-center">
                <span className="mr-2">{getProviderIcon(activeModel.provider)}</span>
                <span>Active: {activeModel.provider}</span>
                {activeModel.isFallback && <span className="ml-2 text-xs bg-yellow-200 px-1 rounded">Fallback</span>}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                <div>Model: {activeModel.model || 'Unknown'}</div>
                <div>Last Used: {activeModel.lastUsed ? new Date(activeModel.lastUsed).toLocaleTimeString() : 'Never'}</div>
              </div>
            </div>
          )}
          
          <div className="model-list max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="text-left py-1">Provider</th>
                  <th className="text-left py-1">Model</th>
                  <th className="text-left py-1">Status</th>
                  <th className="text-right py-1">Priority</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(modelStats.models)
                  .sort((a, b) => {
                    // Sort by user priority first, then by provider name
                    const priorityA = modelStats.userPriority.indexOf(a[0]);
                    const priorityB = modelStats.userPriority.indexOf(b[0]);
                    
                    if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
                    if (priorityA !== -1) return -1;
                    if (priorityB !== -1) return 1;
                    
                    return a[0].localeCompare(b[0]);
                  })
                  .map(([modelId, status]) => {
                    const [provider, model] = modelId.split(':');
                    const priorityIndex = modelStats.userPriority.indexOf(modelId);
                    
                    return (
                      <tr key={modelId} className="model-item border-b hover:bg-gray-50">
                        <td className="py-1 flex items-center">
                          <span className="mr-1">{getProviderIcon(provider)}</span>
                          <span>{provider}</span>
                        </td>
                        <td className="py-1 text-xs">{model || 'default'}</td>
                        <td className="py-1">
                          <span className={`px-1 py-0.5 rounded text-xs ${status.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {status.healthy ? 'Available' : `Failed (${status.failureCount})`}
                          </span>
                        </td>
                        <td className="py-1 text-right">
                          {priorityIndex !== -1 ? (
                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                              #{priorityIndex + 1}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          
          <div className="actions mt-3 flex justify-between">
            <span className="text-xs text-gray-500">
              {modelStats.healthyModels}/{modelStats.totalModels} models available
            </span>
            <div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '#/settings';
                }}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-xs mr-2"
              >
                Configure
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  modelFallbackManager.resetModelHealth();
                  setShowDetails(false);
                }}
                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs"
              >
                Reset Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelStatusIndicator;
