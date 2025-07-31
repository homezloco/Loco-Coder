import React, { useState, useEffect, useRef } from 'react';

/**
 * UnifiedMenu - A responsive navigation menu component with mobile support
 */
const UnifiedMenu = ({
  onShowProjects,
  onNewProject,
  onToggleDarkMode,
  onToggleUserProfile,
  onToggleChat,
  onToggleSettings,
  isDarkMode = false,
  username = '',
  isAdmin = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const mobileMenuRefs = useRef([]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation for mobile menu
  const handleKeyDown = (e, index) => {
    if (!mobileMenuOpen) return;
    
    const lastIndex = menuItems.length - 1;
    let nextIndex;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = index === lastIndex ? 0 : index + 1;
        mobileMenuRefs.current[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = index === 0 ? lastIndex : index - 1;
        mobileMenuRefs.current[nextIndex]?.focus();
        break;
      case 'Escape':
        setMobileMenuOpen(false);
        break;
      default:
        break;
    }
  };

  // Menu items configuration
  const menuItems = [
    { id: 'projects', label: 'Projects', icon: '📂', onClick: onShowProjects, show: true },
    { id: 'newProject', label: 'New Project', icon: '➕', onClick: onNewProject, show: true },
    { 
      id: 'darkMode', 
      label: isDarkMode ? 'Light Mode' : 'Dark Mode', 
      icon: isDarkMode ? '☀️' : '🌙', 
      onClick: onToggleDarkMode, 
      show: true 
    },
    { id: 'chat', label: 'Chat', icon: '💬', onClick: onToggleChat, show: true },
    { id: 'settings', label: 'Settings', icon: '⚙️', onClick: onToggleSettings, show: true },
    { 
      id: 'profile', 
      label: username || 'Profile', 
      icon: username ? username.charAt(0).toUpperCase() : '👤', 
      onClick: onToggleUserProfile, 
      show: true 
    },
    { 
      id: 'admin', 
      label: 'Admin', 
      icon: '🔒', 
      onClick: () => console.log('Admin panel clicked'), 
      show: isAdmin 
    }
  ].filter(item => item.show);

  // Base styles
  const styles = {
    menuContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
      borderBottom: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    branding: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: 'bold',
      fontSize: '1.1rem',
      color: isDarkMode ? '#ffffff' : '#333333',
      textDecoration: 'none'
    },
    nav: {
      display: isMobileView ? 'none' : 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    navButton: {
      background: 'none',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.95rem',
      color: isDarkMode ? '#ffffff' : '#333333',
      transition: 'background-color 0.2s',
      ':hover': {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      },
      ':focus': {
        outline: `2px solid ${isDarkMode ? '#90caf9' : '#2196f3'}`,
        outlineOffset: '2px',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      }
    },
    mobileMenuButton: {
      display: isMobileView ? 'block' : 'none',
      background: 'none',
      border: 'none',
      color: isDarkMode ? '#ffffff' : '#333333',
      fontSize: '1.5rem',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '4px',
      ':hover': {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      },
      ':focus': {
        outline: `2px solid ${isDarkMode ? '#90caf9' : '#2196f3'}`,
        outlineOffset: '2px'
      }
    },
    mobileMenu: {
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      backgroundColor: isDarkMode ? '#252526' : '#ffffff',
      borderBottom: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
      padding: '16px',
      display: mobileMenuOpen ? 'flex' : 'none',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    mobileMenuItem: {
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'none',
      border: 'none',
      width: '100%',
      textAlign: 'left',
      fontSize: '1rem',
      color: isDarkMode ? '#ffffff' : '#333333',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      ':hover': {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      },
      ':focus': {
        outline: `2px solid ${isDarkMode ? '#90caf9' : '#2196f3'}`,
        outlineOffset: '2px',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      }
    },
    icon: {
      width: '20px',
      textAlign: 'center'
    }
  };

  // Apply hamburger line styles for animation
  const applyHamburgerStyle = (index) => ({
    width: '24px',
    height: '2px',
    backgroundColor: isDarkMode ? '#ffffff' : '#333333',
    margin: '4px 0',
    transition: 'all 0.3s ease',
    ...(mobileMenuOpen && index === 0 && {
      transform: 'rotate(-45deg) translate(-5px, 6px)'
    }),
    ...(mobileMenuOpen && index === 1 && {
      opacity: 0
    }),
    ...(mobileMenuOpen && index === 2 && {
      transform: 'rotate(45deg) translate(-5px, -6px)'
    })
  });

  return (
    <header 
      ref={menuRef}
      style={styles.menuContainer}
      role="banner"
      aria-label="Main navigation"
    >
      {/* Branding */}
      <a href="/" style={styles.branding}>
        <span role="img" aria-label="App Logo">🚀</span>
        <span>WindSurf</span>
      </a>

      {/* Desktop Navigation */}
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            style={styles.navButton}
            aria-label={item.label}
          >
            <span role="img" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <button
        ref={hamburgerRef}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={styles.mobileMenuButton}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-menu"
      >
        {[0, 1, 2].map((index) => (
          <div key={index} style={applyHamburgerStyle(index)} />
        ))}
      </button>

      {/* Mobile Menu */}
      <div 
        id="mobile-menu"
        style={styles.mobileMenu}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="mobile-menu-button"
      >
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            ref={el => mobileMenuRefs.current[index] = el}
            onClick={() => {
              item.onClick();
              setMobileMenuOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={styles.mobileMenuItem}
            role="menuitem"
            tabIndex={mobileMenuOpen ? 0 : -1}
          >
            <span role="img" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};

export default UnifiedMenu;
