/**
 * Code Execution Utilities
 * Handles executing code in various languages with multiple fallback mechanisms
 */

import { canExecuteInBrowser, canExecuteOnBackend } from './language-utils';

// API client import (using dynamic import to avoid circular dependencies)
let apiClient = null;
const getApiClient = async () => {
  if (!apiClient) {
    const { default: ApiClient } = await import('../api');
    apiClient = ApiClient;
  }
  return apiClient;
};

/**
 * Execute code with multi-level fallback strategy
 * @param {string} code - The code to execute
 * @param {string} language - Programming language 
 * @returns {Promise<object>} - Execution result with output, error and metadata
 */
export async function executeCode(code, language) {
  // Start execution timer
  const startTime = Date.now();
  
  try {
    // Strategy 1: Try backend execution via API if language is supported
    if (canExecuteOnBackend(language)) {
      try {
        const api = await getApiClient();
        const result = await api.execute(code, language);
        
        // If successful, return the result
        if (result && result.success) {
          return {
            ...result,
            executionTime: Date.now() - startTime,
            method: 'backend',
          };
        }
        
        // If we get here, backend execution failed but didn't throw an error
        console.warn(`Backend execution for ${language} returned unsuccessful result`);
      } catch (error) {
        console.warn(`Backend execution for ${language} failed:`, error);
        // Fall through to next strategy
      }
    }
    
    // Strategy 2: Try client-side execution if language supports it
    if (canExecuteInBrowser(language)) {
      try {
        const result = await executeInBrowser(code, language);
        return {
          ...result,
          executionTime: Date.now() - startTime,
          method: 'browser',
        };
      } catch (error) {
        console.warn(`Browser execution for ${language} failed:`, error);
        // Fall through to next strategy
      }
    }
    
    // Strategy 3: Basic syntax validation and simulated execution
    try {
      const result = await validateSyntax(code, language);
      return {
        ...result,
        executionTime: Date.now() - startTime,
        method: 'validation',
      };
    } catch (error) {
      // Even validation failed
      console.error(`All execution strategies for ${language} failed:`, error);
      return {
        output: '',
        error: `Unable to execute ${language} code: ${error.message}`,
        success: false,
        executionTime: Date.now() - startTime,
        method: 'failed',
      };
    }
  } catch (error) {
    // Global catch for any unexpected errors
    console.error('Unexpected error during code execution:', error);
    return {
      output: '',
      error: `Execution error: ${error.message}`,
      success: false,
      executionTime: Date.now() - startTime,
      method: 'error',
    };
  }
}

/**
 * Execute JavaScript code in the browser
 * @param {string} code - JavaScript code
 * @returns {Promise<object>} - Execution result
 */
async function executeInBrowser(code, language) {
  // Currently only supporting JavaScript for browser execution
  if (language !== 'javascript' && language !== 'js') {
    throw new Error(`Browser execution not supported for ${language}`);
  }
  
  // Capture console output
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  let output = [];
  let errors = [];
  
  try {
    // Override console methods to capture output
    console.log = (...args) => {
      output.push(args.join(' '));
      originalConsoleLog.apply(console, args);
    };
    
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalConsoleError.apply(console, args);
    };
    
    console.warn = (...args) => {
      output.push(`[WARN] ${args.join(' ')}`);
      originalConsoleWarn.apply(console, args);
    };
    
    // Execute in an async function context to support await
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const executableCode = `
      try {
        ${code}
        return { success: true };
      } catch (e) {
        console.error(e);
        return { success: false, error: e.message };
      }
    `;
    
    const result = await new AsyncFunction(executableCode)();
    
    return {
      output: output.join('\n'),
      error: errors.join('\n'),
      success: result.success !== false,
    };
  } catch (error) {
    return {
      output: output.join('\n'),
      error: `Execution error: ${error.message}`,
      success: false,
    };
  } finally {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
}

/**
 * Basic syntax validation for code
 * @param {string} code - Code to validate
 * @param {string} language - Programming language
 * @returns {Promise<object>} - Validation result
 */
