import React, { useState } from 'react';
import { FiPlus, FiSearch, FiFolderPlus } from 'react-icons/fi';

/**
 * Enhanced empty state component with modern, engaging design
 * @param {Function} onCreateProject - Handler for creating a new project
 * @param {boolean} isDarkMode - Current theme mode
 * @param {string} searchQuery - Current search query if being filtered
 */
const EmptyState = ({ onCreateProject, isDarkMode, searchQuery = '' }) => {
  const [hoveredButton, setHoveredButton] = useState(null);
  const isSearchEmpty = searchQuery && searchQuery.trim().length > 0;
  
  const colors = {
    primary: {
      light: { main: '#4f46e5', hover: '#4338ca', active: '#3730a3', text: '#ffffff' },
      dark: { main: '#6366f1', hover: '#818cf8', active: '#4f46e5', text: '#ffffff' }
    },
    secondary: {
      light: { main: '#f3f4f6', hover: '#e5e7eb', active: '#d1d5db', text: '#1f2937' },
      dark: { main: '#374151', hover: '#4b5563', active: '#6b7280', text: '#f9fafb' }
    },
    neutral: {
      light: { background: '#f9fafb', card: '#ffffff', border: '#e5e7eb', text: '#111827', secondaryText: '#6b7280' },
      dark: { background: '#111827', card: '#1f2937', border: '#374151', text: '#f9fafb', secondaryText: '#9ca3af' }
    }
  };
  
  const theme = isDarkMode ? 'dark' : 'light';
  
  // Modern illustration with subtle animation
  const illustrationStyle = {
    width: '160px',
    height: '160px',
    margin: '0 auto 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '24px',
    background: isDarkMode 
      ? 'linear-gradient(145deg, rgba(79, 70, 229, 0.1), rgba(79, 70, 229, 0.05))' 
      : 'linear-gradient(145deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))',
    border: isDarkMode 
      ? '1px solid rgba(79, 70, 229, 0.2)' 
      : '1px solid rgba(99, 102, 241, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: isDarkMode 
        ? 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.1), transparent 60%)' 
        : 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.1), transparent 60%)',
      borderRadius: 'inherit',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: isDarkMode 
        ? 'radial-gradient(circle at 70% 70%, rgba(99, 102, 241, 0.1), transparent 60%)' 
        : 'radial-gradient(circle at 70% 70%, rgba(99, 102, 241, 0.1), transparent 60%)',
      borderRadius: 'inherit',
    },
    '@keyframes float': {
      '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
      '50%': { transform: 'translateY(-8px) rotate(1deg)' },
    },
    animation: 'float 8s ease-in-out infinite',
  };
  
  return (
    <div 
      className="empty-state" 
      style={{
        padding: '64px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '480px',
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: colors.neutral[theme].card,
        borderRadius: '16px',
        color: colors.neutral[theme].text,
        border: `1px dashed ${colors.neutral[theme].border}`,
        boxShadow: isDarkMode 
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Decorative elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: isDarkMode 
          ? 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)' 
          : 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '15%',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: isDarkMode 
          ? 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)' 
          : 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      
      {/* Main illustration */}
      <div style={{
        ...illustrationStyle,
        marginBottom: '32px',
      }}>
        <div style={{
          fontSize: '100px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textShadow: isDarkMode 
            ? '0 0 15px rgba(77, 124, 255, 0.4)' 
            : '0 0 15px rgba(66, 133, 244, 0.3)'
        }}>
          {isSearchEmpty ? '🔍' : '💼'}
        </div>
      </div>
      
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        margin: '0 0 16px',
        color: colors.neutral[theme].text,
        position: 'relative',
        zIndex: 1,
        lineHeight: 1.3,
      }}>
        {isSearchEmpty 
          ? `No projects found for "${searchQuery}"` 
          : 'Create your first project'}
      </h2>
      
      <p style={{
        maxWidth: '480px',
        margin: '0 auto 32px',
        fontSize: '16px',
        lineHeight: 1.6,
        color: colors.neutral[theme].secondaryText,
        position: 'relative',
        zIndex: 1,
        padding: '0 20px',
      }}>
        {isSearchEmpty
          ? 'No projects match your search. Try different keywords or create a new project.'
          : 'Start building something amazing with your first project. Choose a template or start from scratch.'}
      </p>
      
      <div style={{ 
        display: 'flex', 
        gap: '12px',
        position: 'relative',
        zIndex: 1,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={onCreateProject}
          onMouseEnter={() => setHoveredButton('primary')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: `linear-gradient(135deg, ${colors.primary[theme].main}, ${colors.primary[theme].hover})`,
            color: colors.primary[theme].text,
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
            transform: hoveredButton === 'primary' ? 'translateY(-2px) scale(1.02)' : 'none',
            boxShadow: hoveredButton === 'primary' 
              ? '0 10px 15px -3px rgba(79, 70, 229, 0.3), 0 4px 6px -4px rgba(79, 70, 229, 0.2)'
              : '0 4px 14px -4px rgba(79, 70, 229, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '5px',
              height: '5px',
              background: 'rgba(255, 255, 255, 0.5)',
              opacity: 0,
              borderRadius: '100%',
              transform: 'scale(1, 1) translate(-50%, -50%)',
              transformOrigin: '50% 50%',
              transition: 'opacity 0.3s, transform 0.5s',
            },
            '&:hover::after': {
              animation: 'ripple 1s ease-out',
              opacity: 1,
            },
            '@keyframes ripple': {
              '0%': {
                transform: 'scale(0, 0)',
                opacity: 0.5,
              },
              '100%': {
                transform: 'scale(50, 50)',
                opacity: 0,
              },
            },
          }}
        >
          <FiPlus style={{ fontSize: '18px' }} />
          {isSearchEmpty ? 'Create New Project' : 'Create Project'}
        </button>
        
        {!isSearchEmpty && (
          <button
            onClick={() => {}}
            onMouseEnter={() => setHoveredButton('secondary')}
            onMouseLeave={() => setHoveredButton(null)}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              background: 'transparent',
              color: isDarkMode ? colors.neutral.dark.secondaryText : colors.neutral.light.secondaryText,
              border: isDarkMode 
                ? `1px solid ${hoveredButton === 'reset' ? '#4d5680' : '#3d4663'}` 
                : `1px solid ${hoveredButton === 'reset' ? '#b3d4fc' : '#e6effd'}`,
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: hoveredButton === 'reset' 
                ? (isDarkMode ? '0 4px 10px rgba(0,0,0,0.2)' : '0 4px 10px rgba(0,0,0,0.05)') 
                : 'none',
              transform: hoveredButton === 'reset' ? 'translateY(-2px)' : 'translateY(0)'
            }}
            aria-label="Reset the search query"
          >
            <span 
              key="reset-icon"
              style={{
                fontSize: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s ease',
                transform: hoveredButton === 'reset' ? 'rotate(-180deg)' : 'rotate(0deg)'
              }}
            >
              ↻
            </span>
            Reset Search
          </button>
        )}
      </div>
      
      {/* Enhanced fallback loading explanation with better styling */}
      <div style={{
        marginTop: '40px',
        padding: '12px 20px',
        borderRadius: '8px',
        backgroundColor: isDarkMode ? 'rgba(45, 51, 72, 0.2)' : 'rgba(240, 247, 255, 0.6)',
        border: isDarkMode ? '1px solid rgba(61, 70, 99, 0.2)' : '1px solid rgba(179, 212, 252, 0.3)',
        maxWidth: '500px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <span role="img" aria-hidden="true" style={{
          fontSize: '16px',
          marginTop: '2px',
          color: isDarkMode ? '#8a96b0' : '#5a6682'
        }}>ℹ️</span>
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: isDarkMode ? '#8a96b0' : '#637190',
          lineHeight: '1.6',
          textAlign: 'left'
        }}>
          If you have existing projects that aren't showing, we'll try 
          to load them from IndexedDB, localStorage, sessionStorage, or cached data.
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
