import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { MobileMenu, DesktopMenu, HamburgerButton } from './menu';
import { useAuth } from "@/contexts/NewAuthContext";
import { useApi } from '@/contexts/NewApiContext';
import './UnifiedMenu.css';

/**
 * UnifiedMenu - A responsive navigation menu component with mobile support
 */
// Default no-op function for event handlers
const noop = () => {};

const UnifiedMenu = ({
  onShowProjects = noop,
  onNewProject = noop,
  onToggleDarkMode = noop,
  onToggleUserProfile = noop,
  onToggleChat = noop,
  onToggleSettings = noop,
  isDarkMode = false,
  username = '',
  isAdmin = false,
  onLogin = noop,
  onLogout = noop,
}) => {
  const { currentUser, logout } = useAuth();
  const { clearAuthToken } = useApi();
  const [isAuthenticated, setIsAuthenticated] = useState(!!currentUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  
  const menuRef = useRef(null);
  const menuItemRefs = useRef([]);
  const hamburgerRef = useRef(null);

  // Handle window resize
  const handleResize = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    setIsMobileView(isMobile);
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

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

  // Handle logout
  const handleLogout = async () => {
    try {
      setError('');
      setIsLoggingOut(true);
      
      // Clear auth token from API context
      if (typeof clearAuthToken === 'function') {
        await clearAuthToken();
      }
      
      // Call the auth context logout
      await logout();
      
      // Notify parent component
      onLogout();
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
      setError('Failed to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle login
  const handleLogin = () => {
    onLogin();
    navigate('/login');
  };

  // Menu items configuration
  const menuItems = useMemo(() => {
    const items = [
      { 
        id: 'projects', 
        label: 'Projects', 
        icon: '📂', 
        onClick: onShowProjects, 
        show: isAuthenticated 
      },
      { 
        id: 'terminal', 
        label: 'Terminal', 
        icon: '💻', 
        onClick: () => navigate('/terminal'), 
        show: isAuthenticated 
      },
      { 
        id: 'chatMode', 
        label: 'Chat', 
        icon: '💬', 
        onClick: () => navigate('/chat'), 
        show: isAuthenticated 
      },
      { 
        id: 'writeMode', 
        label: 'Write', 
        icon: '✍️', 
        onClick: () => navigate('/write'), 
        show: isAuthenticated 
      },
      { 
        id: 'newProject', 
        label: 'New Project', 
        icon: '➕', 
        onClick: onNewProject, 
        show: isAuthenticated 
      },
      { 
        id: 'darkMode', 
        label: isDarkMode ? 'Light Mode' : 'Dark Mode', 
        icon: isDarkMode ? '☀️' : '🌙', 
        onClick: onToggleDarkMode, 
        show: true 
      },
      { 
        id: 'settings', 
        label: 'Settings', 
        icon: '⚙️', 
        onClick: () => navigate('/settings'), 
        show: isAuthenticated 
      },
      { 
        id: 'profile', 
        label: username || 'Profile', 
        icon: username ? username.charAt(0).toUpperCase() : '👤', 
        onClick: onToggleUserProfile, 
        show: isAuthenticated 
      },
      { 
        id: 'login', 
        label: 'Login', 
        icon: '🔑', 
        onClick: handleLogin, 
        show: !isAuthenticated 
      },
      { 
        id: 'logout', 
        label: isLoggingOut ? 'Logging out...' : 'Logout', 
        icon: isLoggingOut ? '⏳' : '🚪', 
        onClick: handleLogout, 
        show: isAuthenticated && !isLoggingOut,
        disabled: isLoggingOut
      },
      { 
        id: 'admin', 
        label: 'Admin', 
        icon: '🔒', 
        onClick: () => navigate('/admin'), 
        show: isAuthenticated && isAdmin 
      }
    ];

    return items.filter(item => item.show);
  }, [
    isAuthenticated, 
    isDarkMode, 
    username, 
    isAdmin, 
    isLoggingOut,
    onShowProjects, 
    onNewProject, 
    onToggleDarkMode, 
    onToggleUserProfile,
    onToggleChat,
    navigate,
    handleLogin,
    handleLogout
  ]);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  // Handle menu item click
  const handleItemClick = useCallback(() => {
    if (isMobileView) {
      setMobileMenuOpen(false);
    }
  }, [isMobileView]);

  return (
    <div className="unified-menu" ref={menuRef}>
      <div className="menu-container">
        {/* Branding */}
        <a href="/" className="branding">
          <span role="img" aria-label="App Logo">🚀</span>
          <span>WindSurf</span>
        </a>

        {/* Mobile menu button */}
        <HamburgerButton 
          isOpen={mobileMenuOpen}
          onClick={toggleMobileMenu}
          ref={hamburgerRef}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Menu content */}
      {isMobileView ? (
        <MobileMenu 
          isOpen={mobileMenuOpen}
          items={menuItems}
          onItemClick={handleItemClick}
          itemRefs={menuItemRefs}
        />
      ) : (
        <DesktopMenu 
          items={menuItems}
          itemRefs={menuItemRefs}
        />
      )}
      
      {/* Error message */}
      {error && (
        <div className="menu-error">
          {error}
          <button 
            onClick={() => setError('')} 
            className="close-error"
            aria-label="Close error message"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

UnifiedMenu.propTypes = {
  onShowProjects: PropTypes.func,
  onNewProject: PropTypes.func,
  onToggleDarkMode: PropTypes.func,
  onToggleUserProfile: PropTypes.func,
  onToggleChat: PropTypes.func,
  onToggleSettings: PropTypes.func,
  onLogin: PropTypes.func,
  onLogout: PropTypes.func,
  isDarkMode: PropTypes.bool,
  username: PropTypes.string,
  isAdmin: PropTypes.bool
};

export default React.memo(UnifiedMenu);
