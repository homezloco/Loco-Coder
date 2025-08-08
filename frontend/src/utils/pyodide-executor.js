/**
 * Client-side Python code execution using Pyodide
 * Implements robust fallback execution for when backend services are unavailable
 */

import logger from './logger';
const log = logger.ns('api:ai:pyodide');

// Track pyodide loading state
let pyodideReadyPromise = null;
let pyodideInstance = null;
let pyodideLoadError = null;

// Configuration with fallbacks
const PYODIDE_CDN_URLS = [
  'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
  'https://cdn.skypack.dev/pyodide@0.24.1',
  'https://pyodide-cdn2.iodide.io/v0.24.1/full/pyodide.js',
];

/**
 * Initialize and load Pyodide with fallback CDNs
 * @returns {Promise<object>} Pyodide instance
 */
export async function loadPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadError) throw pyodideLoadError;
  
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = (async () => {
      let loadErrors = [];
      
      // Try each CDN URL until one works
      for (const cdnUrl of PYODIDE_CDN_URLS) {
        try {
          log.info(`Attempting to load Pyodide from ${cdnUrl}`);
          
          // Dynamically load the Pyodide script
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = cdnUrl;
            script.onload = resolve;
            script.onerror = (e) => reject(new Error(`Failed to load Pyodide from ${cdnUrl}`));
            document.head.appendChild(script);
          });
          
          // Wait for global loadPyodide function to be available
          if (typeof loadPyodide !== 'function') {
            throw new Error('loadPyodide function not available after script loaded');
          }
          
          // Initialize Pyodide
          log.info('Loading Pyodide environment...');
          const pyodide = await loadPyodide({
            indexURL: cdnUrl.substring(0, cdnUrl.lastIndexOf('/')),
          });
          
          log.info('Pyodide loaded successfully');
          return pyodide;
        } catch (error) {
          log.warn(`Failed to load Pyodide from ${cdnUrl}:`, error);
          loadErrors.push({ url: cdnUrl, error });
        }
      }
      
      // If we get here, all CDNs failed
      const error = new Error('Failed to load Pyodide from all CDN sources');
      error.details = loadErrors;
      throw error;
    })();
    
    // Handle successful loading or error
    pyodideReadyPromise
      .then(pyodide => {
        pyodideInstance = pyodide;
        log.info('Pyodide initialized and ready');
        
        // Pre-import commonly used modules
        return pyodide.loadPackagesFromImports('import sys, io, math, json, re');
      })
      .catch(error => {
        log.error('Pyodide initialization failed:', error);
        pyodideLoadError = error;
        pyodideReadyPromise = null; // Allow retrying later
      });
  }
  
  return pyodideReadyPromise;
}

/**
 * Execute Python code in the browser using Pyodide
 * @param {string} code Python code to execute
 * @param {object} options Execution options
 * @returns {Promise<object>} Execution result with output, error, and success status
 */
export async function executePythonInBrowser(code, options = {}) {
  const startTime = performance.now();
  const result = {
    output: '',
    error: null,
    execution_time: 0,
    success: false,
    method_used: 'client-pyodide'
  };
  
  try {
    // Load pyodide if not already loaded
    const pyodide = await loadPyodide();
    
    // Set up stdout capture
    pyodide.runPython(`
      import sys, io
      sys.stdout = io.StringIO()
      sys.stderr = io.StringIO()
    `);
    
    // Execute the code
    try {
      await pyodide.runPythonAsync(code);
      result.success = true;
    } catch (runError) {
      result.error = String(runError);
      result.success = false;
    }
    
    // Get stdout and stderr content
    const stdout = pyodide.runPython('sys.stdout.getvalue()');
    const stderr = pyodide.runPython('sys.stderr.getvalue()');
    
    // Restore stdout/stderr
    pyodide.runPython('sys.stdout = sys.__stdout__');
    pyodide.runPython('sys.stderr = sys.__stderr__');
    
    result.output = stdout;
    if (stderr && !result.error) {
      result.error = stderr;
    }
  } catch (error) {
    result.error = `Pyodide execution error: ${error.message || String(error)}`;
    if (error.details) {
      result.error += `\nDetails: ${JSON.stringify(error.details)}`;
    }
    result.success = false;
  } finally {
    result.execution_time = (performance.now() - startTime) / 1000;
  }
  
  return result;
}

/**
 * Check if Pyodide is available or can be loaded
 * @returns {Promise<boolean>} Whether Pyodide is available
 */
export async function isPyodideAvailable() {
  try {
    await loadPyodide();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Pre-install a Python package in the Pyodide environment
 * @param {string} packageName Name of the package to install
 * @returns {Promise<boolean>} Whether installation was successful
 */
export async function installPythonPackage(packageName) {
  try {
    const pyodide = await loadPyodide();
    
    // Install using micropip
    await pyodide.loadPackage('micropip');
    await pyodide.runPythonAsync(`
      import micropip
      await micropip.install('${packageName}')
    `);
    
    return true;
  } catch (error) {
    log.error(`Failed to install Python package ${packageName}:`, error);
    return false;
  }
}

export default {
  loadPyodide,
  executePythonInBrowser,
  isPyodideAvailable,
  installPythonPackage
};
