import React, { useEffect, useState } from 'react';

/**
 * KeyboardShortcuts component - Manages application-wide keyboard shortcuts
 * 
 * Features:
 * - Global shortcut registration and handling
 * - Contextual shortcuts based on current application state
 * - Help overlay for displaying available shortcuts
 * - Customizable shortcuts with local storage persistence
 * - Accessibility support with announcements
 */
const KeyboardShortcuts = ({ 
  shortcuts = [], 
  disableGlobal = false,
  allowCustomization = true,
  onShortcutTriggered = () => {}
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState({});
  const [announcement, setAnnouncement] = useState('');
  
  // Initialize custom shortcuts from localStorage
  useEffect(() => {
    if (allowCustomization) {
      try {
        const savedShortcuts = localStorage.getItem('keyboard-shortcuts');
        if (savedShortcuts) {
          setCustomShortcuts(JSON.parse(savedShortcuts));
        }
      } catch (error) {
        console.error('Error loading custom keyboard shortcuts:', error);
      }
    }
  }, [allowCustomization]);
  
  // Save custom shortcuts to localStorage
  useEffect(() => {
    if (allowCustomization && Object.keys(customShortcuts).length > 0) {
      localStorage.setItem('keyboard-shortcuts', JSON.stringify(customShortcuts));
    }
  }, [customShortcuts, allowCustomization]);
  
  // Global keyboard handler
  useEffect(() => {
    if (disableGlobal) return;
    
    const handleKeyDown = (event) => {
      // Check for help shortcut (F1 or ?)
      if (event.key === 'F1' || (event.key === '?' && event.shiftKey)) {
        event.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
      
      // If help overlay is open, ESC closes it
      if (showHelp && event.key === 'Escape') {
        event.preventDefault();
        setShowHelp(false);
        return;
      }
      
      // Skip if we're in an input, textarea, or contentEditable element
      if (
        event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.contentEditable === 'true'
      ) {
        return;
      }
      
      // Process active shortcuts
      for (const shortcut of shortcuts) {
        // Get effective shortcut (custom or default)
        const effectiveKey = customShortcuts[shortcut.id] || shortcut.key;
        
        // Match key + modifiers
        if (
          event.key.toLowerCase() === effectiveKey.toLowerCase() &&
          event.ctrlKey === !!shortcut.ctrlKey &&
          event.altKey === !!shortcut.altKey &&
          event.shiftKey === !!shortcut.shiftKey &&
          event.metaKey === !!shortcut.metaKey
        ) {
          event.preventDefault();
          
          // Execute the shortcut action
          if (shortcut.action) {
            shortcut.action(event);
          }
          
          // Notify parent component
          onShortcutTriggered(shortcut.id, shortcut);
          
          // Announce for accessibility
          const modifiers = [
            shortcut.ctrlKey ? 'Control' : '',
            shortcut.altKey ? 'Alt' : '',
            shortcut.shiftKey ? 'Shift' : '',
            shortcut.metaKey ? (navigator.platform.indexOf('Mac') >= 0 ? 'Command' : 'Windows') : '',
          ].filter(Boolean).join('+');
          
          const keyCombo = modifiers ? `${modifiers}+${effectiveKey}` : effectiveKey;
          setAnnouncement(`${shortcut.label} activated with ${keyCombo}`);
          
          setTimeout(() => setAnnouncement(''), 3000);
          
          break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, disableGlobal, showHelp, customShortcuts, onShortcutTriggered]);
  
  // Save custom shortcut
  const setCustomShortcut = (id, newKey) => {
    setCustomShortcuts(prev => ({
      ...prev,
      [id]: newKey
    }));
  };
  
  // Reset a custom shortcut to default
  const resetCustomShortcut = (id) => {
    setCustomShortcuts(prev => {
      const newShortcuts = { ...prev };
      delete newShortcuts[id];
      return newShortcuts;
    });
  };
  
  // Reset all shortcuts
  const resetAllShortcuts = () => {
    setCustomShortcuts({});
    localStorage.removeItem('keyboard-shortcuts');
  };
  
  // Render shortcut help overlay
  const renderShortcutHelp = () => {
    if (!showHelp) return null;
    
    // Group shortcuts by category
    const categories = {};
    shortcuts.forEach(shortcut => {
      const category = shortcut.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(shortcut);
    });
    
    return (
      <div className="keyboard-shortcuts-overlay" onClick={() => setShowHelp(false)}>
        <div className="keyboard-shortcuts-modal" onClick={e => e.stopPropagation()}>
          <div className="keyboard-shortcuts-header">
            <h3>Keyboard Shortcuts</h3>
            <button 
              className="keyboard-shortcuts-close" 
              onClick={() => setShowHelp(false)}
              aria-label="Close keyboard shortcuts help"
            >
              ✕
            </button>
          </div>
          
          <div className="keyboard-shortcuts-content">
            {Object.entries(categories).map(([category, shortcuts]) => (
              <div key={category} className="keyboard-shortcuts-category">
                <h4>{category}</h4>
                <table>
                  <tbody>
                    {shortcuts.map(shortcut => {
                      const effectiveKey = customShortcuts[shortcut.id] || shortcut.key;
                      const modifiers = [
                        shortcut.ctrlKey ? 'Ctrl' : '',
                        shortcut.altKey ? 'Alt' : '',
                        shortcut.shiftKey ? 'Shift' : '',
                        shortcut.metaKey ? (navigator.platform.indexOf('Mac') >= 0 ? '⌘' : 'Win') : '',
                      ].filter(Boolean).join('+');
                      
                      const keyCombo = modifiers ? `${modifiers}+${effectiveKey}` : effectiveKey;
                      
                      return (
                        <tr key={shortcut.id}>
                          <td className="shortcut-label">{shortcut.label}</td>
                          <td className="shortcut-key">
                            <kbd>{keyCombo}</kbd>
                          </td>
                          {allowCustomization && (
                            <td className="shortcut-actions">
                              <button 
                                onClick={() => {
                                  const newKey = prompt(
                                    `Enter new key for "${shortcut.label}"`, 
                                    effectiveKey
                                  );
                                  if (newKey) {
                                    setCustomShortcut(shortcut.id, newKey);
                                  }
                                }}
                              >
                                Edit
                              </button>
                              {customShortcuts[shortcut.id] && (
                                <button onClick={() => resetCustomShortcut(shortcut.id)}>
                                  Reset
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          
          {allowCustomization && (
            <div className="keyboard-shortcuts-footer">
              <button 
                className="keyboard-shortcuts-reset" 
                onClick={resetAllShortcuts}
              >
                Reset All Shortcuts
              </button>
              <p className="keyboard-shortcuts-tip">
                Tip: Press F1 or Shift+? anytime to show this help
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <>
      {renderShortcutHelp()}
      
      {/* Accessibility announcer */}
      <div 
        aria-live="polite" 
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  );
};

export default KeyboardShortcuts;
