import React from 'react';
import './FlexibleOutput.css';

const FlexibleOutput = ({ children }) => {
  return (
    <div className="flexible-output">
      <div className="flexible-output-toolbar">
        {/* Toolbar content can be added here */}
      </div>
      <div className="flexible-output-content">
        {children}
      </div>
    </div>
  );
};

export default FlexibleOutput;
