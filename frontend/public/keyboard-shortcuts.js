// Keyboard shortcuts for menu access - system-wide fallback mechanism
(function() {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
  window.addEventListener('load', setupKeyboardShortcuts);
  setTimeout(setupKeyboardShortcuts, 1000); // Fallback

  function setupKeyboardShortcuts() {
    if (window._keyboardShortcutsInitialized) return;
    window._keyboardShortcutsInitialized = true;
    
    try {
      console.log('Setting up keyboard shortcuts for navigation');
      
      // Keyboard shortcuts
      const shortcuts = [
        { 
          keys: ['Alt', 'p'], 
          description: 'Show Projects Dashboard', 
          action: showProjects 
        },
        { 
          keys: ['Alt', 'n'], 
          description: 'Create New Project', 
          action: createNewProject 
        },
        { 
          keys: ['Alt', 'm'], 
          description: 'Toggle Guaranteed Menu', 
          action: toggleGuaranteedMenu 
        },
        { 
          keys: ['Alt', 'u'], 
          description: 'Toggle User Profile', 
          action: toggleUserProfile 
        },
        { 
          keys: ['Alt', 'c'], 
          description: 'Toggle Chat Panel', 
          action: toggleChatPanel 
        },
        { 
          keys: ['Alt', 'h'], 
          description: 'Open Help/Direct Menu', 
          action: () => window.open('/direct-menu.html', '_blank')
        },
        { 
          keys: ['Alt', 'f'], 
          description: 'Open Framed App', 
          action: () => window.open('/framed-app.html', '_self')
        }
      ];
      
      // Show keyboard shortcuts overlay on Alt+K
      const helpShortcut = { 
        keys: ['Alt', 'k'], 
        description: 'Show Keyboard Shortcuts', 
        action: showShortcutsOverlay
      };
      shortcuts.push(helpShortcut);
      
      // Track pressed keys
      const pressedKeys = new Set();
      
      // Listen for keydown
      document.addEventListener('keydown', function(e) {
        // Add pressed key
        pressedKeys.add(e.key);
        
        // Check if any shortcut matches
        for (const shortcut of shortcuts) {
          const keysPressed = shortcut.keys.every(key => {
            if (key === 'Alt') return e.altKey;
            return pressedKeys.has(key.toLowerCase());
          });
          
          if (keysPressed) {
            e.preventDefault();
            shortcut.action();
            return;
          }
        }
      });
      
      // Clear keys on keyup
      document.addEventListener('keyup', function(e) {
        pressedKeys.delete(e.key);
      });
      
      // Create visual indicator for keyboard shortcuts
      function showShortcutsOverlay() {
        // Check if overlay already exists
        if (document.getElementById('shortcuts-overlay')) {
          document.getElementById('shortcuts-overlay').style.display = 'flex';
          return;
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'shortcuts-overlay';
        
        // Apply overlay styles
        Object.assign(overlay.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '2147483647',
          padding: '20px'
        });
        
        // Create content container
        const container = document.createElement('div');
        Object.assign(container.style, {
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto'
        });
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Keyboard Shortcuts';
        Object.assign(title.style, {
          textAlign: 'center',
          marginTop: '0',
          marginBottom: '20px',
          color: '#333'
        });
        
        // Create shortcuts list
        const list = document.createElement('div');
        Object.assign(list.style, {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        });
        
        // Add each shortcut
        [...shortcuts].sort((a, b) => a.description.localeCompare(b.description))
          .forEach(shortcut => {
            const item = document.createElement('div');
            Object.assign(item.style, {
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px',
              borderBottom: '1px solid #eee'
            });
            
            // Description
            const desc = document.createElement('div');
            desc.textContent = shortcut.description;
            Object.assign(desc.style, {
              fontWeight: 'bold',
              color: '#333'
            });
            
            // Key combination
            const keys = document.createElement('div');
            keys.innerHTML = shortcut.keys.map(key => 
              `<span style="display:inline-block;padding:2px 8px;background:#f0f0f0;border-radius:4px;border:1px solid #ddd;margin:0 2px">${key}</span>`
            ).join(' + ');
            Object.assign(keys.style, {
              color: '#666',
              fontFamily: 'monospace'
            });
            
            item.appendChild(desc);
            item.appendChild(keys);
            list.appendChild(item);
          });
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        Object.assign(closeBtn.style, {
          padding: '10px 20px',
          backgroundColor: '#4a8df6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          margin: '20px auto 0',
          display: 'block'
        });
        
        closeBtn.addEventListener('click', () => {
          overlay.style.display = 'none';
        });
        
        // Add escape key to close
        overlay.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            overlay.style.display = 'none';
          }
        });
        
        // Click outside to close
        overlay.addEventListener('click', e => {
          if (e.target === overlay) {
            overlay.style.display = 'none';
          }
        });
        
        // Add to container
        container.appendChild(title);
        container.appendChild(list);
        container.appendChild(closeBtn);
        overlay.appendChild(container);
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Initial notification
        showNotification('Keyboard shortcuts available! Press Alt+K to see all shortcuts');
      }
      
      // Show notification
      function showNotification(message) {
        // Create notification
        const notification = document.createElement('div');
        notification.textContent = message;
        
        // Apply styles
        Object.assign(notification.style, {
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          fontWeight: 'bold',
          zIndex: '2147483646',
          opacity: '0',
          transition: 'opacity 0.3s'
        });
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show and hide with animation
        setTimeout(() => {
          notification.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          setTimeout(() => {
            notification.remove();
          }, 300);
        }, 5000);
      }
      
      // Show projects dashboard
      function showProjects() {
        try {
          // Find the projects button and click it
          const projectButtons = document.querySelectorAll('button');
          for (const btn of projectButtons) {
            if (btn.textContent && btn.textContent.includes('Projects')) {
              btn.click();
              console.log('Projects button clicked via keyboard shortcut');
              return;
            }
          }
          
          // Fallback: Try to dispatch event for React components
          document.dispatchEvent(new CustomEvent('showProjects'));
          console.log('showProjects event dispatched');
          if (dashboard) {
            dashboard.style.display = 'flex';
            dashboard.style.visibility = 'visible';
            dashboard.style.opacity = '1';
            console.log('Projects dashboard shown via direct DOM manipulation');
            showNotification('Projects dashboard opened');
          }
          
          // Dispatch custom event as final fallback
          document.dispatchEvent(new CustomEvent('forceProjectDashboardOpen'));
        } catch (err) {
          console.error('Error showing projects via keyboard shortcut:', err);
          showNotification('Error showing projects');
        }
      }
      
      // Create new project
      function createNewProject() {
        try {
          // Check UnifiedMenu for New Project button
          const menu = document.getElementById('unified-menu');
          if (menu) {
            const newProjectButtons = Array.from(menu.querySelectorAll('button'))
              .filter(btn => btn.textContent && (btn.textContent.includes('New Project') || 
                                               btn.textContent.includes('✨ New Project')));
                                               
            if (newProjectButtons.length > 0) {
              // Click the new project button in the menu
              newProjectButtons[0].click();
              console.log('New project button in menu clicked via keyboard shortcut');
              return;
            }
          }
          
          // Fallback: Try to find any New Project button
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent && (btn.textContent.includes('New Project') || btn.textContent.includes('Create Project'))) {
              btn.click();
              console.log('New project button clicked via fallback');
              return;
            }
          }
          
          // Final fallback: Dispatch custom event
          document.dispatchEvent(new CustomEvent('createNewProject'));
          console.log('createNewProject event dispatched');
        } catch (err) {
          console.error('Error creating new project via keyboard shortcut:', err);
        }
      }
      
      // Toggle the UnifiedMenu visibility with keyboard support
      function toggleGuaranteedMenu() {
        try {
          // Target the unified-menu container
          const menu = document.getElementById('unified-menu');
          if (menu) {
            const hamburgerButton = Array.from(menu.querySelectorAll('button'))
              .find(btn => btn.getAttribute('aria-label') && btn.getAttribute('aria-label').includes('navigation menu'));
            
            if (hamburgerButton) {
              if (window.innerWidth <= 768) {
                hamburgerButton.click();
                console.log('UnifiedMenu hamburger button clicked via keyboard shortcut');
              } else {
                const firstButton = menu.querySelector('button');
                if (firstButton) {
                  firstButton.focus();
                  console.log('Focused first button in UnifiedMenu');
                }
              }
            } else {
              console.warn('UnifiedMenu hamburger button not found');
            }
          } else {
            console.warn('UnifiedMenu container not found');
            
            // Dispatch custom event as fallback
            document.dispatchEvent(new CustomEvent('toggleGuaranteedMenu'));
            console.log('toggleGuaranteedMenu event dispatched as fallback');
          }
        } catch (err) {
          console.error('Error toggling unified menu:', err);
        }
      }
      
      // Toggle the UserProfilePanel with multiple fallback options
      function toggleUserProfile() {
        try {
          // Try to find the React handler on the username element first
          const usernameElement = document.querySelector('.user-info span.username');
          if (usernameElement) {
            usernameElement.click();
            console.log('User profile toggled via username element');
            return;
          }
          
          // Alternative: find the UserProfilePanel and toggle its visibility
          const profilePanel = document.querySelector('.user-profile-panel');
          if (profilePanel) {
            // If panel is visible, click its close button
            if (getComputedStyle(profilePanel).display !== 'none') {
              const closeButton = profilePanel.querySelector('.close-button');
              if (closeButton) {
                closeButton.click();
                console.log('User profile closed via panel close button');
                return;
              }
            } 
            // Otherwise, look for a way to open it
            else {
              // Try to dispatch a custom event that React components might be listening for
              const event = new CustomEvent('toggleUserProfile');
              document.dispatchEvent(event);
              console.log('User profile toggle event dispatched');
            }
          } else {
            console.warn('User profile panel not found');
            // Final fallback: Try to find any profile/settings button
            const settingsButtons = document.querySelectorAll(
              'button[aria-label="Settings"], button[aria-label="User settings"], button.user-profile-button'
            );
                 
            if (settingsButtons.length > 0) {
              settingsButtons[0].click();
              console.log('Profile/settings button clicked as fallback');
            } else {
              console.log('User profile toggled via fallback event');
              document.dispatchEvent(new CustomEvent('toggleUserProfile'));
            }
          }
        } catch (error) {
          console.error('Error toggling user profile:', error);
        }
      }
      
      // Toggle chat panel with keyboard support
      function toggleChatPanel() {
        try {
          // Find the chat button in the UnifiedMenu
          const menu = document.getElementById('unified-menu');
          if (menu) {
            const chatButton = Array.from(menu.querySelectorAll('button'))
              .find(btn => 
                (btn.getAttribute('aria-label') === 'Chat with AI Assistant') || 
                (btn.textContent && btn.textContent.includes('Chat'))
              );
            
            if (chatButton) {
              chatButton.click();
              console.log('Chat panel toggled via menu button');
              return;
            }
          }
          
          // Fallback: dispatch custom event
          console.log('Chat panel toggled via fallback event');
          document.dispatchEvent(new CustomEvent('toggle-chat-panel'));
          
          // Visual feedback
          showNotification('Chat panel toggled');
        } catch (error) {
          console.error('Error toggling chat panel:', error);
          showNotification('Error accessing chat panel');
        }
      }
      
      // Toggle main menu
      function toggleMainMenu() {
        try {
          // Find and show UnifiedMenu
          const menu = document.getElementById('unified-menu');
          if (menu) {
            // Find hamburger button in UnifiedMenu
            const hamburgerButton = Array.from(menu.querySelectorAll('button'))
              .find(btn => btn.getAttribute('aria-label') && btn.getAttribute('aria-label').includes('navigation menu'));
            
            if (hamburgerButton) {
              if (window.innerWidth <= 768) {
                hamburgerButton.click();
                console.log('Mobile menu toggled via keyboard shortcut');
                showNotification('Mobile menu toggled');
              } else {
                // Focus the first menu button in desktop view
                const firstButton = menu.querySelector('button');
                if (firstButton) {
                  firstButton.focus();
                  console.log('Main menu focused via keyboard shortcut');
                  showNotification('Menu navigation active');
                }
              }
            } else {
              console.log('Menu hamburger button not found');
              showNotification('Menu found but hamburger button missing');
            }
          } else {
            console.log('Unified menu not found');
            showNotification('Menu not found. Try refreshing the page');
          }
          
          // Dispatch custom event for legacy support
          document.dispatchEvent(new CustomEvent('customOpenMainMenu'));
        } catch (err) {
          console.error('Error toggling menu via keyboard shortcut:', err);
          showNotification('Error toggling menu');
        }
      }
      
      // Show notification about keyboard shortcuts
      setTimeout(() => {
        showNotification('Keyboard shortcuts available! Press Alt+K to see all shortcuts');
      }, 3000);
      
      console.log('Keyboard shortcuts initialized successfully');
    } catch (err) {
      console.error('Error setting up keyboard shortcuts:', err);
    }
  }
})();
