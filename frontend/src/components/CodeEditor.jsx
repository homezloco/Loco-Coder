import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import api from '../api';
import { executePythonInBrowser, isPyodideAvailable } from '../utils/pyodide-executor';
import { executeCode } from '../utils/code-execution';
import { 
  LANGUAGE_CATEGORIES,
  LANGUAGE_DISPLAY_NAMES,
  LANGUAGE_CAPABILITIES, 
  getMonacoLanguage,
  detectLanguageFromContent,
  getExtensionForLanguage
} from '../utils/language-utils';
import '../MonacoConfig'; // Import Monaco configuration with language support

/**
 * CodeEditor component with execution capabilities and fallback mechanisms
 * Supports multi-language execution with robust fallbacks
 */
const CodeEditor = ({ 
  defaultLanguage = 'python',
  defaultValue = '# Write your Python code here\nprint("Hello, World!")',
  theme = 'vs-dark',
  height = '70vh',
  onSave = null,
  initialFileName = null
}) => {
  const editorRef = useRef(null);
  const [code, setCode] = useState(defaultValue);
  const [language, setLanguage] = useState(defaultLanguage);
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [executionMethod, setExecutionMethod] = useState('backend'); // 'backend' or 'pyodide' or 'browser'
  const [fileName, setFileName] = useState(initialFileName || `untitled${getExtensionForLanguage(defaultLanguage)}`);
  
  // Update filename when language changes
  useEffect(() => {
    if (fileName && fileName.startsWith('untitled')) {
      setFileName(`untitled${getExtensionForLanguage(language)}`);
    }
  }, [language]);

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    // Focus the editor
    editor.focus();
  };

  // Handle code execution with multiple fallback mechanisms
  const handleCodeExecution = async () => {
    const codeToExecute = editorRef.current ? editorRef.current.getValue() : code;
    setIsExecuting(true);
    setOutput('Executing...');
    setError(null);
    
    try {
      // Special handling for HTML/CSS for browser rendering
      if (language === 'html') {
        // Create a data URL from HTML
        const htmlDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(codeToExecute)}`;
        setOutput(`<iframe src="${htmlDataUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
        setError(null);
        setIsExecuting(false);
        return;
      } else if (language === 'css') {
        // Create a simple HTML page with the CSS applied
        const htmlWithCss = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>${codeToExecute}</style>
          </head>
          <body>
            <h1>CSS Preview</h1>
            <div class="container">
              <p>This is a paragraph to preview your CSS</p>
              <button>Sample Button</button>
              <div class="box">Sample Box Element</div>
            </div>
          </body>
          </html>
        `;
        const cssDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlWithCss)}`;
        setOutput(`<iframe src="${cssDataUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
        setError(null);
        setIsExecuting(false);
        return;
      } 
      
      // Pyodide-specific execution for Python
      if (executionMethod === 'pyodide' && language === 'python') {
        // Execute Python code directly in the browser using Pyodide
        setOutput('Initializing Python environment in browser...');
        
        try {
          // Check if Pyodide is available
          const pyodideAvailable = await isPyodideAvailable();
          
          if (!pyodideAvailable) {
            throw new Error('Pyodide environment is not available. It may have failed to load.');
          }
          
          setOutput('Executing Python code in browser...');
          const result = await executePythonInBrowser(codeToExecute);
          
          if (result.success) {
            setOutput(`${result.output}\n\n[Client-side execution completed in ${result.execution_time.toFixed(2)}s]`);
            if (result.error && result.error.trim()) {
              // Some warnings might appear even on successful execution
              setError(`Warnings: ${result.error}`);
            }
            setIsExecuting(false);
            return;
          }
        } catch (pyError) {
          console.warn('Pyodide execution failed, falling back to unified executor:', pyError);
          // Fall through to unified executor
        }
      }
      
      // Unified multi-language code execution with fallbacks
      setOutput('Executing code...');
      const result = await executeCode(codeToExecute, language);
      
      // Update UI with execution results
      if (result.success) {
        setOutput(result.output ? result.output : 'Execution completed successfully.');
        if (result.method) {
          setOutput(prev => `${prev}\n\n[Executed via ${result.method} in ${(result.executionTime / 1000).toFixed(2)}s]`);
        }
        setError(null);
      } else {
        setOutput(result.output || '');
        setError(result.error || 'Execution failed with unknown error');
      }
      
      // Update execution method for next run based on what worked
      if (result.method) {
        setExecutionMethod(result.method === 'browser' ? 'browser' : 'backend');
      }
    } catch (error) {
      console.error('Execution error:', error);
      setError(`Execution error: ${error.message}`);
      setOutput('');
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle language change
  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    
    // Update Monaco editor language
    if (editorRef.current) {
      const monaco = editorRef.current.getModel();
      if (monaco) {
        monaco.setValue(''); // Clear editor
        monaco.setValue(getTemplateForLanguage(newLanguage)); // Set new template
      }
    }
  };

  // Get template code for a language
  const getTemplateForLanguage = (lang) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return '# Python code\nprint("Hello, World!")';
      case 'javascript':
        return '// JavaScript code\nconsole.log("Hello, World!");';
      case 'go':
        return 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}';
      case 'rust':
        return 'fn main() {\n\tprintln!("Hello, World!");\n}';
      case 'swift':
        return 'import Foundation\n\nprint("Hello, World!")';
      case 'kotlin':
        return 'fun main() {\n\tprintln("Hello, World!")\n}';
      case 'dart':
        return 'void main() {\n\tprint("Hello, World!");\n}';
      case 'csharp':
      case 'cs':
        return 'using System;\n\npublic class Program {\n\tpublic static void Main() {\n\t\tConsole.WriteLine("Hello, World!");\n\t}\n}';
      case 'react-native':
        return 'import React from "react";\nimport { View, Text, StyleSheet } from "react-native";\n\nexport default function App() {\n\treturn (\n\t\t<View style={styles.container}>\n\t\t\t<Text>Hello, World!</Text>\n\t\t</View>\n\t);\n}\n\nconst styles = StyleSheet.create({\n\tcontainer: {\n\t\tflex: 1,\n\t\tjustifyContent: "center",\n\t\talignItems: "center"\n\t}\n});';
      case 'html':
        return '<!DOCTYPE html>\n<html>\n<head>\n\t<title>Hello World</title>\n</head>\n<body>\n\t<h1>Hello, World!</h1>\n</body>\n</html>';
      case 'css':
        return 'body {\n\tfont-family: Arial, sans-serif;\n\tmargin: 0;\n\tpadding: 20px;\n}\n\nh1 {\n\tcolor: navy;\n}';
      default:
        return `// ${lang} code\n`;
    }
  };

  // Handle save
  const handleSave = () => {
    if (onSave && editorRef.current) {
      const currentCode = editorRef.current.getValue();
      onSave({
        content: currentCode,
        language: language,
        fileName: fileName
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Ctrl/Cmd + Enter to execute
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCodeExecution();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

  // Create language options organized by category
  const renderLanguageOptions = () => {
    const categories = Object.keys(LANGUAGE_CATEGORIES);
    
    return (
      <>
        {categories.map(category => (
          <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
            {LANGUAGE_CATEGORIES[category].map(lang => (
              <option key={lang} value={lang}>
                {LANGUAGE_DISPLAY_NAMES[lang] || lang}
              </option>
            ))}
          </optgroup>
        ))}
      </>
    );
  };

  // Render execution controls
  const renderExecutionControls = () => (
    <div className="execution-controls">
      <button 
        onClick={handleCodeExecution} 
        disabled={isExecuting}
        className="run-button"
      >
        {isExecuting ? 'Executing...' : 'Run Code'}
      </button>
      
      <select 
        value={executionMethod} 
        onChange={(e) => setExecutionMethod(e.target.value)}
        className="execution-method"
        disabled={isExecuting}
      >
        <option value="backend">Backend (Default)</option>
        {language === 'python' && <option value="pyodide">Browser (Pyodide)</option>}
        {language === 'javascript' && <option value="browser">Browser (JS)</option>}
      </select>
    </div>
  );

  return (
    <div className="code-editor-container">
      <div className="editor-header">
        <input 
          type="text" 
          value={fileName} 
          onChange={(e) => setFileName(e.target.value)}
          className="file-name-input"
        />
        
        <select 
          value={language} 
          onChange={handleLanguageChange}
          className="language-selector"
        >
          {renderLanguageOptions()}
        </select>
        
        {renderExecutionControls()}
        
        <button onClick={handleSave} className="save-button">
          Save
        </button>
      </div>
      
      <div className="editor-container">
        <Editor
          height={height}
          defaultLanguage={getMonacoLanguage(language)}
          defaultValue={code}
          theme={theme}
          onMount={handleEditorDidMount}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: 'Fira Code, monospace',
            fontSize: 14,
            tabSize: 2,
            automaticLayout: true
          }}
        />
      </div>
      
      <div className="output-container">
        <div className="output-header">
          <h3>Output</h3>
          {isExecuting && <div className="loader"></div>}
        </div>
        
        <div className="output-content">
          {output && (
            <pre className="output-text">
              {output.includes('<iframe') 
                ? <div dangerouslySetInnerHTML={{ __html: output }} />
                : output
              }
            </pre>
          )}
          
          {error && (
            <pre className="error-text">
              {error}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
