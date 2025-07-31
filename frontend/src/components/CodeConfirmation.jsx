// CodeConfirmation.jsx - Dialog to confirm code changes
import React from 'react';

/**
 * CodeConfirmation component for confirming code changes
 * @param {Object} props - Component props
 * @param {string} props.action - The action type ('apply', 'append', 'execute')
 * @param {string} props.code - The code to be applied/executed
 * @param {string} props.language - The programming language of the code
 * @param {Function} props.onAccept - Function to call when code is accepted
 * @param {Function} props.onReject - Function to call when code is rejected
 * @param {boolean} props.isDarkMode - Dark mode state
 */
export default function CodeConfirmation({ action, code, language, onAccept, onReject, isDarkMode }) {
  return (
    <div className={`code-confirmation ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="confirmation-header">
        <h4>{action === 'execute' ? 'Run Code?' : 'Apply Code Change?'}</h4>
        <div className="confirmation-buttons">
          <button onClick={onAccept} className="accept-button">Apply</button>
          <button onClick={onReject} className="reject-button">Reject</button>
        </div>
      </div>
      <pre className="code-preview">
        <code>{code}</code>
      </pre>
    </div>
  );
}
