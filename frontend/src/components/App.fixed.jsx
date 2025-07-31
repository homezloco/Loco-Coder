import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import ConnectionTest from '../ConnectionTest';
import api from '../api';
import MainMenu from './MainMenu';
import UserProfilePanel from './UserProfilePanel';
import ProjectDashboard from './ProjectDashboard';

/**
 * Main App component with guaranteed menu visibility
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
  
  // Apply dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  // Create emergency menu if main menu doesn't exist
  useEffect(() => {
    const ensureMenuExists = () => {
      // Check if any menu element exists
      const menuElements = document.querySelectorAll('.menu-container, .side-menu, .guaranteed-menu');
      if (menuElements.length === 0) {
        console.log('No menu found, creating emergency fallback menu');
        createEmergencyMenu();
      }
    };

    // Create an emergency menu directly in the DOM
    const createEmergencyMenu = () => {
      const emergencyMenuContainer = document.createElement('div');
      emergencyMenuContainer.className = 'emergency-menu';
      emergencyMenuContainer.style.position = 'fixed';
      emergencyMenuContainer.style.top = '0';
      emergencyMenuContainer.style.left = '0';
      emergencyMenuContainer.style.backgroundColor = '#333';
      emergencyMenuContainer.style.color = '#fff';
      emergencyMenuContainer.style.padding = '10px';
      emergencyMenuContainer.style.zIndex = '10000';
      emergencyMenuContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      emergencyMenuContainer.style.width = '100%';

      // Create menu content
      emergencyMenuContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <button id="emergency-menu-toggle" style="background: #ff5722; color: white; border: none; padding: 5px 10px; cursor: pointer; margin-right: 10px;">≡ Menu</button>
            <span style="font-weight: bold;">Coder AI Platform</span>
          </div>
          <div>
            <button id="emergency-projects" style="background: #4caf50; color: white; border: none; padding: 5px 10px; cursor: pointer; margin-right: 5px;">📂 Projects</button>
            <button id="emergency-new-project" style="background: #2196f3; color: white; border: none; padding: 5px 10px; cursor: pointer;">✨ New Project</button>
          </div>
        </div>
      `;

      document.body.prepend(emergencyMenuContainer);

      // Add event listeners
      document.getElementById('emergency-projects').addEventListener('click', () => {
        window.location.href = '/projects.html';
      });
      
      document.getElementById('emergency-new-project').addEventListener('click', () => {
        window.location.href = '/new-project.html';
      });
      
      document.getElementById('emergency-menu-toggle').addEventListener('click', () => {
        const sideMenu = document.createElement('div');
        sideMenu.className = 'emergency-side-menu';
        sideMenu.style.position = 'fixed';
        sideMenu.style.top = '40px';
        sideMenu.style.left = '0';
        sideMenu.style.width = '250px';
        sideMenu.style.height = 'calc(100% - 40px)';
        sideMenu.style.backgroundColor = '#222';
        sideMenu.style.color = '#fff';
        sideMenu.style.padding = '10px';
        sideMenu.style.zIndex = '9999';
        sideMenu.style.boxShadow = '2px 0 5px rgba(0,0,0,0.3)';
        
        sideMenu.innerHTML = `
          <h3>Menu</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 10px 0;"><a href="/projects.html" style="color: #fff; text-decoration: none;">📂 Projects</a></li>
            <li style="padding: 10px 0;"><a href="/new-project.html" style="color: #fff; text-decoration: none;">✨ New Project</a></li>
            <li style="padding: 10px 0;"><a href="/settings.html" style="color: #fff; text-decoration: none;">⚙️ Settings</a></li>
            <li style="padding: 10px 0;"><a href="/help.html" style="color: #fff; text-decoration: none;">❓ Help</a></li>
          </ul>
          <button id="emergency-side-menu-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #fff; cursor: pointer;">✕</button>
        `;
        
        document.body.appendChild(sideMenu);
        
        document.getElementById('emergency-side-menu-close').addEventListener('click', () => {
          document.body.removeChild(sideMenu);
        });
      });
    };

    // Check immediately and periodically
    ensureMenuExists();
    const intervalId = setInterval(ensureMenuExists, 2000);
    
    return () => clearInterval(intervalId);
  }, []);
  
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
      // Alt+M: Toggle Menu
      else if (e.altKey && e.key === 'm') {
        setMenuOpen(!menuOpen);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUserProfile, showProjectDashboard, showConnectionTest, isDarkMode, menuOpen]);

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

  // Navigation handlers with direct fallbacks
  const handleShowProjects = () => {
    try {
      setShowProjectDashboard(true);
    } catch (error) {
      console.error('Failed to show projects dashboard:', error);
      window.location.href = '/projects.html'; // Direct HTML fallback
    }
  };
  
  const handleNewProject = () => {
    try {
      // First attempt React state-based approach
      setShowProjectDashboard(true);
      
      // Optional: Signal this is for a new project specifically
      localStorage.setItem('showNewProjectForm', 'true');
      
      console.log('New Project button clicked - opening project dashboard');
    } catch (error) {
      console.error('Failed to handle new project via React:', error);
      
      // Fallback: Direct navigation
      window.location.href = '/new-project.html';
    }
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
    },
    menuContainer: {
      position: 'fixed',
      top: '42px',
      left: 0,
      width: '250px',
      height: 'calc(100vh - 42px)',
      backgroundColor: '#222',
      boxShadow: '2px 0 5px rgba(0,0,0,0.2)',
      zIndex: 999,
      overflow: 'auto',
      transition: 'transform 0.3s ease'
    }
  };

  // Guaranteed visible menu component
  const GuaranteedMenu = () => {
    return (
      <div className="guaranteed-menu" style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        backgroundColor: '#333',
        color: '#fff',
        zIndex: 9999,
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={toggleMenu}
              style={{ 
                background: '#ff5722',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                marginRight: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold'
              }}
            >
              <span style={{ marginRight: '5px' }}>≡</span> Menu
            </button>
            <span style={{ fontWeight: 'bold' }}>Coder AI Platform</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginRight: '15px',
              backgroundColor: backendStatus === 'degraded' ? 'rgba(255, 193, 7, 0.2)' : 
                            isConnected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: backendStatus === 'degraded' ? '#FFC107' : 
                              isConnected ? '#4caf50' : '#f44336',
                marginRight: '5px'
              }}></div>
              <span>Backend: {backendStatus}</span>
              <button
                onClick={() => setShowConnectionTest(!showConnectionTest)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#aaa',
                  marginLeft: '5px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textDecoration: 'underline'
                }}
              >
                {showConnectionTest ? 'Hide' : 'Show'} Test
              </button>
            </div>
            <button 
              onClick={handleShowProjects}
              style={{ 
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                marginRight: '5px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold'
              }}
            >
              <span style={{ marginRight: '5px' }}>📂</span> Projects
            </button>
            <button 
              onClick={handleNewProject}
              style={{ 
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                marginRight: '5px'
              }}
            >
              <span style={{ marginRight: '5px' }}>✨</span> New Project
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                background: 'transparent',
                border: '1px solid #777',
                color: '#ccc',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app} className={isDarkMode ? 'dark-mode' : ''}>
      {/* Always visible guaranteed menu */}
      <GuaranteedMenu />
      
      {/* Regular top navigation - serves as backup */}
      <nav style={{ ...styles.topNav, marginTop: '42px' }}>
        {/* Left section: Menu button and title */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={toggleMenu} 
            style={styles.menuButton}
            aria-label="Toggle menu"
          >
            <span style={{ marginRight: '5px' }}>≡</span> Menu
          </button>
          <h1 style={styles.brandTitle}>Coder AI Platform</h1>
        </div>
        
        {/* Right section: Action buttons */}
        <div style={styles.navButtons}>
          <button 
            onClick={handleShowProjects}
            style={styles.projectButton}
            aria-label="Projects"
          >
            <span style={{ marginRight: '5px' }}>📂</span> Projects
          </button>
          
          <button 
            onClick={handleNewProject}
            style={styles.newProjectButton}
            aria-label="New Project"
          >
            <span style={{ marginRight: '5px' }}>✨</span> New Project
          </button>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              backgroundColor: 'transparent',
              color: '#bbbbbb',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              margin: '5px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          <button 
            onClick={() => setShowUserProfile(!showUserProfile)}
            style={{
              backgroundColor: 'transparent',
              color: '#bbbbbb',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              margin: '5px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            User Profile
          </button>
        </div>
      </nav>
      
      {/* Side Menu with sliding behavior */}
      <div style={{
        ...styles.menuContainer,
        transform: menuOpen ? 'translateX(0)' : 'translateX(-250px)'
      }} className="side-menu">
        <MainMenu 
          authenticated={true}
          username="User"
          isAdmin={false}
          onLogout={() => console.log('Logout')}
          onNewFile={() => console.log('New file')}
          onNewProject={handleNewProject}
          onSave={() => console.log('Save')}
          onSaveAs={() => console.log('Save as')}
          onToggleSystemHealth={() => {}}
          onToggleAgentConsensus={() => {}}
          isSystemHealthVisible={false}
          isAgentConsensusVisible={false}
          apiStatus={backendStatus}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          isDarkMode={isDarkMode}
          onToggleUserProfile={() => setShowUserProfile(!showUserProfile)}
          onToggleProjectDashboard={() => setShowProjectDashboard(!showProjectDashboard)}
        />
      </div>
      
      {/* Connection test panel (collapsible) */}
      {showConnectionTest && (
        <div style={{ 
          padding: '10px',
          marginTop: '42px',
          borderBottom: '1px solid #ddd',
          backgroundColor: isDarkMode ? '#333' : '#f9f9f9'
        }}>
          <ConnectionTest />
        </div>
      )}
      
      {/* Main content area */}
      <main style={{
        ...styles.mainContent,
        marginTop: showConnectionTest ? 0 : '42px'
      }}>
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
            showNewProjectForm={localStorage.getItem('showNewProjectForm') === 'true'}
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
