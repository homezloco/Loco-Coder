import React, { useEffect, useState } from 'react';
import SkeletonLoader from '../../components/feedback/SkeletonLoader';

/**
 * Enhanced loading state component with modern design for project dashboard
 * @param {boolean} isDarkMode - Current theme mode
 * @param {string} dataSource - Optional data source being checked
 */
const LoadingState = ({ isDarkMode, dataSource = null }) => {
  // Animation for data source checking text
  const [checkingIndex, setCheckingIndex] = useState(0);
  const dataSources = ['API', 'IndexedDB', 'localStorage', 'sessionStorage', 'cached data'];
  
  // Define consistent colors for our UI
  const colors = {
    primary: {
      light: {
        main: '#4285f4',
        light: '#5294ff',
        dark: '#3b78e7',
        text: '#ffffff'
      },
      dark: {
        main: '#4d7cff',
        light: '#5a89ff', 
        dark: '#4371e6',
        text: '#ffffff'
      }
    },
    neutral: {
      light: {
        background: '#f7faff',
        card: '#ffffff',
        border: '#e6effd',
        text: '#2c3e50',
        secondaryText: '#637190'
      },
      dark: {
        background: '#171923',
        card: '#1c1e27',
        border: '#2d3348',
        text: '#e8ecf3',
        secondaryText: '#a9b3cc'
      }
    }
  };
  
  // Cycle through the data sources every 1.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCheckingIndex((prev) => (prev + 1) % dataSources.length);
    }, 1500);
    
    return () => clearInterval(timer);
  }, []);

  // Dynamic data source text
  const currentSource = dataSource || dataSources[checkingIndex];
  
  return (
    <div className="loading-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 30px',
      textAlign: 'center',
      minHeight: '350px',
      gridColumn: '1 / -1',
      backgroundColor: isDarkMode ? colors.neutral.dark.card : colors.neutral.light.card,
      borderRadius: '16px',
      visibility: 'visible !important',
      opacity: 1,
      boxShadow: isDarkMode 
        ? '0 8px 24px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.16)' 
        : '0 8px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      border: isDarkMode 
        ? `1px solid ${colors.neutral.dark.border}` 
        : `1px solid ${colors.neutral.light.border}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration elements */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: isDarkMode ? 'rgba(77, 124, 255, 0.2)' : 'rgba(66, 133, 244, 0.15)',
        opacity: 0.6,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '12%',
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: isDarkMode ? 'rgba(77, 124, 255, 0.3)' : 'rgba(66, 133, 244, 0.2)',
        opacity: 0.5,
      }} />
      
      {/* Modern loading spinner */}
      <div style={{
        position: 'relative',
        width: '100px',
        height: '100px',
        marginBottom: '30px'
      }}>
        {/* Outer spinner */}
        <div className="loading-spinner-outer" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: `4px solid ${isDarkMode ? 'rgba(61, 70, 99, 0.2)' : 'rgba(230, 239, 253, 0.6)'}`,
          borderTop: `4px solid ${isDarkMode ? colors.primary.dark.main : colors.primary.light.main}`,
          borderRadius: '50%',
          animation: 'spin 1.2s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite',
          boxShadow: isDarkMode 
            ? '0 0 15px rgba(77, 124, 255, 0.3)' 
            : '0 0 15px rgba(66, 133, 244, 0.2)'
        }}></div>
        
        {/* Inner spinner */}
        <div className="loading-spinner-inner" style={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          width: '60%',
          height: '60%',
          border: `4px solid ${isDarkMode ? 'rgba(61, 70, 99, 0.3)' : 'rgba(230, 239, 253, 0.8)'}`,
          borderBottom: `4px solid ${isDarkMode ? colors.primary.dark.light : colors.primary.light.dark}`,
          borderRadius: '50%',
          animation: 'spin 0.8s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite reverse'
        }}></div>
        
        {/* Center dot */}
        <div style={{
          position: 'absolute',
          top: '42%',
          left: '42%',
          width: '16%',
          height: '16%',
          backgroundColor: isDarkMode ? colors.primary.dark.main : colors.primary.light.main,
          borderRadius: '50%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}></div>
      </div>
      
      {/* Loading text with enhanced styling */}
      <h3 style={{
        fontSize: '22px', 
        fontWeight: '600', 
        color: isDarkMode ? colors.neutral.dark.text : colors.neutral.light.text,
        margin: '0 0 14px',
        position: 'relative',
        display: 'inline-block'
      }}>
        Loading your projects
        <span style={{
          display: 'inline-block',
          animation: 'ellipsisDots 1.5s infinite'
        }}></span>
      </h3>
      
      {/* Enhanced description with data source indication */}
      <p style={{
        fontSize: '15px',
        color: isDarkMode ? colors.neutral.dark.secondaryText : colors.neutral.light.secondaryText,
        maxWidth: '450px',
        margin: '0 auto 25px',
        lineHeight: '1.6'
      }}>
        This may take a moment. We're ensuring all your projects are available,
        even when you're offline.
      </p>
      
      {/* Data source checking indicator */}
      <div style={{
        padding: '10px 18px',
        borderRadius: '12px',
        backgroundColor: isDarkMode ? 'rgba(45, 51, 72, 0.3)' : 'rgba(240, 247, 255, 0.7)',
        border: isDarkMode ? '1px solid rgba(61, 70, 99, 0.2)' : '1px solid rgba(179, 212, 252, 0.3)',
        fontSize: '14px',
        color: isDarkMode ? 'rgba(169, 179, 204, 0.8)' : 'rgba(90, 102, 130, 0.8)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: isDarkMode ? colors.primary.dark.main : colors.primary.light.main,
          animation: 'pulse 1s infinite'
        }}></div>
        <span>
          Checking <strong style={{
            color: isDarkMode ? '#b8c4ff' : '#4285f4',
            fontWeight: '600'
          }}>{currentSource}</strong> for your projects
        </span>
      </div>
      
      {/* Skeleton loaders */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        width: '100%'
      }}>
        {/* Header skeleton */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '0 16px'
        }}>
          <SkeletonLoader 
            type="title"
            width="200px"
            height="32px"
            isDarkMode={isDarkMode}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <SkeletonLoader 
              type="button"
              width="120px"
              height="36px"
              isDarkMode={isDarkMode}
            />
            <SkeletonLoader 
              type="button"
              width="100px"
              height="36px"
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
        
        {/* Filter tabs skeleton */}
        <div style={{
          display: 'flex',
          marginBottom: '24px',
          padding: '0 16px',
          gap: '12px'
        }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader 
              key={`filter-${i}`}
              type="button"
              width="80px"
              height="32px"
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
        
        {/* Project cards skeleton grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          padding: '0 16px'
        }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div 
              key={`card-${i}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                padding: '16px'
              }}
            >
              <SkeletonLoader 
                type="title"
                width="80%"
                height="24px"
                isDarkMode={isDarkMode}
                style={{ marginBottom: '12px' }}
              />
              
              <SkeletonLoader 
                type="text"
                count={2}
                width="100%"
                height="16px"
                isDarkMode={isDarkMode}
              />
              
              <div style={{ flex: 1, minHeight: '40px' }} />
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '16px'
              }}>
                <SkeletonLoader 
                  type="text"
                  width="100px"
                  height="16px"
                  isDarkMode={isDarkMode}
                />
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <SkeletonLoader 
                    type="button"
                    width="32px"
                    height="32px"
                    style={{ borderRadius: '4px' }}
                    isDarkMode={isDarkMode}
                  />
                  <SkeletonLoader 
                    type="button"
                    width="32px"
                    height="32px"
                    style={{ borderRadius: '4px' }}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Loading indicator text - accessibility */}
        <div 
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: '0'
          }}
          role="status"
          aria-live="polite"
        >
          Loading projects, please wait...
        </div>
      </div>

      {/* Animation keyframes - must be included inline as style tag isn't accessible */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.6; transform: scale(0.9); }
        }
        @keyframes ellipsisDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}} />
    </div>
  );
};

export default LoadingState;
