import React, { useState, useEffect } from 'react';

/**
 * EmergencyMenu - A completely standalone, guaranteed-visible menu component
 * This component uses fixed positioning and inline styles to ensure it's always visible
 * regardless of any CSS conflicts or other issues.
 */
const EmergencyMenu = ({ 
  onShowProjects, 
  onCreateProject, 
  onToggleMainMenu 
}) => {
  const [visible, setVisible] = useState(true);

  // Force visibility after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      console.log('EmergencyMenu: Forcing visibility');
      
      // Add emergency class to body
      document.body.classList.add('emergency-menu-active');
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Ultra-guaranteed visibility styles with !important on everything
  const containerStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    display: visible ? 'flex' : 'none',
    flexDirection: 'row',
    gap: '10px',
    zIndex: 999999,
    padding: '10px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: '8px',
    boxShadow: '0 0 20px rgba(255,215,0,0.7), 0 0 30px rgba(255,0,0,0.5)',
    border: '3px solid gold',
    pointerEvents: 'auto'
  };

  const buttonBaseStyle = {
    padding: '12px 15px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: '2px solid white',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
    margin: '0',
    minWidth: '140px'
  };

  return (
    <div style={containerStyle} className="emergency-menu">
      <button 
        onClick={onShowProjects}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#4a8df6'
        }}
      >
        <span style={{fontSize: '20px'}}>📂</span> Projects
      </button>
      <button 
        onClick={onCreateProject}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#34a853',
          animation: 'pulse 2s infinite'
        }}
      >
        <span style={{fontSize: '20px'}}>✨</span> New Project
      </button>
      <button 
        onClick={onToggleMainMenu}
        style={{
          ...buttonBaseStyle,
          backgroundColor: '#FF5722'
        }}
      >
        <span style={{fontSize: '20px'}}>≡</span> Menu
      </button>
    </div>
  );
};

export default EmergencyMenu;
