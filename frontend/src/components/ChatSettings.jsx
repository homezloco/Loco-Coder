// ChatSettings.jsx - Settings panel for chat configuration
import React, { useState, useMemo } from 'react';
import { defaultModels, defaultConsensusConfig } from '../utils/modelConfig';
import ModelPrioritySelector from './ModelPrioritySelector';

/**
 * ChatSettings component for code application preferences, AI model config and consensus decision making
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current settings object
 * @param {Function} props.onUpdateSettings - Function to update settings
 * @param {boolean} props.isDarkMode - Dark mode state
 * @param {Array} props.availableModels - Array of available AI models
 */
export default function ChatSettings({ 
  settings = {}, 
  onUpdateSettings, 
  isDarkMode = false,
  availableModels = defaultModels
}) {
  // Ensure settings object is fully initialized with defaults
  const safeSettings = useMemo(() => {
    // Define complete default values to avoid uncontrolled input warnings
    const defaults = {
      apiEndpoint: '',
      apiKeys: {},
      localModelPaths: {},
      activeModel: 'gpt-4-turbo',
      activeModelName: 'GPT-4 Turbo',
      activeProvider: 'openai',
      temperature: 0.7,
      useFallbackModels: true,
      preferLocalModels: false,
      confirmBeforeApplying: true,
      autoApplyCode: false,
      highlightChanges: true,
      showAdvancedOptions: false,
      tokenLimit: 4096,
      modelPriorityOrder: [], // User's preferred model fallback order
    };
    
    // Create a new object with defaults and settings overrides
    const merged = { ...defaults };
    
    // Only override with settings values if they're defined
    if (settings) {
      Object.keys(defaults).forEach(key => {
        if (settings[key] !== undefined) {
          merged[key] = settings[key];
        }
      });
    }
    
    // Handle nested consensus object separately
    merged.consensus = {
      ...defaultConsensusConfig,
      ...((settings && settings.consensus) || {})
    };
    
    return merged;
  }, [settings]);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showAdvancedConsensus, setShowAdvancedConsensus] = useState(false);
  
  // Use the safely initialized consensus configuration
  const consensusConfig = safeSettings.consensus || defaultConsensusConfig;
  
  const handleToggle = (key) => {
    onUpdateSettings({ [key]: !safeSettings[key] });
  };

  const handleEndpointChange = (e) => {
    onUpdateSettings({ apiEndpoint: e.target.value });
  };
  
  const handleModelChange = (e) => {
    const selectedModel = availableModels.find(model => model.id === e.target.value);
    onUpdateSettings({ 
      activeModel: e.target.value,
      activeModelName: selectedModel?.name || 'Unknown Model',
      activeProvider: selectedModel?.provider || 'unknown'
    });
  };
  
  const handleApiKeyChange = (provider, e) => {
    const updatedApiKeys = {
      ...(safeSettings.apiKeys || {}),
      [provider]: e.target.value
    };
    onUpdateSettings({ apiKeys: updatedApiKeys });
  };
  
  const handleLocalModelPathChange = (modelId, e) => {
    const updatedModelPaths = {
      ...(safeSettings.localModelPaths || {}),
      [modelId]: e.target.value
    };
    onUpdateSettings({ localModelPaths: updatedModelPaths });
  };
  
  const handleConsensusToggle = () => {
    const updatedConsensus = {
      ...consensusConfig,
      enabled: !consensusConfig.enabled
    };
    onUpdateSettings({ consensus: updatedConsensus });
  };
  
  const handleConsensusSettingChange = (key, value) => {
    const updatedConsensus = {
      ...consensusConfig,
      [key]: value
    };
    onUpdateSettings({ consensus: updatedConsensus });
  };
  
  // Group models by type (cloud/local)
  const cloudModels = availableModels.filter(model => model.type === 'cloud');
  const localModels = availableModels.filter(model => model.type === 'local');
  
  // Group models by provider
  const modelsByProvider = {};
  availableModels.forEach(model => {
    if (!modelsByProvider[model.provider]) {
      modelsByProvider[model.provider] = [];
    }
    modelsByProvider[model.provider].push(model);
  });

  return (
    <div className={`chat-settings-panel ${isDarkMode ? 'dark' : 'light'}`}>
      <h3>Chat Settings</h3>
      
      <div className="settings-group">
        <h4>AI Model Configuration</h4>
        
        <div className="setting-item">
          <label htmlFor="model-select">Active AI Model</label>
          <select 
            id="model-select"
            value={safeSettings.activeModel} 
            onChange={handleModelChange}
            className="model-select"
          >
            <optgroup label="Cloud Models">
              {cloudModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </optgroup>
            <optgroup label="Local Models">
              {localModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="setting-description">Select which AI model to use for chat responses</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={safeSettings.useFallbackModels} 
              onChange={() => handleToggle('useFallbackModels')} 
            />
            Use fallback AI models
          </label>
          <p className="setting-description">Automatically try alternative models when primary is unavailable</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={safeSettings.preferLocalModels} 
              onChange={() => handleToggle('preferLocalModels')} 
            />
            Prefer local models when offline
          </label>
          <p className="setting-description">Switch to local models automatically when internet is unavailable</p>
        </div>
        
        {/* New section for model fallback priority configuration */}
        {safeSettings.useFallbackModels && (
          <div className="setting-item model-priority-container">
            <ModelPrioritySelector
              models={availableModels}
              userPriority={safeSettings.modelPriorityOrder}
              onPriorityChange={(newOrder) => onUpdateSettings({ modelPriorityOrder: newOrder })}
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>
      
      <div className="settings-group">
        <h4>Consensus Decision Making</h4>
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={Boolean(consensusConfig.enabled)} 
              onChange={handleConsensusToggle} 
            />
            Enable consensus decision making
          </label>
          <p className="setting-description">Use multiple AI models to reach consensus on important decisions</p>
        </div>
        
        {consensusConfig.enabled && (
          <>
            <div className="setting-item">
              <label htmlFor="consensus-strategy">Consensus Strategy</label>
              <select 
                id="consensus-strategy"
                value={consensusConfig.modelSelectionStrategy} 
                onChange={(e) => handleConsensusSettingChange('modelSelectionStrategy', e.target.value)}
                className="consensus-select"
              >
                <option value="diversity">Model Diversity (different providers)</option>
                <option value="best">Best Available Models</option>
                <option value="random">Random Selection</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label htmlFor="consensus-threshold">
                Agreement Threshold: {consensusConfig.votingThreshold * 100}%
              </label>
              <input 
                id="consensus-threshold"
                type="range" 
                min="0.5" 
                max="1" 
                step="0.05"
                value={consensusConfig.votingThreshold}
                onChange={(e) => handleConsensusSettingChange('votingThreshold', parseFloat(e.target.value))}
              />
              <p className="setting-description">Minimum agreement required between models</p>
            </div>
            
            <div className="setting-item">
              <button 
                onClick={() => setShowAdvancedConsensus(!showAdvancedConsensus)}
                className="toggle-advanced-button"
              >
                {showAdvancedConsensus ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
              </button>
            </div>
            
            {showAdvancedConsensus && (
              <div className="advanced-consensus-settings">
                <div className="setting-item">
                  <label htmlFor="min-models">Minimum Models</label>
                  <input 
                    id="min-models"
                    type="number" 
                    min="2" 
                    max="5"
                    value={consensusConfig.minModels}
                    onChange={(e) => handleConsensusSettingChange('minModels', parseInt(e.target.value, 10))}
                  />
                </div>
                
                <div className="setting-item">
                  <label htmlFor="max-models">Maximum Models</label>
                  <input 
                    id="max-models"
                    type="number" 
                    min="2" 
                    max="7"
                    value={consensusConfig.maxModels}
                    onChange={(e) => handleConsensusSettingChange('maxModels', parseInt(e.target.value, 10))}
                  />
                </div>
                
                <div className="setting-item">
                  <label htmlFor="consensus-timeout">Timeout (seconds)</label>
                  <input 
                    id="consensus-timeout"
                    type="number" 
                    min="5" 
                    max="120"
                    value={consensusConfig.timeout / 1000}
                    onChange={(e) => handleConsensusSettingChange('timeout', parseInt(e.target.value, 10) * 1000)}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="settings-group">
        <h4>API Configuration</h4>
        <div className="setting-item">
          <label>Default API Endpoint</label>
          <input 
            type="text" 
            value={safeSettings.apiEndpoint} 
            onChange={handleEndpointChange} 
            className="endpoint-input" 
          />
          <p className="setting-description">URL for the default chat API endpoint</p>
        </div>
        
        <div className="setting-item">
          <button 
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="toggle-api-keys-button"
          >
            {showApiKeys ? 'Hide API Keys' : 'Show API Keys'}
          </button>
        </div>
        
        {showApiKeys && (
          <div className="api-keys-section">
            <div className="setting-item">
              <h5>Cloud Provider API Keys</h5>
              {Object.keys(modelsByProvider)
                .filter(provider => provider !== 'local')
                .map(provider => (
                  <div key={provider} className="api-key-input">
                    <label>{provider.charAt(0).toUpperCase() + provider.slice(1)} API Key</label>
                    <input 
                      type="password" 
                      value={(safeSettings.apiKeys && safeSettings.apiKeys[provider]) || ''}
                      onChange={(e) => handleApiKeyChange(provider, e)}
                      placeholder={provider === 'openai' ? 'sk-...' : 
                                provider === 'anthropic' ? 'sk-ant-...' : '...'} 
                    />
                  </div>
                ))}
            </div>
            
            <div className="setting-item">
              <h5>Local Model Paths</h5>
              {localModels.map(model => (
                <div key={model.id} className="model-path-input">
                  <label>{model.name} Path</label>
                  <input 
                    type="text" 
                    value={(safeSettings.localModelPaths && safeSettings.localModelPaths[model.id]) || ''}
                    onChange={(e) => handleLocalModelPathChange(model.id, e)}
                    placeholder="/path/to/model" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="settings-group">
        <h4>Code Application</h4>
        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={Boolean(safeSettings.autoApplyCode)} 
              onChange={() => handleToggle('autoApplyCode')} 
            />
            Auto-apply code suggestions
          </label>
          <p className="setting-description">Automatically apply code changes without confirmation</p>
        </div>

        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={Boolean(safeSettings.confirmBeforeApplying)} 
              onChange={() => handleToggle('confirmBeforeApplying')} 
            />
            Ask for confirmation
          </label>
          <p className="setting-description">Show confirmation dialog before applying code changes</p>
        </div>

        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={Boolean(safeSettings.highlightChanges)} 
              onChange={() => handleToggle('highlightChanges')} 
            />
            Highlight code changes
          </label>
          <p className="setting-description">Highlight changes in code suggestions</p>
        </div>
      </div>
    </div>
  );
}
