import React, { forwardRef, useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { FlexibleOutput } from './components/layout';
import './terminal-styles.css';

const Terminal = forwardRef(({ output, isDarkMode = false }, ref) => {
  const terminalRef = useRef(null);
  const [flash, setFlash] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState(output || '');
  const prevOutputLengthRef = useRef(output?.length || 0);
  
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clear: () => {
      setTerminalOutput('');
      return true;
    },
    // Add other methods as needed
    getOutput: () => terminalOutput,
    focus: () => {
      if (terminalRef.current) {
        terminalRef.current.focus?.();
      }
    }
  }));
  
  // Handle output change and trigger flash effect
  useEffect(() => {
    if (output?.length > prevOutputLengthRef.current) {
      // Output has been added - trigger flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }
    prevOutputLengthRef.current = output?.length || 0;
    setTerminalOutput(output || '');
  }, [output]);

  // Format output with line numbers for plain text representation
  const formatOutputForDisplay = useCallback((outputText) => {
    if (!outputText) return '';
    
    const lines = outputText.split('\n');
    return lines.map((line, idx) => {
      return `${(idx + 1).toString().padStart(4, ' ')}  ${line}`;
    }).join('\n');
  }, []);

  // Handle clear event from FlexibleOutput
  useEffect(() => {
    const handleClear = () => {
      setTerminalOutput('');
      // Optional: Send a clear event to parent component if needed
      const clearEvent = new CustomEvent('terminal-clear', { bubbles: true });
      if (terminalRef.current) {
        terminalRef.current.dispatchEvent(clearEvent);
      }
    };

    const currentRef = terminalRef.current;
    if (currentRef) {
      currentRef.addEventListener('clear-output', handleClear);
    }
    
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('clear-output', handleClear);
      }
    };
  }, [terminalRef]);

  return (
    <div 
      ref={terminalRef}
      className={`terminal ${isDarkMode ? 'dark' : 'light'} ${flash ? 'flash' : ''}`}
    >
      <FlexibleOutput
        content={formatOutputForDisplay(terminalOutput)}
        isDarkMode={isDarkMode}
        showLineNumbers={true}
        showCopyButton={true}
        showClearButton={true}
      />
    </div>
  );
});

Terminal.propTypes = {
  output: PropTypes.string,
  isDarkMode: PropTypes.bool
};

Terminal.displayName = 'Terminal';

export default Terminal;
