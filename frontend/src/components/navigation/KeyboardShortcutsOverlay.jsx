import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Enhanced Keyboard Shortcuts Overlay with guaranteed visibility
 * Shows available keyboard shortcuts with categorization and search
 */
const KeyboardShortcutsOverlay = ({
  isVisible = false,
  onClose,
  isDarkMode = false,
  shortcuts = []
}) => {
  const [filter, setFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [visibilityState, setVisibilityState] = useState(isVisible);
  
  // Default shortcuts if none provided
  const defaultShortcuts = [
    { key: 'Alt+P', description: 'Toggle Project Dashboard', category: 'navigation' },
    { key: 'Alt+F', description: 'Open Framed App', category: 'navigation' },
    { key: 'Alt+H', description: 'Open Help', category: 'help' },
    { key: 'Alt+U', description: 'New Project Template', category: 'projects' },
    { key: 'Alt+1', description: 'Reset Layout', category: 'layout' },
    { key: 'Alt+2', description: 'Maximize Editor', category: 'layout' },
    { key: 'Alt+3', description: 'Maximize Terminal', category: 'layout' },
    { key: '?', description: 'Show Keyboard Shortcuts', category: 'help' },
    { key: 'Ctrl+S', description: 'Save Current File', category: 'files' },
    { key: 'Ctrl+O', description: 'Open File', category: 'files' },
    { key: 'Ctrl+N', description: 'New File', category: 'files' },
    { key: 'Esc', description: 'Close Modal / Cancel', category: 'general' }
  ];
  
  // Use provided shortcuts or fall back to defaults
  const effectiveShortcuts = shortcuts.length > 0 ? shortcuts : defaultShortcuts;
  
  // Extract unique categories
  const categories = ['all', ...new Set(effectiveShortcuts.map(s => s.category))];
  
  // Update visibility based on prop changes
  useEffect(() => {
    setVisibilityState(isVisible);
  }, [isVisible]);
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Close on escape key
      if (e.key === 'Escape' && visibilityState) {
        handleClose();
      }
      
      // Toggle on '?' key
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setVisibilityState(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visibilityState]);
  
  // Handle close with fallbacks
  const handleClose = () => {
    // Primary close method
    setVisibilityState(false);
    
    // Callback for parent component
    if (onClose) {
      onClose();
    }
    
    // Fallback for persistent visibility issues
    try {
      const element = document.getElementById('keyboard-shortcuts-overlay');
      if (element) {
        element.style.display = 'none';
      }
    } catch (err) {
      console.error('Keyboard shortcut overlay close fallback failed:', err);
    }
  };
  
  // Filter shortcuts based on search and category
  const filteredShortcuts = effectiveShortcuts.filter(shortcut => {
    const matchesFilter = filter === '' || 
      shortcut.key.toLowerCase().includes(filter.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(filter.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || shortcut.category === activeCategory;
    
    return matchesFilter && matchesCategory;
  });
  
  // If not visible, don't render
  if (!visibilityState) {
    return null;
  }
  
  // Color scheme based on dark mode
  const colors = {
    background: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    text: isDarkMode ? '#e5e7eb' : '#1f2937',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    key: isDarkMode ? '#1e293b' : '#f3f4f6',
    keyText: isDarkMode ? '#94a3b8' : '#4b5563',
    keyBorder: isDarkMode ? '#475569' : '#d1d5db',
    category: {
      active: isDarkMode ? '#3b82f6' : '#2563eb',
      inactive: isDarkMode ? '#6b7280' : '#9ca3af',
      activeBg: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)',
      inactiveBg: 'transparent',
    },
    searchBg: isDarkMode ? '#1f2937' : '#f9fafb',
    searchBorder: isDarkMode ? '#4b5563' : '#d1d5db',
  };

  return (
    <div 
      id="keyboard-shortcuts-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        visibility: 'visible !important', // Guarantee visibility
        opacity: '1 !important',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          width: '600px',
          maxWidth: '90%',
          maxHeight: '80vh',
          backgroundColor: colors.background,
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          padding: '24px',
          overflowY: 'auto',
          visibility: 'visible !important', // Guarantee visibility
          opacity: '1 !important',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
      >
        <header style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 
            id="keyboard-shortcuts-title"
            style={{ 
              margin: '0 0 16px', 
              fontSize: '24px',
              color: colors.text,
              fontWeight: 600
            }}
          >
            Keyboard Shortcuts
          </h2>
          
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: `1px solid ${colors.searchBorder}`,
              backgroundColor: colors.searchBg,
              fontSize: '16px',
              color: colors.text,
              outline: 'none',
              visibility: 'visible !important', // Guarantee visibility
            }}
            aria-label="Search keyboard shortcuts"
          />
          
          <div 
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '16px',
              justifyContent: 'center',
            }}
          >
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: category === activeCategory ? colors.category.activeBg : colors.category.inactiveBg,
                  color: category === activeCategory ? colors.category.active : colors.category.inactive,
                  fontWeight: category === activeCategory ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '14px',
                  textTransform: 'capitalize',
                  visibility: 'visible !important', // Guarantee visibility
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </header>
        
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {filteredShortcuts.length > 0 ? (
            filteredShortcuts.map((shortcut, index) => (
              <div
                key={`${shortcut.key}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  visibility: 'visible !important', // Guarantee visibility
                }}
              >
                <div style={{ color: colors.text, fontSize: '16px' }}>
                  {shortcut.description}
                  <span 
                    style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      opacity: 0.7,
                      textTransform: 'capitalize',
                    }}
                  >
                    ({shortcut.category})
                  </span>
                </div>
                <div 
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    backgroundColor: colors.key,
                    color: colors.keyText,
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    border: `1px solid ${colors.keyBorder}`,
                    minWidth: '60px',
                    textAlign: 'center',
                    fontWeight: 600,
                    visibility: 'visible !important', // Guarantee visibility
                  }}
                >
                  {shortcut.key}
                </div>
              </div>
            ))
          ) : (
            <div 
              style={{ 
                padding: '24px 16px',
                textAlign: 'center',
                color: colors.text,
                opacity: 0.7,
                fontSize: '16px'
              }}
            >
              No matching shortcuts found
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 24px',
              borderRadius: '6px',
              backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
              color: isDarkMode ? '#f3f4f6' : '#1f2937',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              visibility: 'visible !important', // Guarantee visibility
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

KeyboardShortcutsOverlay.propTypes = {
  isVisible: PropTypes.bool,
  onClose: PropTypes.func,
  isDarkMode: PropTypes.bool,
  shortcuts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired
    })
  )
};

export default KeyboardShortcutsOverlay;
