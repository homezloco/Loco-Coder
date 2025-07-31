import React, { useState, useEffect, useRef } from 'react';
import { useTheme, createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1e1e1e',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#a0aec0',
    },
  },
});

const MainMenu = ({ onToggleSidebar }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const menuItems = [
    { id: 'default', label: 'Default Layout' },
    { id: 'code', label: 'Code Focused' },
    { id: 'split', label: 'Split View' },
  ];

  const styles = {
    container: {
      position: 'relative',
      zIndex: 1000,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e293b' : '#1e1e1e',
      color: isDarkMode ? '#e2e8f0' : 'white',
      padding: '0.5rem 1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    menuButton: {
      background: 'none',
      border: 'none',
      color: isDarkMode ? '#e2e8f0' : 'white',
      fontSize: '1.5rem',
      cursor: 'pointer',
      padding: '0.5rem',
      borderRadius: '4px',
    },
    title: {
      margin: 0,
      flexGrow: 1,
      fontSize: '1.2rem',
      padding: '0 1rem',
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      backgroundColor: isDarkMode ? '#1e293b' : 'white',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '200px',
      zIndex: 1001,
    },
    menuSection: {
      padding: '0.5rem 0',
      borderBottom: `1px solid ${isDarkMode ? '#334155' : '#eee'}`,
    },
    menuItem: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '0.75rem 1rem',
      background: 'none',
      border: 'none',
      color: isDarkMode ? '#e2e8f0' : '#333',
      cursor: 'pointer',
      fontSize: '0.95rem',
    },
  };

  const menuStyles = {
    menuHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 16px',
      borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
      marginBottom: '10px',
    },
    menuHeaderTitle: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 600,
    },
    closeMenuButton: {
      background: 'none',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      color: isDarkMode ? '#a0aec0' : '#718096',
      padding: '0 5px',
    },
    closeMenuButtonHover: {
      color: isDarkMode ? '#fff' : '#2d3748',
    },
    menuSection: {
      marginBottom: '10px',
    },
    sectionHeader: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 500,
      color: isDarkMode ? '#a0aec0' : '#4a5568',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: '0 4px 4px 0',
      marginRight: '2px',
    },
    sectionHeaderHover: {
      background: isDarkMode ? '#2d3748' : '#f7fafc',
    },
    sectionContent: {
      padding: '5px 0',
    },
    menuItem: {
      padding: '8px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: '0 4px 4px 0',
      marginRight: '2px',
    },
  };

  const cssStyles = `
    .toggle-switch {
      width: 40px;
      height: 20px;
      background: ${isDarkMode ? '#4a5568' : '#cbd5e1'};
      border-radius: 10px;
      position: relative;
      cursor: pointer;
    }
    
    .switch {
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: ${isDarkMode ? '22px' : '2px'};
      transition: left 0.2s ease;
    }
    
    .user-info-section {
      padding: 12px 16px;
      border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
      margin-top: 10px;
      display: flex;
      flex-direction: column;
    }
    
    .username-display {
      margin-bottom: 8px;
      font-size: 14px;
      color: ${isDarkMode ? '#a0aec0' : '#4a5568'};
    }
    
    .logout-button {
      background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s ease;
    }
    
    .logout-button:hover {
      background: ${isDarkMode ? '#5a24b5' : '#4c51bf'};
    }
    
    .login-prompt {
      padding: 12px 16px;
      border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .login-prompt span {
      margin-bottom: 8px;
      font-size: 14px;
      color: ${isDarkMode ? '#a0aec0' : '#4a5568'};
    }
    
    .login-prompt button {
      background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s ease;
    }
    
    .login-prompt button:hover {
      background: ${isDarkMode ? '#5a24b5' : '#4c51bf'};
    }
    
    .api-status-indicator {
      padding: 8px 16px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      font-size: 14px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
    }
    
    .api-status-indicator.online .status-dot {
      background: #48bb78;
    }
    
    .api-status-indicator.warning .status-dot {
      background: #f6ad55;
    }
    
    .api-status-indicator.error .status-dot {
      background: #f56565;
    }
    
    .api-status-indicator.unknown .status-dot {
      background: #a0aec0;
    }
    
    .sidebar-toggle-button {
      background: none;
      border: none;
      cursor: pointer;
      width: 40px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 8px;
      padding: 8px;
      transition: background 0.2s ease;
      margin-left: 10px;
    }
    
    .sidebar-toggle-button:hover {
      background: ${isDarkMode ? '#334155' : '#e2e8f0'};
    }
    
    .sidebar-toggle-button.collapsed .sidebar-toggle-icon {
      transform: rotate(180deg);
    }
    
    .sidebar-toggle-icon {
      transition: transform 0.3s ease;
      font-size: 20px;
    }
  `;

  // Listen for click events from our floating action menu button
  useEffect(() => {
    const handleCustomMenuOpen = (event) => {
      if (event.detail?.source === 'floating-menu') {
        setMenuOpen(true);
      }
    };

    window.addEventListener('custom-menu-open', handleCustomMenuOpen);
    return () => {
      window.removeEventListener('custom-menu-open', handleCustomMenuOpen);
    };
  }, []);

  // Create and apply dynamic styles
  useEffect(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
      .menu-item span {
        font-size: 12px;
        color: ${isDarkMode ? '#718096' : '#a0aec0'};
      }
      
      .dark-mode-toggle {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
        margin-top: 10px;
      }
      
      .toggle-switch {
        width: 40px;
        height: 20px;
        background: ${isDarkMode ? '#4a5568' : '#cbd5e1'};
        border-radius: 10px;
        position: relative;
        cursor: pointer;
      }
      
      .switch {
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: ${isDarkMode ? '22px' : '2px'};
        transition: left 0.2s ease;
      }
      
      .user-info-section {
        padding: 12px 16px;
        border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
        margin-top: 10px;
        display: flex;
        flex-direction: column;
      }
      
      .username-display {
        margin-bottom: 8px;
        font-size: 14px;
        color: ${isDarkMode ? '#a0aec0' : '#4a5568'};
      }
      
      .logout-button {
        background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s ease;
      }
      
      .logout-button:hover {
        background: ${isDarkMode ? '#5a24b5' : '#4c51bf'};
      }
      
      .login-prompt {
        padding: 12px 16px;
        border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .login-prompt span {
        margin-bottom: 8px;
        font-size: 14px;
        color: ${isDarkMode ? '#a0aec0' : '#4a5568'};
      }
      
      .login-prompt button {
        background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s ease;
      }
      
      .login-prompt button:hover {
        background: ${isDarkMode ? '#5a24b5' : '#4c51bf'};
      }
      
      .api-status-indicator {
        padding: 8px 16px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [isDarkMode]);

  // Remove excessive console logging to reduce noise
  // Only log significant state changes
  useEffect(() => {
    if (menuOpen) {
      console.log('MainMenu opened with state:', { authenticated, username, apiStatus });
    }
  }, [menuOpen]);

  // Handle custom menu open events
  useEffect(() => {
    const handleCustomMenuOpen = (event) => {
      if (event.detail?.source === 'floating-menu') {
        setMenuOpen(true);
      }
    };

    window.addEventListener('custom-menu-open', handleCustomMenuOpen);
    return () => {
      window.removeEventListener('custom-menu-open', handleCustomMenuOpen);
    };
  }, []);

  // Create and apply dynamic styles
  useEffect(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
      .toggle-switch {
        width: 40px;
        height: 20px;
        background: ${isDarkMode ? '#4a5568' : '#cbd5e1'};
        border-radius: 10px;
        position: relative;
        cursor: pointer;
      }
      
      .switch {
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: ${isDarkMode ? '22px' : '2px'};
        transition: left 0.2s ease;
      }
      
      .user-info-section {
        padding: 12px 16px;
        border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
        margin-top: 10px;
        display: flex;
        flex-direction: column;
      }
      
      .username-display {
        margin-bottom: 8px;
        font-size: 14px;
        color: ${isDarkMode ? '#a0aec0' : '#4a5568'};
      }
      
      .logout-button {
        background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s ease;
      }
      
      .logout-button:hover {
        background: ${isDarkMode ? '#5a24b5' : '#4c51bf'};
      }
      
      .login-prompt {
        padding: 12px 16px;
        border-top: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .login-prompt span {
        margin-bottom: 8px;
        font-size: 14px;
        color: ${isDarkMode ? '#a0aec0' : '#4a5568'};
      }
      
      .login-prompt button {
        background: ${isDarkMode ? '#4c1d95' : '#5a67d8'};
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s ease;
      }
      
      .login-prompt button:hover {
        background: ${isDarkMode ? '#5a24b5' : '#4c51bf'};
      }
      
      .api-status-indicator {
        padding: 8px 16px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
      }
      
      .api-status-indicator.online .status-dot {
        background: #48bb78;
      }
      
      .api-status-indicator.warning .status-dot {
        background: #f6ad55;
      }
      
      .api-status-indicator.error .status-dot {
        background: #f56565;
      }
      
      .api-status-indicator.unknown .status-dot {
        background: #a0aec0;
      }
      
      .sidebar-toggle-button {
        background: none;
        border: none;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 8px;
        padding: 8px;
        transition: background 0.2s ease;
        margin-left: 10px;
      }
      
      .sidebar-toggle-button:hover {
        background: ${isDarkMode ? '#334155' : '#e2e8f0'};
      }
      
      .sidebar-toggle-button.collapsed .sidebar-toggle-icon {
        transform: rotate(180deg);
      }
      
      .sidebar-toggle-icon {
        transition: transform 0.3s ease;
        font-size: 20px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [isDarkMode]);

  // Remove excessive console logging to reduce noise
  // Only log significant state changes
  useEffect(() => {
    if (menuOpen) {
      console.log('MainMenu opened with state:', { authenticated, username, apiStatus });
    }
  }, [menuOpen]);

  // Apply super visible styles with even stronger visibility
  const forcedVisibleStyles = {
    position: 'relative',
    display: 'block !important',
    visibility: 'visible !important',
    opacity: '1 !important',
    zIndex: 9999,
    backgroundColor: '#FF5722',
    border: '3px solid #FFD700',
    boxShadow: '0 0 15px #FFD700, 0 0 20px rgba(255, 215, 0, 0.5)',
    width: '45px',
    height: '45px',
    margin: '5px 15px 5px 0',
    padding: '8px 6px',
    borderRadius: '8px',
    transform: 'scale(1.15)',
    animation: 'pulse 2s infinite'
  };
  
  // Listen for click events from our floating action menu button
  useEffect(() => {
    const handleCustomMenuOpen = (event) => {
      if (event.detail?.source === 'floating-menu') {
        setMenuOpen(true);
        console.log('MainMenu opened via floating action button');
      }
    };
    
    document.addEventListener('customOpenMainMenu', handleCustomMenuOpen);
    
    return () => {
      document.removeEventListener('customOpenMainMenu', handleCustomMenuOpen);
    };
  }, []);

  return (
    <div style={styles.container} ref={menuRef}>
      <div style={styles.header}>
        <button 
          style={styles.menuButton}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <h1 style={styles.title}>Coder AI Platform</h1>
        <button 
          style={styles.menuButton}
          onClick={() => {}}
          aria-label="Toggle theme"
        >
          🌙
        </button>
      </div>
      
      {menuOpen && (
        <div style={styles.dropdown}>
          <div style={styles.menuSection}>
            <h3 style={{margin: '0 0 0.5rem 0', padding: '0 1rem', fontSize: '0.9rem', color: '#666'}}>Layout Presets</h3>
            {menuItems.map((item) => (
              <button
                key={item.id}
                style={styles.menuItem}
                onClick={() => {
                  if (onToggleSidebar) onToggleSidebar();
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="menu-content">
            {renderSection('File', fileItems)}
            {renderSection('View', viewItems)}
            {renderSection('Layout', layoutItems)}
            {isAdmin && renderSection('Administration', adminItems)}
            {apiStatus.status === 'error' && renderSection('Fallbacks', fallbackItems)}
          </div>

          <div className="menu-footer">
            <div className="api-status">
              <div className={`status-indicator ${apiStatus.status}`}>
                <div className="status-dot"></div>
              </div>
              <div className="status-label">
                {apiStatus.status === 'online' ? 'API Connected' : 
                 apiStatus.status === 'degraded' ? 'Limited Connectivity' : 
                 'Offline - Using Fallbacks'}
              </div>
            </div>
            <div className="version-info">v1.2.0</div>
          </div>
        </div>
      )}
      <button 
        className={`sidebar-toggle-button ${isSidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => {
          if (onToggleSidebar) {
            onToggleSidebar();
          }
        }}
        aria-label="Toggle sidebar"
      >
        <span className="sidebar-toggle-icon">📚</span>
      </button>
    </div>
  );
};

export default MainMenu;
