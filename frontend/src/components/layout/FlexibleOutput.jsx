// FlexibleOutput.jsx - Enhanced output panel with auto-scrolling and size controls
import React, { useEffect, useRef, useState } from 'react';
import './FlexibleOutput.css';

/**
 * FlexibleOutput component ensures console output is always visible and properly sized
 * with auto-scrolling and text size controls
 */
const FlexibleOutput = ({
  content,
  title = "Console Output",
  maxHeight = null,
  autoScroll = true,
  isDarkMode = false,
  fontSize = 14,
  className = "",
  style = {},
}) => {
  const outputRef = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(autoScroll);
  const [textSize, setTextSize] = useState(fontSize);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (outputRef.current && isAutoScrolling) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [content, isAutoScrolling]);

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    setIsAutoScrolling(!isAutoScrolling);
  };

  // Increase text size
  const increaseTextSize = () => {
    setTextSize(prev => Math.min(prev + 1, 24));
  };

  // Decrease text size
  const decreaseTextSize = () => {
    setTextSize(prev => Math.max(prev - 1, 10));
  };

  // Clear the terminal by sending an event to parent
  const handleClear = () => {
    const clearEvent = new CustomEvent('clear-output', {
      bubbles: true,
      detail: { timestamp: Date.now() }
    });
    outputRef.current.dispatchEvent(clearEvent);
  };

  // Copy output content to clipboard
  const copyToClipboard = () => {
    if (navigator.clipboard && content) {
      navigator.clipboard.writeText(content)
        .then(() => {
          // Show temporary "Copied!" indicator
          const copyBtn = document.querySelector('.copy-btn');
          if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
              copyBtn.textContent = originalText;
            }, 2000);
          }
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };

  return (
    <div 
      className={`flexible-output ${isDarkMode ? 'dark' : 'light'} ${className}`}
      style={style}
    >
      <div className="flexible-output-header">
        <div className="output-title">{title}</div>
        <div className="output-controls">
          <button 
            onClick={decreaseTextSize} 
            className="size-btn" 
            title="Decrease text size"
          >
            A-
          </button>
          <button 
            onClick={increaseTextSize} 
            className="size-btn" 
            title="Increase text size"
          >
            A+
          </button>
          <button 
            onClick={toggleAutoScroll} 
            className={`auto-scroll-btn ${isAutoScrolling ? 'active' : ''}`}
            title={isAutoScrolling ? "Auto-scroll enabled" : "Auto-scroll disabled"}
          >
            ↓
          </button>
          <button 
            onClick={copyToClipboard} 
            className="copy-btn" 
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button 
            onClick={handleClear} 
            className="clear-btn" 
            title="Clear output"
          >
            Clear
          </button>
        </div>
      </div>
      <div 
        ref={outputRef}
        className="flexible-output-content"
        style={{
          fontSize: `${textSize}px`,
          maxHeight: maxHeight || 'none',
        }}
      >
        {content ? (
          <pre>{content}</pre>
        ) : (
          <div className="no-output">No output to display</div>
        )}
      </div>
    </div>
  );
};

export default FlexibleOutput;
