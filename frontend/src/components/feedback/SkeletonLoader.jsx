import React from 'react';
import PropTypes from 'prop-types';

/**
 * Skeleton Loader Component
 * Provides animated placeholders for content that is still loading
 * Includes multiple types and fallbacks for better UX
 */
const SkeletonLoader = ({
  type = 'text',
  count = 1,
  width,
  height,
  style = {},
  className = '',
  animation = 'pulse',
  isDarkMode = false
}) => {
  // Create array of skeleton items based on count
  const items = Array.from({ length: count }, (_, index) => index);
  
  // Base skeleton styles
  const baseStyle = {
    display: 'block',
    backgroundColor: isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.5)',
    borderRadius: '4px',
    visibility: 'visible !important', // Guarantee visibility
    opacity: '1 !important'
  };
  
  // Different skeleton types
  const getTypeStyle = (type) => {
    switch (type) {
      case 'avatar':
        return {
          width: width || '48px',
          height: height || '48px',
          borderRadius: '50%'
        };
      case 'button':
        return {
          width: width || '100px',
          height: height || '36px',
          borderRadius: '6px'
        };
      case 'card':
        return {
          width: width || '300px',
          height: height || '200px',
          borderRadius: '8px'
        };
      case 'table-row':
        return {
          width: width || '100%',
          height: height || '40px',
          marginBottom: '8px'
        };
      case 'image':
        return {
          width: width || '300px',
          height: height || '200px',
          borderRadius: '4px'
        };
      case 'title':
        return {
          width: width || '70%',
          height: height || '24px',
          marginBottom: '16px'
        };
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || '16px',
          marginBottom: '8px'
        };
    }
  };
  
  // Animation styles
  const getAnimationStyle = (animation) => {
    switch (animation) {
      case 'wave':
        return {
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            transform: 'translateX(-100%)',
            backgroundImage: `linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0,
              ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'} 50%,
              rgba(255, 255, 255, 0) 100%
            )`,
            animation: 'shimmer 1.5s infinite'
          }
        };
      case 'pulse':
      default:
        return {
          animation: 'pulse 1.5s ease-in-out infinite'
        };
    }
  };
  
  // Combine all styles
  const skeletonStyle = {
    ...baseStyle,
    ...getTypeStyle(type),
    ...getAnimationStyle(animation),
    ...style
  };
  
  // Create keyframes for animations
  const keyframes = `
    @keyframes pulse {
      0% {
        opacity: 0.6;
      }
      50% {
        opacity: 0.8;
      }
      100% {
        opacity: 0.6;
      }
    }
    
    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  `;
  
  return (
    <>
      <style>{keyframes}</style>
      <div className={`skeleton-container ${className}`}>
        {items.map((item) => (
          <div
            key={item}
            className={`skeleton-item skeleton-${type}`}
            style={skeletonStyle}
            role="presentation"
            aria-hidden="true"
            data-testid={`skeleton-${type}-${item}`}
          />
        ))}
      </div>
    </>
  );
};

SkeletonLoader.propTypes = {
  type: PropTypes.oneOf(['text', 'avatar', 'button', 'card', 'table-row', 'image', 'title']),
  count: PropTypes.number,
  width: PropTypes.string,
  height: PropTypes.string,
  style: PropTypes.object,
  className: PropTypes.string,
  animation: PropTypes.oneOf(['pulse', 'wave']),
  isDarkMode: PropTypes.bool
};

export default SkeletonLoader;
