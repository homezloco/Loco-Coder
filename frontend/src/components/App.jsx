import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import ConnectionTest from '../ConnectionTest';
import api from '../api';
import MainMenu from './MainMenu';
import UserProfilePanel from './UserProfilePanel';
import ProjectDashboard from './ProjectDashboard';
import UnifiedMenu from './UnifiedMenu';
import ChatPanel from '../ChatPanel';

/**
 * Main App component with clean UI/UX and no duplications
 */
const App = () => {
  // State management
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showProjectDashboard, setShowProjectDashboard] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    autoApplyCode: false,
    confirmBeforeApplying: true,
    highlightChanges: true,
    useFallbackModels: true,
    apiEndpoint: 'http://localhost:5000/api'
  });
  
  // Apply dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);
  
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+P: Show Projects
      if (e.altKey && e.key === 'p') {
        setShowProjectDashboard(true);
      }
      // Alt+U: Toggle User Profile
      else if (e.altKey && e.key === 'u') {
        setShowUserProfile(!showUserProfile);
      }
      // Alt+N: New Project
      else if (e.altKey && e.key === 'n') {
        setShowProjectDashboard(true);
      }
      // Alt+C: Connection Test
      else if (e.altKey && e.key === 'c') {
        setShowConnectionTest(!showConnectionTest);
      }
      // Alt+D: Toggle Dark Mode
      else if (e.altKey && e.key === 'd') {
        setIsDarkMode(!isDarkMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUserProfile, showProjectDashboard, showConnectionTest, isDarkMode]);

  // Check backend connectivity with fallbacks
  useEffect(() => {
    const checkBackendConnectivity = async () => {
      setBackendStatus('checking');
      setErrorMessage(null);
      
      // Try multiple connection methods
      try {
        // Primary method: API client with its own fallbacks
        const healthResponse = await api.checkHealth();
        setBackendStatus(healthResponse.status || 'connected');
        setIsConnected(true);
      } catch (primaryError) {
        console.error('Primary connection method failed:', primaryError);
        
        // Fallback 1: Direct fetch to localhost
        try {
          const response = await fetch('http://localhost:8000/health');
          if (response.ok) {
            const data = await response.json();
            setBackendStatus(`connected (direct: ${data.status})`);
            setIsConnected(true);
            return;
          }
        } catch (directError) {
          console.error('Direct connection also failed:', directError);
        }
        
        // Fallback 2: Try alternative IP
        try {
          const response = await fetch('http://127.0.0.1:8000/health');
          if (response.ok) {
            const data = await response.json();
            setBackendStatus(`connected (alt-ip: ${data.status})`);
            setIsConnected(true);
            return;
          }
        } catch (altIpError) {
          console.error('Alternative IP connection failed:', altIpError);
        }
        
        // All methods failed
        setBackendStatus('disconnected');
        setIsConnected(false);
        setErrorMessage('Unable to connect to backend API. Please check if the server is running.');
      }
    };
    
    checkBackendConnectivity();
    
    // Periodically check connectivity
    const interval = setInterval(checkBackendConnectivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // Menu toggle handler
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Navigation handlers
  const handleShowProjects = () => {
    setShowProjectDashboard(true);
  };
  
  const handleNewProject = () => {
    setShowProjectDashboard(true);
  };

  // Common style variables
  const styles = {
    app: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    },
    topNav: {
      display: 'flex',
      backgroundColor: '#333',
      color: 'white',
      padding: '0',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      zIndex: 1000,
    },
    menuButton: {
      backgroundColor: '#FF5722',
      color: 'white',
      border: 'none',
      padding: '10px 15px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      height: '42px',
      fontWeight: 'bold'
    },
    brandTitle: {
      margin: 0,
      padding: '0 15px',
      fontSize: '1.2rem',
      fontWeight: 'bold'
    },
    navButtons: {
      display: 'flex',
      marginRight: '10px'
    },
    projectButton: {
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      margin: '5px',
      padding: '8px 15px',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      fontWeight: 'bold'
    },
    newProjectButton: {
      backgroundColor: '#2196F3',
      color: 'white',
      border: 'none',
      margin: '5px',
      padding: '8px 15px',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      fontWeight: 'bold'
    },
    mainContent: {
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden'
    },
    footer: {
      backgroundColor: '#f5f5f5',
      padding: '10px 20px',
      borderTop: '1px solid #ddd',
      fontSize: '0.8rem',
      color: '#666',
      textAlign: 'center'
    }
  };

  return (
    <div style={styles.app} className={isDarkMode ? 'dark-mode' : ''}>
      {/* Unified Menu Component - single source of truth for navigation */}
      <UnifiedMenu
        onShowProjects={handleShowProjects}
        onNewProject={handleNewProject}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onToggleUserProfile={() => setShowUserProfile(!showUserProfile)}
        onToggleChat={() => {
          console.log('Chat button clicked');
          setShowChatPanel(prev => !prev);
        }}
        isDarkMode={isDarkMode}
        username="User"
        apiStatus={{ status: backendStatus, isConnected }}
        isAdmin={false}
      />
      
      {/* Note: The legacy side menu has been removed. All navigation is now handled by UnifiedMenu */}
      
      
      {/* Connection test panel (collapsible) */}
      {showConnectionTest && (
        <div style={{ 
          padding: '10px',
          borderBottom: '1px solid #ddd',
          backgroundColor: isDarkMode ? '#333' : '#f9f9f9'
        }}>
          <ConnectionTest />
        </div>
      )}
      
      {/* Main content area */}
      <main style={styles.mainContent}>
        {errorMessage ? (
          <div style={{
            padding: '20px',
            margin: '20px',
            backgroundColor: isDarkMode ? '#3c2121' : '#ffeeee',
            border: `1px solid ${isDarkMode ? '#5a3434' : '#ffaaaa'}`,
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: isDarkMode ? '#ffaaaa' : '#cc0000'
          }}>
            <h2>Connection Error</h2>
            <p>{errorMessage}</p>
            <p>Troubleshooting steps:</p>
            <ol>
              <li>Make sure the backend server is running.</li>
              <li>Check if the backend is accessible at <code>http://localhost:8000/health</code>.</li>
              <li>Verify there are no firewall or network issues blocking the connection.</li>
              <li>Try restarting both frontend and backend servers.</li>
            </ol>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#cc0000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <ErrorBoundary>
            <CodeEditor />
          </ErrorBoundary>
        )}
      </main>
      
      {/* User Profile Panel (modal) */}
      {showUserProfile && (
        <div style={{
          position: 'fixed',
          top: '50px',
          right: '10px',
          width: '300px',
          backgroundColor: isDarkMode ? '#333' : '#fff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          borderRadius: '4px',
          zIndex: 1000,
          color: isDarkMode ? '#eee' : '#333'
        }}>
          <UserProfilePanel 
            onClose={() => setShowUserProfile(false)}
            onLogout={() => {
              console.log('User logged out');
              setShowUserProfile(false);
            }}
          />
        </div>
      )}
      
      {/* Project Dashboard (modal) */}
      {showProjectDashboard && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: '800px',
          height: '80%',
          maxHeight: '600px',
          backgroundColor: isDarkMode ? '#333' : '#fff',
          color: isDarkMode ? '#eee' : '#333',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          borderRadius: '4px',
          zIndex: 1000,
          overflow: 'auto'
        }}>
          <ProjectDashboard 
            onClose={() => setShowProjectDashboard(false)}
            onSelectProject={(project) => {
              console.log('Selected project:', project);
              setShowProjectDashboard(false);
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
      
      {/* Chat Panel */}
      {showChatPanel && (
        <div style={{
          position: 'fixed',
          bottom: '0',
          right: '20px',
          width: '350px',
          height: '500px',
          backgroundColor: isDarkMode ? '#333' : '#fff',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <ChatPanel
            codeIntegration={{
              insert: (code) => console.log('Insert code:', code),
              append: (code) => console.log('Append code:', code),
              execute: (code) => console.log('Execute code:', code)
            }}
            isDarkMode={isDarkMode}
            apiEndpoint={chatSettings.apiEndpoint}
            settings={chatSettings}
            onUpdateSettings={(newSettings) => {
              setChatSettings(prevSettings => ({...prevSettings, ...newSettings}));
            }}
          />
        </div>
      )}
      
      {/* Footer */}
      <footer style={{
        ...styles.footer,
        backgroundColor: isDarkMode ? '#222' : '#f5f5f5',
        color: isDarkMode ? '#999' : '#666',
        borderTop: `1px solid ${isDarkMode ? '#444' : '#ddd'}`
      }}>
        Coder AI Platform © {new Date().getFullYear()} | Local AI Coding Assistant
      </footer>
    </div>
  );
};

/**
 * Error boundary component to catch render errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          backgroundColor: '#ffeeee',
          border: '1px solid #ffaaaa',
          borderRadius: '4px',
        }}>
          <h2>Component Error</h2>
          <p>Something went wrong while rendering this component.</p>
          <details style={{ marginTop: '10px', cursor: 'pointer' }}>
            <summary>Error details</summary>
            <pre style={{ 
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#f8f8f8',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {this.state.error && (this.state.error.toString())}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              backgroundColor: '#cc0000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              marginTop: '15px'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default App;
