import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings 
      ? JSON.parse(savedSettings)
      : {
          // Editor settings
          theme: 'dark',
          fontSize: 14,
          lineNumbers: true,
          minimap: true,
          wordWrap: 'on',
          autoSave: true,
          autoSaveInterval: 5, // minutes
          fontFamily: 'Fira Code, monospace',
          showLineNumbers: true,
          showMinimap: true,
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: 'selection',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'blink',
          cursorSmoothCaretAnimation: true,
          formatOnSave: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          quickSuggestionsDelay: 100,
          
          // AI Agent Preferences
          aiPreferences: {
            // Code Generation
            preferFunctional: true,
            preferTypeScript: true,
            preferAsyncAwait: true,
            preferArrowFunctions: true,
            preferDestructuring: true,
            preferTemplateLiterals: true,
            preferConst: true,
            preferForOf: true,
            preferOptionalChaining: true,
            preferNullishCoalescing: true,
            
            // Code Style
            maxLineLength: 100,
            quoteStyle: 'single', // 'single' | 'double'
            trailingComma: 'es5', // 'none' | 'es5' | 'all'
            bracketSpacing: true,
            arrowParens: 'always', // 'avoid' | 'always'
            endOfLine: 'lf', // 'lf' | 'crlf' | 'cr' | 'auto'
            
            // Framework Preferences
            frontend: {
              framework: 'react', // 'react', 'vue', 'angular', 'svelte', 'none'
              stateManagement: 'context', // 'context', 'redux', 'mobx', 'recoil', 'none'
              styling: 'tailwind', // 'tailwind', 'css', 'scss', 'styled-components', 'emotion', 'none'
              testing: 'jest', // 'jest', 'vitest', 'testing-library', 'none'
            },
            backend: {
              language: 'node', // 'node', 'python', 'go', 'java', 'csharp', 'ruby', 'php', 'none'
              framework: 'express', // 'express', 'nest', 'fastify', 'django', 'flask', 'spring', 'laravel', 'rails', 'none'
              orm: 'prisma', // 'prisma', 'typeorm', 'sequelize', 'mongoose', 'drizzle', 'none'
              database: 'postgresql', // 'postgresql', 'mysql', 'sqlite', 'mongodb', 'none'
              authentication: 'jwt', // 'jwt', 'session', 'oauth', 'none'
            },
            mobile: {
              framework: 'react-native', // 'react-native', 'flutter', 'native', 'none'
              stateManagement: 'context', // 'context', 'redux', 'mobx', 'none'
              navigation: 'react-navigation', // 'react-navigation', 'react-native-navigation', 'none'
            },
            
            // Code Quality
            enforceTypes: true,
            noImplicitAny: true,
            strictNullChecks: true,
            strictFunctionTypes: true,
            strictBindCallApply: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noImplicitReturns: true,
            noFallthroughCasesInSwitch: true,
            
            // Documentation
            generateJSDoc: true,
            generateTypeDoc: true,
            includeExamples: true,
            
            // Security
            validateInput: true,
            escapeOutput: true,
            useSecureDefaults: true,
            
            // Performance
            optimizeForPerformance: true,
            preferBuiltins: true,
            
            // Testing
            generateTests: true,
            testFramework: 'jest', // 'jest', 'vitest', 'mocha', 'none'
            testCoverage: 80, // percentage
            
            // Linting
            enableESLint: true,
            enablePrettier: true,
            autoFixOnSave: true,
            
            // Git
            conventionalCommits: true,
            semanticCommitMessages: true,
            
            // Custom Rules
            customRules: []
          },
          
          // Editor settings (continued)
          parameterHints: {
            enabled: true,
            cycle: false
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showModules: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showIssues: true,
            showUsers: true,
            showColors: true
          }
        };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const resetSettings = () => {
    localStorage.removeItem('appSettings');
    setSettings({
      theme: 'dark',
      fontSize: 14,
      lineNumbers: true,
      minimap: true,
      wordWrap: 'on',
      autoSave: true,
      autoSaveInterval: 5,
      fontFamily: 'Fira Code, monospace',
      showLineNumbers: true,
      showMinimap: true,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'blink',
      cursorSmoothCaretAnimation: true,
      formatOnSave: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      quickSuggestionsDelay: 100,
      parameterHints: {
        enabled: true,
        cycle: false
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showModules: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showIssues: true,
        showUsers: true,
        showColors: true
      },
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
