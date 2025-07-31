import React, { useState, useEffect, useRef } from 'react';

// Key codes for keyboard navigation
const KEYS = {
  TAB: 'Tab',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  SPACE: ' ',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
};

/**
 * GuaranteedMenu component - This component is designed to always be visible
 * regardless of CSS conflicts, z-index issues, or React rendering problems
 */
const GuaranteedMenu = ({ 
  onShowProjects, 
  onNewProject, 
  onToggleDarkMode, 
  isDarkMode = false,
  username = '',
  toggleUserProfile,
  apiStatus = { status: 'unknown' }
}) => {
  // State for mobile menu and view
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.matchMedia('(max-width: 768px)').matches);
  
  // Create refs for focusable buttons
  const projectsButtonRef = useRef(null);
  const newProjectButtonRef = useRef(null);
  const darkModeButtonRef = useRef(null);
  const profileButtonRef = useRef(null);
  const hamburgerButtonRef = useRef(null);
  const mobileButtonRefs = useRef([]);
  
  // Focus trap for keyboard navigation
  const handleKeyDown = (event, index, buttons) => {
    switch (event.key) {
      case KEYS.ARROW_DOWN:
      case KEYS.ARROW_UP:
        event.preventDefault();
        const direction = event.key === KEYS.ARROW_DOWN ? 1 : -1;
        const nextIndex = (index + direction + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
        break;
      case KEYS.ESCAPE:
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          if (hamburgerButtonRef.current) {
            hamburgerButtonRef.current.focus();
          }
        }
        break;
      default:
        break;
    }
  };
  
  // Set up references for mobile menu buttons
  const setMobileMenuButtonRefs = (el, i) => {
    if (el && mobileButtonRefs.current) {
      mobileButtonRefs.current[i] = el;
    }
  };
  
  // Handle resize and keyboard events
  useEffect(() => {
    // Update mobile view state on resize
    const handleResize = () => {
      setIsMobileView(window.matchMedia('(max-width: 768px)').matches);
    };
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Focus management for keyboard accessibility
    if (mobileMenuOpen && mobileButtonRefs.current && mobileButtonRefs.current[0]) {
      setTimeout(() => {
        mobileButtonRefs.current[0].focus();
      }, 100);
    }
    
    // Setup global keyboard listener for accessibility
    const handleGlobalKeydown = (e) => {
      // Alt+M toggles mobile menu in mobile view
      if (e.altKey && e.key === 'm' && isMobileView) {
        e.preventDefault();
        setMobileMenuOpen(!mobileMenuOpen);
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Remove listeners on cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [mobileMenuOpen, isMobileView]);
  
  // Styles with dark mode support
  const menuStyle = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    backgroundColor: isDarkMode ? '#212121' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#333333',
    padding: '10px 15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: '999999',
    borderBottom: '1px solid ' + (isDarkMode ? '#444' : '#e0e0e0'),
    fontFamily: 'sans-serif',
    fontSize: '14px',
    height: '60px',
    boxSizing: 'border-box'
  };

  const logoStyle = {
    fontWeight: 'bold',
    fontSize: '18px',
    marginRight: '30px'
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  };

  const buttonStyle = {
    padding: '8px 15px',
    backgroundColor: isDarkMode ? '#444' : '#f0f0f0',
    color: isDarkMode ? '#fff' : '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  };

  const accentButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FF5722',
    color: '#fff',
    fontWeight: 'bold'
  };

  const iconButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    color: isDarkMode ? '#fff' : '#333'
  };

  const profileButtonStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: isDarkMode ? '#666' : '#e0e0e0',
    color: isDarkMode ? '#fff' : '#333',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const statusIndicatorStyle = {
    marginRight: '15px',
    color: apiStatus.status === 'connected' ? '#4caf50' : '#ff9800',
    fontSize: '14px'
  };

  // Mobile menu styles
  const mobileMenuStyle = {
    position: 'absolute',
    top: '60px',
    left: '0',
    width: '100%',
    backgroundColor: isDarkMode ? '#212121' : '#ffffff',
    padding: '15px',
    display: mobileMenuOpen ? 'flex' : 'none',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    zIndex: '999998'
  };

  return (
    <div id="guaranteed-menu" style={menuStyle}>
      {/* Logo and branding */}
      <div style={logoStyle}>Coder AI Platform</div>
      
      {/* Desktop navigation buttons - only visible on desktop */}
      {!isMobileView && (
        <div style={buttonContainerStyle} role="navigation" aria-label="Main navigation">
          <button
            ref={projectsButtonRef}
            onClick={onShowProjects}
            onKeyDown={(e) => handleKeyDown(e, 0, [projectsButtonRef.current, newProjectButtonRef.current, darkModeButtonRef.current, profileButtonRef.current])}
            style={buttonStyle}
            aria-label="Show Projects Dashboard">
            <span aria-hidden="true">📂</span> Projects
          </button>
          
          <button
            ref={newProjectButtonRef}
            onClick={onNewProject}
            onKeyDown={(e) => handleKeyDown(e, 1, [projectsButtonRef.current, newProjectButtonRef.current, darkModeButtonRef.current, profileButtonRef.current])}
            style={accentButtonStyle}
            aria-label="Create New Project">
            <span aria-hidden="true">✨</span> New Project
          </button>
        </div>
      )}
      
      {/* Mobile hamburger button - only visible on mobile */}
      {isMobileView && (
        <button 
          ref={hamburgerButtonRef}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: mobileMenuOpen ? (isDarkMode ? '#444' : '#e0e0e0') : 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            cursor: 'pointer'
          }}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-haspopup="true">
          <span style={{
            display: 'block',
            width: '24px',
            height: '2px',
            marginBottom: '5px',
            background: isDarkMode ? '#fff' : '#333',
            transition: 'transform 0.3s, opacity 0.3s',
            transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
          }}></span>
          <span style={{
            display: 'block',
            width: '24px',
            height: '2px',
            marginBottom: '5px',
            background: isDarkMode ? '#fff' : '#333',
            transition: 'opacity 0.3s',
            opacity: mobileMenuOpen ? 0 : 1
          }}></span>
          <span style={{
            display: 'block',
            width: '24px',
            height: '2px',
            background: isDarkMode ? '#fff' : '#333',
            transition: 'transform 0.3s',
            transform: mobileMenuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none'
          }}></span>
        </button>
      )}
      
      {/* Spacer */}
      <div style={{ flexGrow: 1 }}></div>
      
      {/* Right-side controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        {/* API status indicator - hide on small mobile */}
        <div style={{
          ...statusIndicatorStyle,
          display: window.innerWidth < 480 ? 'none' : 'block'
        }}>
          {apiStatus?.status === 'connected' ? 'Online' : 'Offline (using fallbacks)'}
        </div>
        
        {/* Dark mode toggle */}
        <button
          ref={darkModeButtonRef}
          onClick={onToggleDarkMode}
          onKeyDown={(e) => handleKeyDown(e, 2, [projectsButtonRef.current, newProjectButtonRef.current, darkModeButtonRef.current, profileButtonRef.current])}
          style={iconButtonStyle}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          <span aria-hidden="true">{isDarkMode ? '🌙' : '☀️'}</span>
        </button>
        
        {/* User profile button */}
        <button
          ref={profileButtonRef}
          onClick={toggleUserProfile}
          onKeyDown={(e) => handleKeyDown(e, 3, [projectsButtonRef.current, newProjectButtonRef.current, darkModeButtonRef.current, profileButtonRef.current])}
          style={profileButtonStyle}
          aria-label="User profile">
          <span aria-hidden="true">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
        </button>
      </div>
      
      {/* Mobile menu - rendered OUTSIDE the main menu container to prevent nesting */}
      {isMobileView && mobileMenuOpen && (
        <div 
          id="mobile-menu"
          style={mobileMenuStyle}
          role="menu"
          aria-label="Mobile navigation menu">
          <button
            ref={(el) => setMobileMenuButtonRefs(el, 0)}
            onClick={() => {
              onShowProjects();
              setMobileMenuOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, 0, mobileButtonRefs.current || [])}
            style={{...buttonStyle, width: '100%', justifyContent: 'center'}}>
            <span aria-hidden="true">📂</span> Projects
          </button>
          
          <button
            ref={(el) => setMobileMenuButtonRefs(el, 1)}
            onClick={() => {
              onNewProject();
              setMobileMenuOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, 1, mobileButtonRefs.current || [])}
            style={{...accentButtonStyle, width: '100%', justifyContent: 'center'}}>
            <span aria-hidden="true">✨</span> New Project
          </button>
          
          <div style={{height: '1px', background: isDarkMode ? '#444' : '#e0e0e0', margin: '10px 0'}}></div>
          
          {/* Dark mode toggle in mobile menu */}
          <button
            ref={(el) => setMobileMenuButtonRefs(el, 2)}
            onClick={() => {
              onToggleDarkMode();
              setMobileMenuOpen(false);
            }}
            onKeyDown={(e) => handleKeyDown(e, 2, mobileButtonRefs.current || [])}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '12px',
              marginTop: '5px',
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              color: isDarkMode ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            aria-label={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}>
            <span style={{marginRight: '8px'}} aria-hidden="true">{isDarkMode ? '🌙' : '☀️'}</span>
            Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      )}
    </div>
  );
};

export default GuaranteedMenu;
