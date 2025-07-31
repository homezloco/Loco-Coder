import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const defaultSettings = {
  autosave: true,
  autosaveInterval: 5, // in seconds
  fontSize: 14,
  tabSize: 2,
  theme: 'system', // system, light, dark
  showLineNumbers: true,
  wordWrap: false,
  minimap: {
    enabled: true,
    showSlider: 'always', // 'always', 'mouseover', 'never'
    renderCharacters: true,
    maxColumn: 80
  },
  editor: {
    fontFamily: 'Fira Code, Menlo, Monaco, Consolas, monospace',
    fontWeight: '400',
    lineHeight: 1.5,
    cursorStyle: 'line', // 'line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'
    cursorBlinking: 'blink', // 'blink', 'smooth', 'phase', 'expand', 'solid'
    renderWhitespace: 'selection', // 'none', 'boundary', 'selection', 'all'
    renderLineHighlight: 'all', // 'all', 'line', 'none', 'gutter'
    scrollBeyondLastLine: false,
    autoClosingBrackets: 'always', // 'always', 'languageDefined', 'beforeWhitespace', 'never'
    autoClosingQuotes: 'always', // 'always', 'languageDefined', 'beforeWhitespace', 'never'
    autoIndent: 'full', // 'none', 'keep', 'brackets', 'advanced', 'full'
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on', // 'on', 'smart', 'off'
    acceptSuggestionOnCommitCharacter: true,
    wordBasedSuggestions: 'on', // 'off', 'matchingDocuments', 'matchingDocumentsWithImportStatements', 'allDocuments', 'currentDocument', 'matchingDocumentsWithImportStatements'
    suggestSelection: 'recentlyUsed', // 'first', 'recentlyUsed', 'recentlyUsedByPrefix'
    suggest: {
      filterGraceful: true,
      snippets: 'inline', // 'top', 'bottom', 'inline', 'none'
      snippetsPreventQuickSuggestions: true,
      localityBonus: true,
      shareSuggestSelections: false,
      showClasses: true,
      showColors: true,
      showConstants: true,
      showConstructors: true,
      showDeprecated: true,
      showEnumMembers: true,
      showEvents: true,
      showFields: true,
      showFiles: true,
      showFolders: true,
      showFunctions: true,
      showInterfaces: true,
      showIssues: true,
      showKeywords: true,
      showModules: true,
      showOperators: true,
      showProperties: true,
      showReferences: true,
      showSnippets: true,
      showStructs: true,
      showTypeParameters: true,
      showUnits: true,
      showUsers: true,
      showValues: true,
      showVariables: true,
      showWords: true
    },
    quickSuggestions: {
      comments: true,
      strings: true,
      other: true
    },
    parameterHints: {
      enabled: true,
      cycle: false
    }
  }
};

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return defaultSettings;
    }
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings,
      // Ensure nested objects are properly merged
      minimap: {
        ...prevSettings.minimap,
        ...(newSettings.minimap || {})
      },
      editor: {
        ...prevSettings.editor,
        ...(newSettings.editor || {})
      },
      suggest: {
        ...prevSettings.suggest,
        ...(newSettings.suggest || {})
      },
      quickSuggestions: {
        ...prevSettings.quickSuggestions,
        ...(newSettings.quickSuggestions || {})
      },
      parameterHints: {
        ...prevSettings.parameterHints,
        ...(newSettings.parameterHints || {})
      }
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value = {
    settings,
    updateSettings,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

SettingsProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
