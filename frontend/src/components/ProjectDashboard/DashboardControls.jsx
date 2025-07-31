import React, { useState } from 'react';

/**
 * Component providing dashboard layout customization controls and search functionality
 * Enhanced with modern Replit-like UI elements and animations
 */
const DashboardControls = ({ 
  isCustomizing, 
  onToggleCustomizing, 
  customizationMode, 
  onChangeLayout, 
  isDarkMode,
  onSearch,
  searchQuery,
  onCreateProject
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  
  // Colors for consistent styling
  const colors = {
    primary: {
      light: { main: '#4285f4', hover: '#3b78e7', text: '#ffffff', shadow: 'rgba(66,133,244,0.3)' },
      dark: { main: '#3d71e3', hover: '#4d7cff', text: '#ffffff', shadow: 'rgba(0,0,0,0.2)' }
    },
    success: {
      light: { main: '#34a853', hover: '#2d9649', text: '#ffffff', shadow: 'rgba(52,168,83,0.2)' },
      dark: { main: '#2d9649', hover: '#34a853', text: '#ffffff', shadow: 'rgba(0,0,0,0.2)' }
    },
    neutral: {
      light: { main: '#f5f5f5', hover: '#e0e0e0', text: '#5a6682', shadow: 'rgba(0,0,0,0.05)' },
      dark: { main: '#2d3348', hover: '#3d4663', text: '#c9d1e2', shadow: 'rgba(0,0,0,0.1)' }
    }
  };
  return (
    <div className="dashboard-controls" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '24px',
      backgroundColor: isDarkMode ? '#1e2032' : '#ffffff',
      padding: '16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid #2d3348' : '1px solid #e6effd40',
      boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.08)',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Optional subtle gradient overlay for depth */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: isDarkMode 
          ? 'linear-gradient(90deg, #4d7cff20, #3d71e320, #4d7cff20)' 
          : 'linear-gradient(90deg, #4285f420, #34a85320, #4285f420)',
        opacity: 0.7,
        zIndex: 1
      }} />
      {/* Left side with search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: '1 1 auto',
        maxWidth: '500px',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{
          position: 'relative',
          flex: '1 1 auto',
          transition: 'all 0.3s ease',
          transform: searchFocused ? 'scale(1.01)' : 'scale(1)'
        }}>
          <div style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: isDarkMode ? '#6e788c' : '#8896b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: searchFocused ? 1 : 0.7,
            transition: 'all 0.2s ease',
            filter: searchFocused ? 'drop-shadow(0 0 2px rgba(77, 124, 255, 0.5))' : 'none',
            zIndex: 2
          }}>
            <span role="img" aria-hidden="true" style={{ 
              fontSize: '15px',
              transform: searchFocused ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.2s ease'
            }}>🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery || ''}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              borderRadius: '10px',
              border: `1px solid ${searchFocused
                ? isDarkMode ? '#4d7cff60' : '#4285f450'
                : isDarkMode ? '#32364d' : '#e6effd70'}`,
              backgroundColor: isDarkMode ? '#1a1c2c' : '#ffffff',
              color: isDarkMode ? '#e8ecf3' : '#2c3e50',
              fontSize: '15px',
              fontWeight: '400',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: searchFocused 
                ? `0 0 0 3px ${isDarkMode ? '#4d7cff30' : '#4285f420'}, inset 0 2px 5px rgba(0,0,0,${isDarkMode ? '0.2' : '0.03'})`
                : `inset 0 2px 5px rgba(0,0,0,${isDarkMode ? '0.2' : '0.03'})`,
              letterSpacing: '0.2px',
            }}
            aria-label="Search projects"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              onMouseEnter={() => setHoveredButton('clear-search')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: hoveredButton === 'clear-search' ? (isDarkMode ? '#32364d' : '#f0f0f0') : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: hoveredButton === 'clear-search' ? (isDarkMode ? '#e8ecf3' : '#333') : (isDarkMode ? '#6e788c' : '#8896b8'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                transition: 'all 0.2s ease',
                opacity: hoveredButton === 'clear-search' ? 1 : 0.8,
                fontSize: '14px',
                fontWeight: 'bold'
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Customization mode toggle - enhanced with modern styling */}
        <button 
          onClick={onToggleCustomizing}
          onMouseEnter={() => setHoveredButton('customize')}
          onMouseLeave={() => setHoveredButton(null)}
          aria-pressed={isCustomizing}
          style={{
            backgroundColor: isCustomizing 
              ? isDarkMode ? colors.success.dark.main : colors.success.light.main
              : hoveredButton === 'customize' 
                ? isDarkMode ? colors.neutral.dark.hover : colors.neutral.light.hover
                : isDarkMode ? colors.neutral.dark.main : colors.neutral.light.main,
            color: isCustomizing 
              ? colors.success.light.text 
              : isDarkMode ? colors.neutral.dark.text : colors.neutral.light.text,
            border: isCustomizing ? 'none' : (isDarkMode ? '1px solid #3d4663' : '1px solid #e6effd'),
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: isCustomizing ? '500' : '400',
            transition: 'all 0.2s ease',
            minWidth: '110px',
            justifyContent: 'center',
            boxShadow: isCustomizing 
              ? `0 2px 8px ${isDarkMode ? colors.success.dark.shadow : colors.success.light.shadow}` 
              : (hoveredButton === 'customize' ? `0 2px 5px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}` : 'none'),
            transform: hoveredButton === 'customize' && !isCustomizing ? 'translateY(-1px)' : 'none'
          }}
        >
          <span role="img" aria-hidden="true" style={{
            fontSize: '15px',
            transition: 'transform 0.3s ease',
            transform: isCustomizing ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>🔧</span>
          <span>{isCustomizing ? 'Done' : 'Customize'}</span>
        </button>
      </div>

      {/* Right side with create project button - enhanced with modern styling */}
      <button
        onClick={onCreateProject}
        onMouseEnter={() => setHoveredButton('new-project')}
        onMouseLeave={() => setHoveredButton(null)}
        style={{
          backgroundColor: hoveredButton === 'new-project' 
            ? (isDarkMode ? colors.primary.dark.hover : colors.primary.light.hover)
            : (isDarkMode ? colors.primary.dark.main : colors.primary.light.main), 
          color: colors.primary.light.text,
          border: 'none',
          borderRadius: '12px',
          padding: '12px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '15px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          boxShadow: hoveredButton === 'new-project'
            ? (isDarkMode ? '0 6px 14px rgba(0,0,0,0.3)' : '0 6px 14px rgba(66,133,244,0.35)')
            : (isDarkMode ? '0 4px 10px rgba(0,0,0,0.25)' : '0 4px 10px rgba(66,133,244,0.25)'),
          transform: hoveredButton === 'new-project' ? 'translateY(-2px)' : 'translateY(0)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 5
        }}
        aria-label="Create new project"
      >
        {/* Subtle hover animation overlay */}
        {hoveredButton === 'new-project' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
            zIndex: 1
          }} />
        )}
        
        <span 
          role="img" 
          aria-hidden="true" 
          style={{
            fontSize: '16px',
            position: 'relative',
            zIndex: 2,
            transform: hoveredButton === 'new-project' ? 'scale(1.1) rotate(90deg)' : 'scale(1) rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          ➕
        </span>
        <span style={{ position: 'relative', zIndex: 2 }}>New Project</span>
      </button>

      {/* Layout mode controls - enhanced and only visible when customizing */}
      {isCustomizing && (
        <div className="layout-controls" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginTop: '16px',
          padding: '16px',
          backgroundColor: isDarkMode ? '#1a1c2c' : '#fafcff',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid #2d334860' : '1px solid #e6effd80',
          width: '100%',
          boxShadow: isDarkMode 
            ? 'inset 0 1px 4px rgba(0,0,0,0.2), 0 2px 10px rgba(0,0,0,0.15)' 
            : 'inset 0 1px 4px rgba(0,0,0,0.03), 0 2px 10px rgba(0,0,0,0.03)',
          position: 'relative'
        }}>
          {/* Customization mode indicator */}
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '24px',
            backgroundColor: isDarkMode ? '#4d7cff' : '#4285f4',
            color: 'white',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            letterSpacing: '0.5px',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 5px rgba(255,255,255,0.7)'
            }} />
            Customization Mode
          </div>
          
          <span style={{
            fontSize: '15px',
            fontWeight: '500',
            color: isDarkMode ? '#d3daed' : '#3c4964',
            marginRight: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span role="img" aria-hidden="true" style={{ fontSize: '16px' }}>🗺️</span>
            Layout Mode:
          </span>
          
          <div style={{ 
            display: 'flex', 
            gap: '10px',
            background: isDarkMode ? '#22263b' : '#f0f5ff',
            padding: '5px',
            borderRadius: '10px' 
          }}>
            <button
              onClick={() => onChangeLayout('grid')}
              onMouseEnter={() => setHoveredButton('grid')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                backgroundColor: customizationMode === 'grid' 
                  ? (isDarkMode ? '#3d71e380' : '#4285f430') 
                  : (hoveredButton === 'grid' ? (isDarkMode ? '#32364d' : '#e6effd50') : 'transparent'),
                color: customizationMode === 'grid' 
                  ? (isDarkMode ? '#e8ecf3' : '#2c3e50') 
                  : (isDarkMode ? '#a9b3cc' : '#5a6682'),
                border: customizationMode === 'grid'
                  ? (isDarkMode ? '1px solid #4d7cff60' : '1px solid #4285f460')
                  : '1px solid transparent',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: customizationMode === 'grid' ? '500' : '400',
                transition: 'all 0.2s ease',
                boxShadow: customizationMode === 'grid' ? (isDarkMode ? '0 2px 6px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.05)') : 'none',
                transform: hoveredButton === 'grid' && customizationMode !== 'grid' ? 'translateY(-1px)' : 'translateY(0)'
              }}
              aria-pressed={customizationMode === 'grid'}
              title="Display projects in a grid layout"
            >
              <span role="img" aria-hidden="true" style={{
                fontSize: '16px',
                opacity: customizationMode === 'grid' ? 1 : 0.8,
                transition: 'transform 0.2s ease',
                transform: hoveredButton === 'grid' || customizationMode === 'grid' ? 'scale(1.1)' : 'scale(1)'
              }}>🔲</span> 
              Grid
            </button>
            
            <button
              onClick={() => onChangeLayout('list')}
              onMouseEnter={() => setHoveredButton('list')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                backgroundColor: customizationMode === 'list' 
                  ? (isDarkMode ? '#3d71e380' : '#4285f430') 
                  : (hoveredButton === 'list' ? (isDarkMode ? '#32364d' : '#e6effd50') : 'transparent'),
                color: customizationMode === 'list' 
                  ? (isDarkMode ? '#e8ecf3' : '#2c3e50') 
                  : (isDarkMode ? '#a9b3cc' : '#5a6682'),
                border: customizationMode === 'list'
                  ? (isDarkMode ? '1px solid #4d7cff60' : '1px solid #4285f460')
                  : '1px solid transparent',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: customizationMode === 'list' ? '500' : '400',
                transition: 'all 0.2s ease',
                boxShadow: customizationMode === 'list' ? (isDarkMode ? '0 2px 6px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.05)') : 'none',
                transform: hoveredButton === 'list' && customizationMode !== 'list' ? 'translateY(-1px)' : 'translateY(0)'
              }}
              aria-pressed={customizationMode === 'list'}
              title="Display projects in a list layout"
            >
              <span role="img" aria-hidden="true" style={{
                fontSize: '16px',
                opacity: customizationMode === 'list' ? 1 : 0.8,
                transition: 'transform 0.2s ease',
                transform: hoveredButton === 'list' || customizationMode === 'list' ? 'scale(1.1)' : 'scale(1)'
              }}>📃</span> 
              List
            </button>
          </div>
          
          <div style={{ 
            marginLeft: 'auto', 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#2a2f4620' : '#f0f7ff60',
            padding: '8px 14px',
            borderRadius: '10px',
            border: isDarkMode ? '1px solid #2d334830' : '1px solid #e6effd60'
          }}>
            <span role="img" aria-hidden="true" style={{
              fontSize: '18px',
              color: isDarkMode ? '#ffb74d' : '#ff9800'
            }}>💡</span>
            <span style={{
              fontSize: '14px',
              color: isDarkMode ? '#c0caf5' : '#3c4964',
              fontWeight: '400',
              letterSpacing: '0.2px',
            }}>
              Drag & drop projects to reorder them
            </span>
          </div>
        </div>
      )}
      
      {/* Help text - only visible when customizing */}
      {isCustomizing && (
        <div style={{ 
          marginLeft: 'auto', 
          color: isDarkMode ? '#aaa' : '#666',
          fontSize: '0.85rem',
          fontStyle: 'italic'
        }}>
          <span role="img" aria-hidden="true" style={{ marginRight: '5px' }}>💡</span>
          Drag projects to reorder
        </div>
      )}
    </div>
  );
};

export default DashboardControls;
