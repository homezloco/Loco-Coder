import React from 'react';
import PropTypes from 'prop-types';

/**
 * Breadcrumbs navigation component with robust visibility guarantees
 * Provides contextual navigation with multiple fallbacks for navigation history
 */
const Breadcrumbs = ({ 
  paths = [], 
  onNavigate,
  isDarkMode = false,
  className = ''
}) => {
  // Handle navigation with appropriate fallbacks
  const handleClick = (path, index) => {
    // Primary navigation handler
    if (onNavigate) {
      onNavigate(path, index);
      return;
    }
    
    // Fallback 1: If onNavigate not provided but path has a url, use direct navigation
    if (path.url) {
      try {
        window.history.pushState({}, '', path.url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        console.error('Navigation fallback 1 failed:', err);
        // Fallback 2: Simple location change as last resort
        try {
          window.location.href = path.url;
        } catch (innerErr) {
          console.error('Navigation fallback 2 failed:', innerErr);
        }
      }
    }
  };

  // If no paths provided, try to construct from location
  const effectivePaths = paths.length > 0 ? paths : (() => {
    try {
      // Attempt to create breadcrumbs from current path as fallback
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      return [
        { label: 'Home', url: '/' },
        ...pathSegments.map((segment, i) => ({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          url: '/' + pathSegments.slice(0, i + 1).join('/')
        }))
      ];
    } catch (err) {
      console.error('Failed to create fallback breadcrumbs:', err);
      return [{ label: 'Home', url: '/' }];
    }
  })();

  // Guarantee at least "Home" is present
  if (effectivePaths.length === 0) {
    effectivePaths.push({ label: 'Home', url: '/' });
  }

  // Styles with guaranteed visibility
  const baseStyles = {
    breadcrumbContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      padding: '8px 16px',
      margin: '0 0 16px 0',
      backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      fontSize: '14px',
      visibility: 'visible !important', // Guarantee visibility
      opacity: '1 !important',
      zIndex: 100,
    },
    breadcrumbItem: {
      display: 'inline-flex',
      alignItems: 'center',
      visibility: 'visible !important', // Guarantee visibility
      opacity: '1 !important',
    },
    breadcrumbLink: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textDecoration: 'none',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'all 0.2s',
      cursor: 'pointer',
      visibility: 'visible !important', // Guarantee visibility
      opacity: '1 !important',
      '&:hover': {
        backgroundColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
        color: isDarkMode ? '#e2e8f0' : '#1e293b',
      }
    },
    activeBreadcrumb: {
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontWeight: 600,
      cursor: 'default',
    },
    separator: {
      margin: '0 8px',
      color: isDarkMode ? '#475569' : '#94a3b8',
    }
  };

  return (
    <nav 
      aria-label="Breadcrumb" 
      style={baseStyles.breadcrumbContainer}
      className={`breadcrumb-nav ${className}`}
    >
      <ol style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        alignItems: 'center',
        listStyle: 'none', 
        margin: 0, 
        padding: 0 
      }}>
        {effectivePaths.map((path, index) => (
          <li key={path.label + index} style={baseStyles.breadcrumbItem}>
            {index > 0 && <span style={baseStyles.separator} aria-hidden="true">/</span>}
            {index === effectivePaths.length - 1 ? (
              <span 
                style={{
                  ...baseStyles.breadcrumbLink,
                  ...baseStyles.activeBreadcrumb
                }}
                aria-current="page"
              >
                {path.label}
              </span>
            ) : (
              <a
                style={baseStyles.breadcrumbLink}
                onClick={() => handleClick(path, index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(path, index);
                  }
                }}
                tabIndex={0}
                role="button"
              >
                {path.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

Breadcrumbs.propTypes = {
  paths: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      url: PropTypes.string
    })
  ),
  onNavigate: PropTypes.func,
  isDarkMode: PropTypes.bool,
  className: PropTypes.string
};

export default Breadcrumbs;
