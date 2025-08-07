// /project-root/frontend/src/App.jsx
// Enhanced version with improved UI/UX components and user flow
import * as React from 'react';
const { Suspense, useEffect, useCallback } = React;
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthContext } from './hooks/useAuthContext';
import { FeedbackProvider, useFeedback } from './components/feedback/FeedbackContext.jsx';
import { AuthProvider as NewAuthProvider } from './contexts/NewAuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProjectProvider } from './contexts/NewProjectContext';
import { ApiProvider, useApi } from './contexts/NewApiContext';
import { AIProvider } from './contexts/AIContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { ToastContainer } from './components/feedback/Toast';
import './App.css';

// Import components
import AppWithTheme from './components/App/AppWithTheme';
import SettingsPage from './pages/SettingsPage';
import TerminalPage from './pages/TerminalPage';
import ChatPage from './pages/ChatPage';
import WritePage from './pages/WritePage';
import Register from './pages/Register';

// Protected route component with fallback for missing auth context
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// AppContainer wraps the App with our UI provider and routing
const AppContainer = () => {
  const { messageHistory, clearMessage } = useFeedback();
  const api = useApi();
  
  // Handle dismissing a toast message
  const handleDismissToast = useCallback((id) => {
    try {
      if (id && clearMessage) {
        clearMessage(id);
      }
    } catch (error) {
      console.error('Error dismissing toast:', error);
      // Fallback to clearing all messages if specific message clear fails
      if (clearMessage) {
        clearMessage();
      }
    }
  }, [clearMessage]);
  
  // Ensure isAiAvailable is always available
  const isAiAvailable = api?.isAiAvailable || (() => true);
  
  return (
    <ThemeProvider>
      <SettingsProvider>
        <NewAuthProvider>
          <ApiProvider>
            <ProjectProvider>
              <PreferencesProvider>
                <AIProvider>
                  <HotkeysProvider>
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                    <Routes>
                      <Route 
                        path="/settings/*" 
                        element={
                          <ProtectedRoute>
                            <SettingsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/terminal/:projectId?" 
                        element={
                          <ProtectedRoute>
                            <TerminalPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/chat/:projectId?" 
                        element={
                          <ProtectedRoute>
                            <ChatPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/write/:projectId?" 
                        element={
                          <ProtectedRoute>
                            <WritePage />
                          </ProtectedRoute>
                        } 
                      />
                      {/* Add dedicated project route that redirects to WritePage */}
                      <Route 
                        path="/project/:projectId" 
                        element={
                          <ProtectedRoute>
                            <WritePage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/register" element={<Register />} />
                      <Route path="/*" element={<AppWithTheme />} />
                    </Routes>
                    <ToastContainer 
                      toasts={messageHistory} 
                      onDismiss={handleDismissToast}
                    />
                  </Suspense>
                  </HotkeysProvider>
                </AIProvider>
              </PreferencesProvider>
            </ProjectProvider>
          </ApiProvider>
        </NewAuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

// FeedbackAwareApp uses the feedback context for toast notifications
const FeedbackAwareApp = () => {
  const { showInfo } = useFeedback();
  
  useEffect(() => {
    // Show welcome toast when app loads, but only once per session
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        showInfo('Welcome to Coder AI Platform');
        try {
          sessionStorage.setItem('hasSeenWelcome', 'true');
        } catch (error) {
          console.error('Error setting sessionStorage:', error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showInfo]);
  
  return <AppContainer />;
};

export default FeedbackAwareApp;
