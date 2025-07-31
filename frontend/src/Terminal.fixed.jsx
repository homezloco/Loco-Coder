import React, { useRef, useEffect, useState } from 'react';
import './terminal-styles.css'; // Make sure to create this CSS file

export default function Terminal({ output }) {
  const terminalRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevOutputLengthRef = useRef(output?.length || 0);
  
  // Handle output change and trigger flash effect
  useEffect(() => {
    if (output?.length > prevOutputLengthRef.current) {
      // Output has been added - trigger flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }
    prevOutputLengthRef.current = output?.length || 0;
  }, [output]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current && !isCollapsed) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, isCollapsed]);

  // Format output with line numbers
  const formatOutput = (outputText) => {
    if (!outputText) return null;
    
    const lines = outputText.split('\n');
    return lines.map((line, idx) => (
      <div className="terminal-line" key={idx}>
        <span className="line-number">{idx + 1}</span>
        <span className="line-content">{line}</span>
      </div>
    ));
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    // When expanding, ensure we scroll to bottom after re-render
    if (isCollapsed) {
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 10);
    }
  };

  return (
    <div className={`terminal-outer-container ${flash ? 'flash' : ''}`}>
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="execution-status">📟 Output</span>
        </div>
        <div className="terminal-actions">
          <button 
            className="terminal-toggle-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand output' : 'Collapse output'}
          >
            {isCollapsed ? '▼ Show' : '▲ Hide'}
          </button>
        </div>
      </div>
      
      <div 
        className={`terminal-container ${isCollapsed ? 'collapsed' : ''}`}
      >
        <div 
          className="terminal" 
          ref={terminalRef}
          style={{ 
            maxHeight: isCollapsed ? '0' : '400px',
            overflowY: 'auto',
            transition: 'max-height 0.3s ease-in-out'
          }}
        >
          {formatOutput(output)}
        </div>
      </div>
    </div>
  );
}