async function validateSyntax(code, language) {
  // Check for common syntax errors based on language
  let errors = [];
  
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      // Check for mismatched braces/brackets
      const jsErrors = validateBraces(code);
      if (jsErrors) errors.push(jsErrors);
      break;
      
    case 'python':
      // Check for indentation consistency and mismatched colons
      const pyErrors = validatePythonIndentation(code);
      if (pyErrors) errors.push(pyErrors);
      break;
      
    case 'go':
      // Check for basic Go syntax
      if (!code.includes('package ')) {
        errors.push('Missing package declaration');
      }
      break;
      
    case 'rust':
      // Check for basic Rust syntax
      if (code.includes('fn ') && !code.includes('{')) {
        errors.push('Function declarations must have a body');
      }
      break;
      
    case 'swift':
      // Check for basic Swift syntax
      if (code.includes('func ') && !code.includes('{')) {
        errors.push('Function declarations must have a body');
      }
      break;
      
    case 'kotlin':
      // Check for basic Kotlin syntax
      if (code.includes('fun ') && !code.includes('{')) {
        errors.push('Function declarations must have a body');
      }
      break;
      
    case 'dart':
      // Check for basic Dart syntax
      if (!code.includes('void main') && !code.includes('main()')) {
        errors.push('Warning: No main function found');
      }
      break;
      
    case 'csharp':
    case 'cs':
      // Check for basic C# syntax
      if (!code.includes('namespace ') && !code.includes('class ')) {
        errors.push('Warning: No namespace or class declaration found');
      }
      break;
      
    case 'react-native':
      // Check for basic React Native syntax
      if (!code.includes('import React')) {
        errors.push('Missing React import');
      }
      break;
      
    default:
      // Generic validation for other languages
      const genericErrors = validateBraces(code);
      if (genericErrors) errors.push(genericErrors);
  }
  
  // For all languages: basic brace matching
  const braceErrors = validateBraces(code);
  if (braceErrors && !errors.includes(braceErrors)) {
    errors.push(braceErrors);
  }
  
  if (errors.length > 0) {
    return {
      output: `Syntax validation for ${language}:\nCode has potential syntax issues. It may not execute correctly.`,
      error: errors.join('\n'),
      success: false,
    };
  }
  
  return {
    output: `Syntax validation for ${language} passed. Note: This is a fallback validation only, not full execution.`,
    error: '',
    success: true,
  };
}

/**
 * Validate matching braces, brackets, and parentheses
 * @param {string} code - Code to validate
 * @returns {string|null} - Error message or null if valid
 */
function validateBraces(code) {
  const stack = [];
  const pairs = {
    '(': ')',
    '[': ']',
    '{': '}',
  };
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      const last = stack.pop();
      if (!last || pairs[last] !== char) {
        return `Mismatched brackets: found '${char}' without matching opening bracket`;
      }
    }
  }
  
  if (stack.length > 0) {
    return `Unclosed brackets: ${stack.join(', ')}`;
  }
  
  return null;
}

/**
 * Validate Python indentation consistency
 * @param {string} code - Python code
 * @returns {string|null} - Error message or null if valid
 */
function validatePythonIndentation(code) {
  const lines = code.split('\n');
  const indentLevels = [];
  let errors = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    
    // Count leading spaces
    const indent = line.search(/\S/);
    if (indent === -1) continue; // Empty line
    
    // Check if this is a new block (ends with :)
    if (line.trim().endsWith(':')) {
      indentLevels.push(indent);
    } 
    // Check indent consistency
    else if (indentLevels.length > 0) {
      const lastIndent = indentLevels[indentLevels.length - 1];
      
      // Dedent: check if we dedented to a valid previous level
      if (indent < lastIndent) {
        while (indentLevels.length > 0 && indent < indentLevels[indentLevels.length - 1]) {
          indentLevels.pop();
        }
        
        if (indentLevels.length > 0 && indent !== indentLevels[indentLevels.length - 1]) {
          errors.push(`Line ${i+1}: Inconsistent indentation`);
        }
      } 
      // Indent: should be deeper than the last block starter
      else if (indent > lastIndent) {
        if (lines[i-1] && !lines[i-1].trim().endsWith(':')) {
          errors.push(`Line ${i+1}: Unexpected indentation`);
        }
      }
    }
  }
  
  return errors.length > 0 ? errors.join('\n') : null;
}

// Export singleton instance for direct use
export default {
  executeCode
};
