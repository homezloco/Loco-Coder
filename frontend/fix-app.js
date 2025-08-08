// Simple script to help diagnose React app issues
// Use centralized logger if available, otherwise fallback to console with namespace prefix
const fixAppLog = (function () {
  try {
    if (window && window.logger && typeof window.logger.ns === 'function') {
      return window.logger.ns('util:fix-app');
    }
  } catch {}
  const prefix = '[util:fix-app]';
  return {
    info: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    debug: (...args) => console.debug(prefix, ...args),
    trace: (...args) => console.trace(prefix, ...args),
  };
})();

fixAppLog.info('Checking React app issues...');

// Add a basic div to the DOM for diagnostics
function addDiagnosticDiv() {
  const div = document.createElement('div');
  div.id = 'react-diagnostic';
  div.style.position = 'fixed';
  div.style.top = '20px';
  div.style.left = '20px';
  div.style.padding = '20px';
  div.style.backgroundColor = '#f44336';
  div.style.color = 'white';
  div.style.zIndex = '999999999';
  div.style.borderRadius = '5px';
  div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
  div.style.fontFamily = 'sans-serif';
  div.innerHTML = `
    <h3>React App Diagnostics</h3>
    <p>If you can see this, your app is not rendering properly due to JSX syntax errors.</p>
    <p>Check App.jsx for missing closing tags, syntax errors, or duplicate return statements.</p>
    <p>Temporary Navigation:</p>
    <button id="direct-menu-btn" style="margin: 5px; padding: 10px; background: #fff; color: #333; border: none; cursor: pointer;">Direct Menu</button>
    <button id="framed-app-btn" style="margin: 5px; padding: 10px; background: #fff; color: #333; border: none; cursor: pointer;">Framed App</button>
  `;
  document.body.appendChild(div);

  // Add click handlers
  document.getElementById('direct-menu-btn').addEventListener('click', () => {
    window.location.href = '/direct-menu.html';
  });
  document.getElementById('framed-app-btn').addEventListener('click', () => {
    window.location.href = '/framed-app.html';
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addDiagnosticDiv);
} else {
  addDiagnosticDiv();
}

// Report any errors via logger
window.addEventListener('error', (e) => {
  fixAppLog.error('React Error:', e.message);
});
