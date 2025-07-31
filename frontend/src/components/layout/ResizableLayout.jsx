// ResizableLayout.jsx - Advanced flexible layout component with panels
import React, { useEffect, useState } from 'react';
import { 
  Panel, 
  PanelGroup, 
  PanelResizeHandle
} from "react-resizable-panels";
import './ResizableLayout.css';

/**
 * ResizableLayout component provides a flexible, fully adjustable layout system
 * with saved preferences, minimum constraints, and user control buttons
 */
const ResizableLayout = ({
  children,
  direction = "horizontal",
  initialSizes = [],
  minSizes = [],
  storageKey = null,
  onLayout = () => {},
  className = "",
  showControls = true,
  layoutPresets = {},
}) => {
  // Initialize panel sizes from localStorage if available, or use defaults
  const [panelSizes, setPanelSizes] = useState(() => {
    if (storageKey) {
      try {
        const savedSizes = localStorage.getItem(`layout_${storageKey}`);
        if (savedSizes) {
          return JSON.parse(savedSizes);
        }
      } catch (error) {
        console.warn('Failed to load saved layout:', error);
      }
    }
    return initialSizes;
  });

  // Handle panel resize
  const handleResize = (sizes) => {
    setPanelSizes(sizes);
    
    // Save to localStorage if storageKey provided
    if (storageKey) {
      try {
        localStorage.setItem(`layout_${storageKey}`, JSON.stringify(sizes));
      } catch (error) {
        console.warn('Failed to save layout:', error);
      }
    }
    
    // Call onLayout callback with new sizes
    onLayout(sizes);
  };

  // Apply a preset layout
  const applyPreset = (presetName) => {
    if (layoutPresets[presetName]) {
      setPanelSizes(layoutPresets[presetName]);
      onLayout(layoutPresets[presetName]);
      
      // Save to localStorage if storageKey provided
      if (storageKey) {
        try {
          localStorage.setItem(`layout_${storageKey}`, JSON.stringify(layoutPresets[presetName]));
        } catch (error) {
          console.warn('Failed to save layout preset:', error);
        }
      }
    }
  };

  // Extract child components and wrap in Panel elements
  const renderPanels = () => {
    // Filter out only valid React elements to be used as panels
    const validChildren = React.Children.toArray(children).filter(
      child => React.isValidElement(child)
    );
    
    // Create panels with resize handles between them
    return validChildren.map((child, index) => {
      // Convert child panel props
      const panelProps = {
        key: `panel-${index}`,
        defaultSize: panelSizes[index] || (100 / validChildren.length),
        minSize: minSizes[index] || 10,
        className: `resizable-panel ${child.props.className || ''}`,
        style: {
          overflow: 'auto',
          height: '100%',
          width: '100%',
          ...(child.props.style || {})
        }
      };
      
      // Create the panel with the child inside
      const panel = (
        <Panel {...panelProps}>
          {React.cloneElement(child, {
            ...child.props,
            isResizable: true,
            panelIndex: index
          })}
        </Panel>
      );
      
      // Add resize handle after all but the last panel
      if (index < validChildren.length - 1) {
        return [
          panel,
          <PanelResizeHandle 
            key={`resize-handle-${index}`}
            className="resize-handle"
          />
        ];
      }
      
      return panel;
    }).flat();
  };

  return (
    <div className={`resizable-layout ${direction} ${className}`}>
      {showControls && (
        <div className="layout-controls">
          {Object.keys(layoutPresets).map(presetName => (
            <button
              key={presetName}
              onClick={() => applyPreset(presetName)}
              className="layout-preset-button"
              title={`Apply ${presetName} layout`}
            >
              {presetName}
            </button>
          ))}
          <button 
            onClick={() => applyPreset('reset')} 
            className="layout-reset-button"
            title="Reset to default layout"
          >
            Reset
          </button>
        </div>
      )}
      
      <PanelGroup 
        direction={direction} 
        onLayout={handleResize}
        className="panel-group"
      >
        {renderPanels()}
      </PanelGroup>
    </div>
  );
};

export default ResizableLayout;
