import React, { useState, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import './layout.css';

/**
 * DashboardLayout component for windsurf-style layout with resizable panels
 * Provides preset buttons for quick layout adjustments
 */
const DashboardLayout = ({ 
  children, 
  isDarkMode = false,
  defaultLayout = {
    leftPanelSize: 20,
    contentSize: 50,
    rightPanelSize: 30
  }
}) => {
  const [layout, setLayout] = useState(() => {
    // Try to load saved layout from localStorage
    try {
      const savedLayout = localStorage.getItem('dashboard-layout');
      return savedLayout ? JSON.parse(savedLayout) : defaultLayout;
    } catch (err) {
      console.warn('Error loading saved layout:', err);
      return defaultLayout;
    }
  });
  
  const [activeSizePreset, setActiveSizePreset] = useState('default');

  // Save layout changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dashboard-layout', JSON.stringify(layout));
    } catch (err) {
      console.error('Error saving layout:', err);
    }
  }, [layout]);

  // Layout presets for quick adjustments
  const layoutPresets = {
    leftFocus: { leftPanelSize: 40, contentSize: 40, rightPanelSize: 20 },
    default: { leftPanelSize: 20, contentSize: 50, rightPanelSize: 30 },
    contentFocus: { leftPanelSize: 15, contentSize: 70, rightPanelSize: 15 },
    rightFocus: { leftPanelSize: 20, contentSize: 40, rightPanelSize: 40 }
  };

  // Apply a preset layout
  const applyLayoutPreset = (presetName) => {
    const preset = layoutPresets[presetName];
    if (preset) {
      setLayout(preset);
      setActiveSizePreset(presetName);
    }
  };

  // Extract children components
  const childrenArray = React.Children.toArray(children);
  const leftPanel = childrenArray[0] || null;
  const contentPanel = childrenArray[1] || null;
  const rightPanel = childrenArray[2] || null;

  return (
    <div className="dashboard-layout-container">
      <div className="layout-controls">
        <div className="layout-presets">
          <button 
            className={`layout-preset-btn ${activeSizePreset === 'leftFocus' ? 'active' : ''}`}
            onClick={() => applyLayoutPreset('leftFocus')}
            title="Maximize left panel (files/navigation)"
          >
            Left Focus
          </button>
          <button 
            className={`layout-preset-btn ${activeSizePreset === 'default' ? 'active' : ''}`}
            onClick={() => applyLayoutPreset('default')}
            title="Default balanced layout"
          >
            Default
          </button>
          <button 
            className={`layout-preset-btn ${activeSizePreset === 'contentFocus' ? 'active' : ''}`}
            onClick={() => applyLayoutPreset('contentFocus')}
            title="Focus on center content"
          >
            Content Focus
          </button>
          <button 
            className={`layout-preset-btn ${activeSizePreset === 'rightFocus' ? 'active' : ''}`}
            onClick={() => applyLayoutPreset('rightFocus')}
            title="Maximize right panel (chat/console)"
          >
            Right Focus
          </button>
        </div>
      </div>

      <ResizablePanelGroup 
        direction="horizontal" 
        className="dashboard-panel-group"
        onLayout={(sizes) => {
          if (sizes.length >= 3) {
            setLayout({
              leftPanelSize: sizes[0],
              contentSize: sizes[1],
              rightPanelSize: sizes[2]
            });
            setActiveSizePreset('custom');
          }
        }}
      >
        <ResizablePanel 
          defaultSize={layout.leftPanelSize} 
          minSize={10}
          className="dashboard-panel left-panel"
        >
          {leftPanel}
        </ResizablePanel>
        
        <ResizableHandle withHandle className="panel-resize-handle" />
        
        <ResizablePanel 
          defaultSize={layout.contentSize} 
          minSize={30}
          className="dashboard-panel content-panel"
        >
          {contentPanel}
        </ResizablePanel>
        
        <ResizableHandle withHandle className="panel-resize-handle" />
        
        <ResizablePanel 
          defaultSize={layout.rightPanelSize} 
          minSize={10}
          className="dashboard-panel right-panel"
        >
          {rightPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default DashboardLayout;
