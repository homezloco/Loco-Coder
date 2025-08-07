import React, { createContext, useState, useEffect } from 'react';

// Create the preferences context
export const PreferencesContext = createContext();

// Default preferences
const defaultPreferences = {
  codeGeneration: {
    techStack: 'python-fastapi',
    advancedOptions: {
      includeDocumentation: true,
      includeTests: true,
      includeDocker: true,
      optimizeForPerformance: false,
      includeExamples: true
    }
  },
  ui: {
    expandedSections: {},
    lastViewedTab: 'implementation'
  }
};

// Provider component
export const PreferencesProvider = ({ children }) => {
  // Initialize state from localStorage or defaults
  const [preferences, setPreferences] = useState(() => {
    const savedPreferences = localStorage.getItem('codecraft_preferences');
    return savedPreferences ? JSON.parse(savedPreferences) : defaultPreferences;
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('codecraft_preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Update specific preference sections
  const updateCodeGenerationPreferences = (newPrefs) => {
    setPreferences(prev => ({
      ...prev,
      codeGeneration: {
        ...prev.codeGeneration,
        ...newPrefs
      }
    }));
  };

  const updateAdvancedOptions = (newOptions) => {
    setPreferences(prev => ({
      ...prev,
      codeGeneration: {
        ...prev.codeGeneration,
        advancedOptions: {
          ...prev.codeGeneration.advancedOptions,
          ...newOptions
        }
      }
    }));
  };

  const updateUIPreferences = (newPrefs) => {
    setPreferences(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        ...newPrefs
      }
    }));
  };

  // Reset preferences to defaults
  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem('codecraft_preferences');
  };

  // Context value
  const value = {
    preferences,
    updateCodeGenerationPreferences,
    updateAdvancedOptions,
    updateUIPreferences,
    resetPreferences
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export default PreferencesProvider;
