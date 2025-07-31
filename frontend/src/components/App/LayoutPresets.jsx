import React from 'react';

const LayoutPresets = ({ layoutConfig, setLayoutConfig }) => {
  return (
    <div className="layout-presets" style={{ display: 'flex', gap: '5px', marginRight: '10px' }}>
      <button 
        className={`layout-preset-btn ${layoutConfig.layoutMode === 'balanced' ? 'active' : ''}`}
        onClick={() => {
          setLayoutConfig({
            ...layoutConfig,
            sidebarWidth: 250,
            fileBrowserWidth: 200,
            editorWidth: 600,
            outputHeight: 200,
            terminalHeight: 200,
            chatWidth: 300,
            layoutMode: 'balanced'
          });
        }}
        title="Balanced Layout"
      >
        ⚖️
      </button>
      <button 
        className={`layout-preset-btn ${layoutConfig.layoutMode === 'editorFocus' ? 'active' : ''}`}
        onClick={() => {
          setLayoutConfig({
            ...layoutConfig,
            sidebarWidth: 150,
            fileBrowserWidth: 100,
            editorWidth: 800,
            outputHeight: 150,
            terminalHeight: 150,
            chatWidth: 200,
            layoutMode: 'editorFocus'
          });
        }}
        title="Editor Focus"
      >
        ✍️
      </button>
      <button 
        className={`layout-preset-btn ${layoutConfig.layoutMode === 'terminalFocus' ? 'active' : ''}`}
        onClick={() => {
          setLayoutConfig({
            ...layoutConfig,
            sidebarWidth: 150,
            fileBrowserWidth: 100,
            editorWidth: 500,
            outputHeight: 300,
            terminalHeight: 300,
            chatWidth: 200,
            layoutMode: 'terminalFocus'
          });
        }}
        title="Terminal Focus"
      >
        🖥️
      </button>
      <button 
        className={`layout-preset-btn ${layoutConfig.layoutMode === 'chatFocus' ? 'active' : ''}`}
        onClick={() => {
          setLayoutConfig({
            ...layoutConfig,
            sidebarWidth: 150,
            fileBrowserWidth: 100,
            editorWidth: 500,
            outputHeight: 150,
            terminalHeight: 150,
            chatWidth: 400,
            layoutMode: 'chatFocus'
          });
        }}
        title="Chat Focus"
      >
        💬
      </button>
    </div>
  );
};

export default LayoutPresets;
