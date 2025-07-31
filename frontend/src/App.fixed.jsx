// /project-root/frontend/src/App.jsx
// Fixed version with syntax errors corrected
import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle
} from "react-resizable-panels";
import LanguageSelectorModal from './components/LanguageSelectorModal';
import { getLanguageFromFilename } from './api';
import CodeEditor from './Editor';
import Terminal from './Terminal';
import FileBrowser from './FileBrowser';
import ChatPanel from './ChatPanel';
import AgentConsensusPanel from './components/AgentConsensusPanel';
import MainMenu from './components/MainMenu';
import UserProfilePanel from './components/UserProfilePanel';
import ProjectDashboard from './components/ProjectDashboard';
import EmergencyMenu from './components/EmergencyMenu';
import AbsoluteMenu from './components/AbsoluteMenu';
import HamburgerTest from './components/HamburgerTest';
import SystemHealth from './SystemHealth';
import Login from './Login';
import TemplateSelector from './TemplateSelector';
import { 
  execute, 
  loadFiles, 
  loadFile, 
  saveFile, 
  checkHealth,
  isLoggedIn,
  logout,
  getUsername,
  verifyToken
} from './api';
import { getAgentConsensusApi } from './utils/agent-consensus-api';
import './App.css';
import './terminal-styles.css'; // Terminal component styles

