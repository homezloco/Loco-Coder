import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ToastProvider from '../ui/Toast';
import AppMain from './AppMain';

/**
 * AppWithTheme component that applies the current theme to the application.
 * This component consumes the theme context and applies the appropriate theme classes.
 */
const AppWithTheme = () => {
  const { theme } = useTheme();

  return (
    <ToastProvider>
      <div className={`app ${theme}-theme`}>
        <AppMain />
      </div>
    </ToastProvider>
  );
};

export default AppWithTheme;
