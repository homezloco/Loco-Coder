// AbsoluteMenu.jsx - A menu component with guaranteed visibility
import React, { useEffect } from 'react';

/**
 * AbsoluteMenu - A component that renders a menu with guaranteed visibility
 * This menu will be visible regardless of CSS conflicts or React issues
 */
const AbsoluteMenu = ({ onShowProjects, onCreateProject, onToggleMainMenu }) => {
  // Ensure this component is mounted directly to the body
  useEffect(() => {
    // Create a container outside the React tree
    const menuContainer = document.createElement('div');
    menuContainer.id = 'absolute-menu-container';
    
    // Apply styles that absolutely cannot be overridden
    Object.assign(menuContainer.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: '50px',
      backgroundColor: '#333',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 20px',
      zIndex: '2147483647', // Maximum possible z-index
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '14px',
      borderBottom: '2px solid #4a8df6'
    });
    
    // Create left side with menu button
    const leftSide = document.createElement('div');
    leftSide.style.display = 'flex';
    leftSide.style.alignItems = 'center';
    
    // Menu button
    const menuBtn = document.createElement('button');
    Object.assign(menuBtn.style, {
      backgroundColor: '#FF5722',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      marginRight: '15px',
      cursor: 'pointer',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    });
    menuBtn.innerHTML = '<span style="font-size: 18px;">≡</span> Menu';
    menuBtn.onclick = () => {
      // Call the provided handler
      if (typeof onToggleMainMenu === 'function') {
        onToggleMainMenu();
      }
      
      // Also try direct DOM manipulation
      try {
        // Dispatch a custom event
        document.dispatchEvent(new CustomEvent('customOpenMainMenu', {
          detail: { source: 'absolute-menu' }
        }));
        
        // Directly manipulate DOM as fallback
        const menuContainer = document.querySelector('.main-menu-container');
        if (menuContainer) {
          menuContainer.style.display = 'block';
          menuContainer.style.visibility = 'visible';
          menuContainer.style.opacity = '1';
          
          // Try to find hamburger button
          const hamburger = menuContainer.querySelector('.hamburger-button');
          if (hamburger) {
            setTimeout(() => hamburger.click(), 100);
          }
        }
      } catch (err) {
        console.error('Failed to toggle menu:', err);
      }
    };
    
    // App title
    const title = document.createElement('span');
    title.textContent = 'Coder AI Platform';
    title.style.fontWeight = 'bold';
    
    leftSide.appendChild(menuBtn);
    leftSide.appendChild(title);
    
    // Create right side with projects and new project buttons
    const rightSide = document.createElement('div');
    rightSide.style.display = 'flex';
    rightSide.style.alignItems = 'center';
    rightSide.style.gap = '10px';
    
    // Projects button
    const projectsBtn = document.createElement('button');
    Object.assign(projectsBtn.style, {
      backgroundColor: '#4a8df6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      cursor: 'pointer',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    });
    projectsBtn.innerHTML = '<span style="font-size: 16px;">📂</span> Projects';
    projectsBtn.onclick = () => {
      // Call the provided handler
      if (typeof onShowProjects === 'function') {
        onShowProjects();
      }
      
      // Also try direct DOM manipulation
      try {
        // Store visibility state in localStorage
        localStorage.setItem('showProjectDashboard', 'true');
        
        // Directly manipulate DOM
        const projectDashboard = document.querySelector('.project-dashboard');
        if (projectDashboard) {
          projectDashboard.style.display = 'flex';
          projectDashboard.style.visibility = 'visible';
          projectDashboard.style.opacity = '1';
          projectDashboard.classList.add('open');
        }
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('forceProjectDashboardOpen', {
          detail: { source: 'absolute-menu' }
        }));
      } catch (err) {
        console.error('Failed to show projects:', err);
      }
    };
    
    // New project button
    const newProjectBtn = document.createElement('button');
    Object.assign(newProjectBtn.style, {
      backgroundColor: '#34a853',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 12px',
      cursor: 'pointer',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    });
    newProjectBtn.innerHTML = '<span style="font-size: 16px;">✨</span> New Project';
    newProjectBtn.onclick = () => {
      // Call the provided handler
      if (typeof onCreateProject === 'function') {
        onCreateProject();
      }
      
      // Also try direct DOM manipulation
      try {
        // Try to find and click new project buttons
        const buttons = document.querySelectorAll('button');
        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i];
          if (btn.textContent.includes('New Project') || 
              btn.textContent.includes('Create Project')) {
            btn.click();
            break;
          }
        }
      } catch (err) {
        console.error('Failed to create project:', err);
      }
    };
    
    rightSide.appendChild(projectsBtn);
    rightSide.appendChild(newProjectBtn);
    
    // Add the components to the container
    menuContainer.appendChild(leftSide);
    menuContainer.appendChild(rightSide);
    
    // Add to body
    document.body.prepend(menuContainer);
    
    // Create spacing element to push content down
    const spacer = document.createElement('div');
    spacer.style.height = '50px';
    spacer.style.width = '100%';
    document.body.prepend(spacer);
    
    console.log('AbsoluteMenu mounted directly to body');
    
    // Cleanup when component unmounts
    return () => {
      document.body.removeChild(menuContainer);
      if (document.body.contains(spacer)) {
        document.body.removeChild(spacer);
      }
      console.log('AbsoluteMenu unmounted');
    };
  }, []); // Empty dependency array ensures this runs only once
  
  // This component doesn't actually render anything through React
  // It uses direct DOM manipulation instead
  return null;
};

export default AbsoluteMenu;