// Adding a simple component that will always be visible
const SimpleMenuBar = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#333',
      color: 'white',
      padding: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 10000,
      borderBottom: '2px solid #FF5722'
    }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        Local AI Coding Platform
      </div>
      
      <div style={{
        display: 'flex',
        gap: '15px'
      }}>
        <button style={{
          background: 'transparent',
          border: '1px solid white',
          color: 'white',
          padding: '5px 10px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>
          Projects
        </button>
        
        <button style={{
          background: '#FF5722',
          border: 'none',
          color: 'white',
          padding: '5px 10px',
          cursor: 'pointer',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          New Project
        </button>
        
        <button style={{
          background: 'transparent',
          border: '1px solid white',
          color: 'white',
          padding: '5px 10px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>
          Menu
        </button>
        
        <button style={{
          background: 'transparent',
          border: '1px solid white',
          color: 'white',
          padding: '5px 10px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>
          Help
        </button>
      </div>
    </div>
  );
};

function App() {
  const [code, setCode] = useState('# Write your Python code here\n');
  const [output, setOutput] = useState('');
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    status: 'unknown',
    message: 'Checking API status...',
    agentConsensus: 'unknown'
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showProjectDashboard, setShowProjectDashboard] = useState(false);
  const [projectTemplate, setProjectTemplate] = useState(null);
  const [projectToLoad, setProjectToLoad] = useState(null);
  const [absoluteMenuVisible, setAbsoluteMenuVisible] = useState(true);
  const [emergencyMenuVisible, setEmergencyMenuVisible] = useState(true);
  const [hamburgerMenuVisible, setHamburgerMenuVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  
  const [userPreferences, setUserPreferences] = useState({
    fontSize: 14,
    tabSize: 2,
    lineNumbers: true,
    wordWrap: true,
    theme: isDarkMode ? 'vs-dark' : 'vs-light',
    keybindings: 'default',
    autoSave: true,
    minimap: true
  });
  
  // Used to integrate chat with code and agents
  const codeIntegration = {
    currentCode: code,
    currentFile: currentFile,
    currentOutput: output,
    setCode: setCode,
    runCode: () => handleRun(),
    saveCode: () => handleSave(),
    insertCode: (newCode) => {
      setCode(prevCode => {
        // Keep any existing code as comments
        if (prevCode.trim() && !prevCode.startsWith('#')) {
          return `# Previous code:\n${prevCode.split('\n').map(line => `# ${line}`).join('\n')}\n\n${newCode}`;
        }
        return newCode;
      });
    }
  };
  
  // Check backend API status on component mount
  useEffect(() => {
    // Function to check backend API status
    const checkBackendStatus = async () => {
      try {
        const healthStatus = await checkHealth();
        setApiStatus(prevStatus => ({
          ...prevStatus,
          status: healthStatus.status,
          message: healthStatus.message
        }));
      } catch (error) {
        setApiStatus(prevStatus => ({
          ...prevStatus,
          status: 'error',
          message: 'Cannot connect to backend API'
        }));
      }
      
      try {
        const agentApi = getAgentConsensusApi();
        const agentStatus = await agentApi.getStatus();
        setApiStatus(prevStatus => ({
          ...prevStatus,
          agentConsensus: agentStatus.available ? 'available' : 'unavailable'
        }));
      } catch (error) {
        setApiStatus(prevStatus => ({
          ...prevStatus,
          agentConsensus: 'error'
        }));
      }
    };
    
    checkBackendStatus();
  }, []);
  
  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const loggedIn = await isLoggedIn();
        if (loggedIn) {
          const user = await getUsername();
          setAuthenticated(true);
          setUsername(user.username);
          setIsAdmin(user.isAdmin || false);
        } else {
          setAuthenticated(false);
          setUsername('');
          setIsAdmin(false);
        }
      } catch (error) {
        setAuthenticated(false);
        setUsername('');
        setIsAdmin(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Function to fetch files
  const fetchFiles = async () => {
    try {
      const fileList = await loadFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Handle loading a file
  const handleLoad = async (filename) => {
    try {
      setLoading(true);
      const fileContent = await loadFile(filename);
      setCode(fileContent);
      setCurrentFile(filename);
      
      // Reset output when loading a new file
      setOutput('');
      
      // Infer language from filename
      const language = getLanguageFromFilename(filename);
      // Update editor language if needed
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle saving the current file
  const handleSave = async () => {
    if (!currentFile) {
      handleSaveAs();
      return;
    }
    
    try {
      setLoading(true);
      await saveFile(currentFile, code);
      
      // Refresh file list after saving
      fetchFiles();
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Save As operation
  const handleSaveAs = async () => {
    const filename = prompt('Enter filename:');
    if (!filename) return;
    
    try {
      setLoading(true);
      await saveFile(filename, code);
      setCurrentFile(filename);
      
      // Refresh file list after saving
      fetchFiles();
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle running the code
  const handleRun = async () => {
    try {
      setLoading(true);
      setOutput('Running code...');
      const result = await execute(code);
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const handleNewFile = () => {
    setShowLanguageSelector(true);
  };

  const handleLanguageSelected = (languageData) => {
    setCode(languageData.template || '');
    setCurrentFile(null);
    setOutput('');
    setShowLanguageSelector(false);
  };

  const handleCancelLanguageSelection = () => {
    setShowLanguageSelector(false);
  };

  const handleNewTemplate = () => {
    setShowProjectDashboard(true);
  };

  const handleProjectCreated = (project) => {
    // Handle the newly created project
    setProjectTemplate(null);
    setProjectToLoad(project);
    
    // Close the project dashboard
    setShowProjectDashboard(false);
    
    // Update files list
    fetchFiles();
    
    // If the project specifies a main file, load it
    if (project.mainFile) {
      handleLoad(project.mainFile);
    }
    
    // If authenticated, update user preferences
    if (authenticated) {
      // Update last project in user preferences
      // This would be implemented based on your backend
    }
  };

  const handleLogin = (username, isAdmin) => {
    setAuthenticated(true);
    setUsername(username);
    setIsAdmin(isAdmin);
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setUsername('');
    setIsAdmin(false);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    // Update user preferences for theme
    setUserPreferences(prev => ({
      ...prev,
      theme: newDarkMode ? 'vs-dark' : 'vs-light'
    }));
  };
  
  // Update user preferences
  const updateUserPreferences = (newPrefs) => {
    setUserPreferences(prev => ({
      ...prev,
      ...newPrefs
    }));
  };
  
  // Toggle functions for user profile and project dashboard with enhanced visibility control
  const toggleUserProfile = () => {
    setShowUserProfile(prev => {
      const newState = !prev;
      if (newState) {
        setShowProjectDashboard(false);
      }
      return newState;
    });
  };

  const toggleProjectDashboard = () => {
    setShowProjectDashboard(prev => {
      const newState = !prev;
      if (newState) {
        setShowUserProfile(false);
      }
      return newState;
    });
  };
  
  // Apply dark mode on initial render and when it changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);
  
  // Add global keyboard shortcuts for guaranteed navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+P: Show Projects Dashboard
      if (e.altKey && e.key === 'p') {
        setShowProjectDashboard(true);
      }
      // Alt+N: New Project
      else if (e.altKey && e.key === 'n') {
        handleNewTemplate();
      }
      // Alt+H: Open Help
      else if (e.altKey && e.key === 'h') {
        window.open('/direct-menu.html', '_blank');
      }
      // Alt+F: Open Framed App
      else if (e.altKey && e.key === 'f') {
        window.open('/framed-app.html', '_blank');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <>
      {/* ABSOLUTE MENU - guaranteed visibility regardless of CSS conflicts */}
      <AbsoluteMenu 
        onShowProjects={() => {
          setShowProjectDashboard(true);
          console.log('AbsoluteMenu Projects button clicked');
        }}
        onNewProject={() => {
          handleNewTemplate();
          console.log('AbsoluteMenu New Project button clicked');
        }}
        onShowMenu={() => {
          console.log('AbsoluteMenu Menu button clicked');
        }}
        onHelp={() => {
          console.log('AbsoluteMenu Help button clicked');
        }}
        visible={absoluteMenuVisible}
        toggleVisible={() => setAbsoluteMenuVisible(!absoluteMenuVisible)}
      />
      
      {/* EMERGENCY MENU COMPONENT */}
      <EmergencyMenu 
        visible={emergencyMenuVisible}
        toggleVisible={() => setEmergencyMenuVisible(!emergencyMenuVisible)}
        onShowProjects={() => {
          setShowProjectDashboard(true);
          console.log('Emergency Menu Projects button clicked');
        }}
        onNewProject={() => {
          handleNewTemplate();
          console.log('Emergency Menu New Project button clicked');
        }}
        onShowMenu={() => {
          console.log('Emergency Menu Menu button clicked');
        }}
        onHelp={() => {
          console.log('Emergency Menu Help button clicked');
        }}
      />
      
      {/* FLOATING ACTION MENU - IMPOSSIBLE TO MISS */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 99999
      }}>
        <button
          onClick={() => handleNewTemplate()}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FF5722',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="New Project"
        >
          +
        </button>
        
        <button
          onClick={() => setShowProjectDashboard(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Projects"
        >
          P
        </button>
        
        <button
          onClick={() => window.open('/direct-menu.html', '_blank')}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Direct Menu"
        >
          M
        </button>
      </div>
      
      {/* NEW ULTRA-VISIBLE NAVIGATION BAR */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#FF5722',
        color: 'white',
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 99999,
        borderBottom: '3px solid gold'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
          LOCAL AI CODING PLATFORM
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowProjectDashboard(true)}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: 'white', 
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Projects
          </button>
          <button 
            onClick={() => handleNewTemplate()}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: 'white', 
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            New Project
          </button>
          <button 
            onClick={() => window.open('/direct-menu.html', '_blank')}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: 'white', 
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Menu
          </button>
          <button 
            onClick={() => window.open('/framed-app.html', '_blank')}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: 'white', 
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Framed App
          </button>
        </div>
      </div>
      
      {/* Hamburger test component for visibility testing */}
      <HamburgerTest 
        visible={hamburgerMenuVisible}
        toggleVisible={() => setHamburgerMenuVisible(!hamburgerMenuVisible)}
        onShowProjects={() => {
          setShowProjectDashboard(true);
          console.log('Hamburger Menu Projects button clicked');
        }}
      />
      
      {/* System health modal */}
      {showSystemHealth && (
        <SystemHealth 
          apiStatus={apiStatus} 
          onClose={() => setShowSystemHealth(false)} 
        />
      )}
      
      {/* User Profile Panel with high z-index for visibility */}
      {showUserProfile && (
        <UserProfilePanel 
          username={username} 
          isAdmin={isAdmin} 
          onClose={() => setShowUserProfile(false)}
          darkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          preferences={userPreferences}
          updatePreferences={updateUserPreferences}
          onLogout={handleLogout}
          style={{ zIndex: 9999 }}
        />
      )}
      
      {/* Project Dashboard with high z-index for visibility */}
      {showProjectDashboard && (
        <ProjectDashboard 
          onClose={() => setShowProjectDashboard(false)}
          onProjectSelect={(project) => {
            setProjectToLoad(project);
            setShowProjectDashboard(false);
            fetchFiles();
            if (project.mainFile) {
              handleLoad(project.mainFile);
            }
          }}
          onProjectCreate={handleNewTemplate}
          authenticated={authenticated}
          username={username}
          apiStatus={apiStatus}
        />
      )}
      
      <div className="app-header" style={{position: 'relative', zIndex: 9100}}>
        <div className="app-header-left">
          {/* Make MainMenu extremely visible */}
          <div style={{position: 'relative', zIndex: 9500, display: 'block !important'}}>
            <MainMenu 
              onNewFile={handleNewFile}
              onOpenFile={() => {
                fetchFiles();
                document.getElementById('file-dialog').click();
              }}
              onSave={handleSave}
              onSaveAs={handleSaveAs}
              onRun={handleRun}
              darkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              onShowUserProfile={toggleUserProfile}
              onShowProjectDashboard={toggleProjectDashboard}
              onShowSystemHealth={() => setShowSystemHealth(true)}
              authenticated={authenticated}
              username={username}
              apiStatus={apiStatus}
            />
          </div>
          
          {currentFile && (
            <div className="current-file">
              {currentFile}
              {loading && <span className="loading-indicator">⟳</span>}
            </div>
          )}
        </div>
        
        <div className="app-header-right">
          {authenticated ? (
            <div className="user-info" onClick={toggleUserProfile}>
              <span>{username}</span>
              <span className={`user-role ${isAdmin ? 'admin' : 'user'}`}>{isAdmin ? 'Admin' : 'User'}</span>
            </div>
          ) : (
            <button className="login-button" onClick={() => { /* Show login modal */ }}>
              Login
            </button>
          )}
        </div>
      </div>
      
      <div className="app-container">
        <div className="app-content">
          {!authenticated ? (
            <Login onLogin={handleLogin} apiStatus={apiStatus} />
          ) : projectTemplate ? (
            <TemplateSelector 
              template={projectTemplate}
              onCreateProject={handleProjectCreated}
              onCancel={() => setProjectTemplate(null)}
            />
          ) : (
            <PanelGroup direction="horizontal">
              <Panel defaultSize={20} minSize={15} style={{ height: 'calc(100vh - 60px)' }}>
                <FileBrowser 
                  files={files} 
                  onSelectFile={handleLoad}
                  onRefresh={fetchFiles}
                />
              </Panel>
              
              <PanelResizeHandle className="panel-resize-handle" />
              
              <Panel defaultSize={80}>
                <PanelGroup direction="vertical">
                  <Panel defaultSize={70} minSize={40} style={{ height: '100%' }}>
                    <CodeEditor
                      code={code}
                      onChange={setCode}
                      language={currentFile ? getLanguageFromFilename(currentFile) : 'python'}
                      darkMode={isDarkMode}
                      preferences={userPreferences}
                      onError={(error) => {
                        console.error('Editor error:', error);
                      }}
                      onOffline={(queueLength) => {
                        console.log('Editor offline with queued changes:', queueLength);
                      }}
                      fallbackSettings={{
                        cacheResults: true,
                        useOfflineQueue: true,
                        retryFailedCalls: true,
                        maxRetries: 3,
                        retryDelay: 2000
                      }}
                    />
                  </Panel>
                  
                  <PanelResizeHandle className="panel-resize-handle" />
                  
                  <Panel defaultSize={30} style={{ height: '100%' }}>
                    <PanelGroup direction="horizontal">
                      <Panel className="output-panel">
                        <Terminal output={output} />
                      </Panel>
                      
                      <PanelResizeHandle className="panel-resize-handle" />
                      
                      <Panel className="chat-panel">
                        <ChatPanel codeIntegration={codeIntegration} />
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
