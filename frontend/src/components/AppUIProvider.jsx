import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import { FeedbackProvider, OfflineIndicator } from './feedback';
import { KeyboardShortcutsOverlay } from './navigation';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

// Create a theme with modern styling for CodeCraft AI
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e1e1e',
      light: '#3c3c3c',
      dark: '#0d0d0d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00b8d4',
      light: '#33c9dc',
      dark: '#008394',
      contrastText: '#ffffff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: '"Fira Code", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          borderRadius: 8,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        },
      },
    },
  },
});

/**
 * Main UI Provider Component
 * Centralizes UI/UX enhancements with robust fallbacks across the application
 */
const AppUIProvider = ({ 
  children, 
  isDarkMode = false 
}) => {
  // Keyboard shortcuts state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Enhanced keyboard shortcuts
  const shortcuts = [
    { key: 'Alt+P', description: 'Toggle Project Dashboard', category: 'navigation' },
    { key: 'Alt+F', description: 'Open Framed App', category: 'navigation' },
    { key: 'Alt+H', description: 'Open Help', category: 'help' },
    { key: 'Alt+U', description: 'New Project Template', category: 'projects' },
    { key: 'Alt+1', description: 'Reset Layout', category: 'layout' },
    { key: 'Alt+2', description: 'Maximize Editor', category: 'layout' },
    { key: 'Alt+3', description: 'Maximize Terminal', category: 'layout' },
    { key: '?', description: 'Show Keyboard Shortcuts', category: 'help' },
    { key: 'Ctrl+S', description: 'Save Current File', category: 'files' },
    { key: 'Ctrl+O', description: 'Open File', category: 'files' },
    { key: 'Ctrl+N', description: 'New File', category: 'files' },
    { key: 'Esc', description: 'Close Modal / Cancel', category: 'general' }
  ];
  
  // Handle keyboard shortcuts overlay toggle
  const toggleKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcuts(prev => !prev);
  }, []);
  
  // Setup global keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle keyboard shortcuts overlay with '?' key
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleKeyboardShortcuts();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleKeyboardShortcuts]);
  
  // Apply global styles for ensuring visibility
  useEffect(() => {
    // Add global styles for guaranteed visibility
    const globalStyle = document.createElement('style');
    globalStyle.innerHTML = `
      /* Guarantee button and interaction visibility */
      button, 
      .nav-button, 
      .menu-item, 
      a[role="button"],
      .project-dashboard-container {
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Improved focus styles for accessibility */
      *:focus-visible {
        outline: 3px solid ${isDarkMode ? '#60a5fa' : '#3b82f6'};
        outline-offset: 2px;
      }
      
      /* Smooth transitions */
      .transition-all {
        transition: all 0.2s ease-in-out;
      }
      
      /* Enhanced scrollbar styles */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: ${isDarkMode ? '#1e293b' : '#f1f5f9'};
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${isDarkMode ? '#475569' : '#cbd5e1'};
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: ${isDarkMode ? '#64748b' : '#94a3b8'};
      }
      
      /* Modern layout styling */
      .layout-preset-btn {
        background: ${isDarkMode ? '#334155' : '#e2e8f0'};
        color: ${isDarkMode ? '#fff' : '#2d3748'};
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s ease-in-out;
      }
      
      .layout-preset-btn:hover {
        background: ${isDarkMode ? '#4a5568' : '#cbd5e1'};
      }
      
      .layout-preset-btn.active {
        background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
        color: white;
      }
      
      /* Panel styling */
      .scrollable-panel {
        background: ${isDarkMode ? '#1a202c' : '#fff'};
        border: 1px solid ${isDarkMode ? '#2d3748' : '#e2e8f0'};
        border-radius: 4px;
        margin: 4px;
      }
      
      .panel-resize-handle {
        background: ${isDarkMode ? '#2d3748' : '#e2e8f0'};
        transition: background 0.2s ease;
      }
      
      .panel-resize-handle:hover {
        background: ${isDarkMode ? '#4a5568' : '#cbd5e1'};
      }
    `;
    
    document.head.appendChild(globalStyle);
    
    return () => {
      document.head.removeChild(globalStyle);
    };
  }, [isDarkMode]);
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <FeedbackProvider isDarkMode={isDarkMode}>
        {/* Offline indicator with position based on available space */}
        <OfflineIndicator 
          position="bottom-right" 
          isDarkMode={isDarkMode} 
        />
        
        {children}
        
        {/* Global keyboard shortcuts overlay */}
        <KeyboardShortcutsOverlay
          isVisible={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
          isDarkMode={isDarkMode}
          shortcuts={shortcuts}
        />
      </FeedbackProvider>
    </MuiThemeProvider>
  );
};

AppUIProvider.propTypes = {
  children: PropTypes.node.isRequired,
  isDarkMode: PropTypes.bool
};

export default AppUIProvider;
