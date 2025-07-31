// ModelPrioritySelector.jsx - Configurable drag-and-drop model priority selector
import React, { useState, useEffect } from 'react';

/**
 * Component allowing users to configure model fallback order through drag and drop
 * @param {Object} props - Component props
 * @param {Array} props.models - List of available models
 * @param {Array} props.userPriority - User's current priority order
 * @param {Function} props.onPriorityChange - Callback when priority changes
 * @param {boolean} props.isDarkMode - Dark mode state
 */
const ModelPrioritySelector = ({ 
  models = [], 
  userPriority = [], 
  onPriorityChange, 
  isDarkMode = false 
}) => {
  // Initialize prioritized models list
  const [prioritizedModels, setPrioritizedModels] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Prepare models on mount and when props change
  useEffect(() => {
    // If user has saved preferences, use those; otherwise use default priority order
    if (userPriority && userPriority.length > 0) {
      // Filter to ensure we only include valid models and maintain user order
      const validPriorityModels = userPriority
        .map(modelId => models.find(m => m.id === modelId))
        .filter(Boolean);
      
      // Add any new models that weren't in the user's saved priority
      const newModels = models.filter(
        model => !userPriority.includes(model.id)
      );
      
      setPrioritizedModels([...validPriorityModels, ...newModels]);
    } else {
      // Sort by provider's default priority if no user preference
      const sortedModels = [...models].sort((a, b) => {
        // Sort by provider first, then by priority
        if (a.provider !== b.provider) {
          return a.provider.localeCompare(b.provider);
        }
        return (a.priority || 999) - (b.priority || 999);
      });
      setPrioritizedModels(sortedModels);
    }
  }, [models, userPriority]);

  // Handle drag start
  const handleDragStart = (e, model, index) => {
    setDraggedItem({ model, index });
    // Set drag image appearance
    e.dataTransfer.effectAllowed = 'move';
    try {
      // Create a semi-transparent drag image
      const dragImage = document.createElement('div');
      dragImage.textContent = model.name;
      dragImage.style.cssText = 'position: absolute; top: -1000px; padding: 10px; background: rgba(0,0,0,0.7); color: white; border-radius: 4px;';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 20, 20);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    } catch (err) {
      console.warn('Could not create custom drag image:', err);
    }
  };

  // Handle drag over another item
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Early return if no dragged item or same position
    if (draggedItem === null || draggedItem.index === index) {
      return;
    }
    
    // Reorder the list
    const items = [...prioritizedModels];
    const draggedItemContent = items[draggedItem.index];
    items.splice(draggedItem.index, 1);
    items.splice(index, 0, draggedItemContent);
    
    // Update state and dragged item index
    setPrioritizedModels(items);
    setDraggedItem({
      model: draggedItem.model,
      index
    });
  };

  // Handle drop - finalize the order
  const handleDrop = (e) => {
    e.preventDefault();
    
    // Get model IDs in new order and notify parent
    const newOrder = prioritizedModels.map(model => model.id);
    if (onPriorityChange) {
      onPriorityChange(newOrder);
    }
    
    // Clear dragged item
    setDraggedItem(null);
  };

  // Handle drag end - clean up
  const handleDragEnd = () => {
    // Clear dragged item
    setDraggedItem(null);
  };

  // Reset to default order
  const handleReset = () => {
    // Sort by default provider priority
    const sortedModels = [...models].sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return (a.priority || 999) - (b.priority || 999);
    });
    
    setPrioritizedModels(sortedModels);
    
    // Notify parent
    if (onPriorityChange) {
      onPriorityChange(sortedModels.map(model => model.id));
    }
  };

  // Get class names with dark mode support
  const getClassNames = () => {
    return {
      container: `model-priority-selector ${isDarkMode ? 'dark' : 'light'}`,
      list: `model-list ${isDarkMode ? 'dark' : 'light'}`,
      item: (index) => `model-item ${isDarkMode ? 'dark' : 'light'} ${draggedItem?.index === index ? 'dragging' : ''}`,
      resetBtn: `reset-btn ${isDarkMode ? 'dark' : 'light'}`,
      providerBadge: (provider) => `provider-badge ${provider} ${isDarkMode ? 'dark' : 'light'}`
    };
  };

  const classes = getClassNames();
  
  // Group models by provider for visual organization
  const getProviderLabel = (provider) => {
    switch (provider.toLowerCase()) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      case 'ollama': return 'Ollama';
      case 'local': return 'Local';
      default: return provider;
    }
  };

  return (
    <div className={classes.container}>
      <div className="priority-header">
        <h4>Model Fallback Priority</h4>
        <button 
          className={classes.resetBtn}
          onClick={handleReset}
          title="Reset to default priority order"
        >
          Reset to Default
        </button>
      </div>
      
      <p className="setting-description">
        Drag models to set your preferred fallback order. The system will try models from top to bottom.
      </p>
      
      <ul className={classes.list}>
        {prioritizedModels.map((model, index) => (
          <li
            key={model.id}
            className={classes.item(index)}
            draggable
            onDragStart={(e) => handleDragStart(e, model, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            <div className="drag-handle">⋮⋮</div>
            <div className="model-info">
              <span className="model-name">{model.name}</span>
              <span className={classes.providerBadge(model.provider.toLowerCase())}>
                {getProviderLabel(model.provider)}
              </span>
              {model.type === 'local' && <span className="model-badge offline">Offline</span>}
            </div>
            <div className="priority-number">{index + 1}</div>
          </li>
        ))}
      </ul>
      
      <style jsx>{`
        .model-priority-selector {
          margin-bottom: 20px;
          width: 100%;
        }
        .model-priority-selector.dark {
          color: #eaeaea;
        }
        .model-priority-selector.light {
          color: #333;
        }
        .priority-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .priority-header h4 {
          margin: 0;
          font-size: 16px;
        }
        .reset-btn {
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .reset-btn.dark {
          border-color: #555;
          color: #eaeaea;
        }
        .reset-btn.light {
          border-color: #ddd;
          color: #333;
        }
        .reset-btn:hover {
          background: rgba(0,0,0,0.1);
        }
        .model-list {
          list-style: none;
          padding: 0;
          margin: 10px 0 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .model-list.dark {
          border-color: #444;
        }
        .model-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
          background: #fff;
          cursor: grab;
          transition: background 0.2s ease;
        }
        .model-item.dark {
          background: #333;
          border-bottom-color: #444;
          color: #eaeaea;
        }
        .model-item:last-child {
          border-bottom: none;
        }
        .model-item:hover {
          background: #f5f5f5;
        }
        .model-item.dark:hover {
          background: #383838;
        }
        .model-item.dragging {
          opacity: 0.5;
          background: #e0f0ff;
        }
        .model-item.dark.dragging {
          background: #2a3b4d;
        }
        .drag-handle {
          margin-right: 10px;
          color: #999;
          font-size: 16px;
          cursor: grab;
          user-select: none;
        }
        .model-info {
          flex-grow: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .model-name {
          font-weight: 500;
        }
        .provider-badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .provider-badge.openai {
          background: #10a37f20;
          color: #10a37f;
        }
        .provider-badge.anthropic {
          background: #d0663920;
          color: #d06639;
        }
        .provider-badge.ollama {
          background: #6f5bdc20;
          color: #6f5bdc;
        }
        .provider-badge.dark.ollama {
          background: #6f5bdc30;
        }
        .provider-badge.local {
          background: #67657020;
          color: #676570;
        }
        .model-badge {
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .model-badge.offline {
          background: #2b77ff20;
          color: #2b77ff;
        }
        .priority-number {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f0f0f0;
          color: #666;
          font-size: 12px;
          font-weight: 600;
        }
        .priority-number.dark {
          background: #444;
          color: #ddd;
        }
      `}</style>
    </div>
  );
};

export default ModelPrioritySelector;
