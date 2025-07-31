import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * TransitionContainer Component
 * Provides smooth transitions between UI views/components with configurable animations
 * and fallback mechanisms for guaranteed visibility
 */
const TransitionContainer = ({
  children,
  isVisible = true,
  type = 'fade',
  duration = 300,
  delay = 0,
  easing = 'ease',
  onAnimationComplete = null,
  className = '',
  style = {},
  testId = 'transition-container'
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const [localVisible, setLocalVisible] = useState(isVisible);
  
  useEffect(() => {
    // Handle visibility change
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure DOM update before animation
      const showTimer = setTimeout(() => {
        setIsAnimating(true);
        setLocalVisible(true);
      }, 10);
      
      return () => clearTimeout(showTimer);
    } else {
      // Only update localVisible if it's currently true to prevent unnecessary updates
      setLocalVisible(prevVisible => prevVisible ? false : prevVisible);
      
      // Keep element in DOM until animation completes
      const hideTimer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
      }, duration);
      
      return () => {
        clearTimeout(hideTimer);
      };
    }
  }, [isVisible, duration]);
  
  // Handle animation completion
  const handleTransitionEnd = useCallback((event) => {
    // Only handle opacity transitions to prevent multiple calls
    if (event.propertyName !== 'opacity') return;
    
    setIsAnimating(false);
    if (onAnimationComplete) {
      onAnimationComplete(localVisible);
    }
  }, [localVisible, onAnimationComplete]);
  
  // Don't render anything if not visible and not animating
  if (!shouldRender) {
    return null;
  }
  
  // Animation properties by type
  const getAnimationProps = () => {
    const common = {
      transitionProperty: 'all',
      transitionDuration: `${duration}ms`,
      transitionTimingFunction: easing,
      transitionDelay: `${delay}ms`,
      visibility: 'visible !important',
      opacity: '1 !important'
    };
    
    switch (type) {
      case 'fade':
        return {
          ...common,
          opacity: localVisible ? 1 : 0
        };
      case 'slide-up':
        return {
          ...common,
          transform: localVisible ? 'translateY(0)' : 'translateY(20px)',
          opacity: localVisible ? 1 : 0
        };
      case 'slide-down':
        return {
          ...common,
          transform: localVisible ? 'translateY(0)' : 'translateY(-20px)',
          opacity: localVisible ? 1 : 0
        };
      case 'slide-left':
        return {
          ...common,
          transform: localVisible ? 'translateX(0)' : 'translateX(20px)',
          opacity: localVisible ? 1 : 0
        };
      case 'slide-right':
        return {
          ...common,
          transform: localVisible ? 'translateX(0)' : 'translateX(-20px)',
          opacity: localVisible ? 1 : 0
        };
      case 'scale':
        return {
          ...common,
          transform: localVisible ? 'scale(1)' : 'scale(0.95)',
          opacity: localVisible ? 1 : 0
        };
      case 'scale-up':
        return {
          ...common,
          transformOrigin: 'center bottom',
          transform: localVisible ? 'scale(1)' : 'scale(0.95) translateY(10px)',
          opacity: localVisible ? 1 : 0
        };
      case 'scale-down':
        return {
          ...common,
          transformOrigin: 'center top',
          transform: localVisible ? 'scale(1)' : 'scale(0.95) translateY(-10px)',
          opacity: localVisible ? 1 : 0
        };
      case 'zoom':
        return {
          ...common,
          transform: localVisible ? 'scale(1)' : 'scale(0.5)',
          opacity: localVisible ? 1 : 0
        };
      default:
        return {
          ...common,
          opacity: localVisible ? 1 : 0
        };
    }
  };
  
  // Combine custom styles with animation styles
  const combinedStyle = {
    ...getAnimationProps(),
    ...style
  };
  
  // CSS fallback styles for guaranteed animation
  const cssKeyframes = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    .transition-container {
      animation: ${localVisible ? 'fadeIn' : 'fadeOut'} ${duration}ms ${easing} ${delay}ms both;
      visibility: visible !important;
    }
  `;
  
  return (
    <>
      {/* Fallback animations via CSS if JS transitions fail */}
      <style>{cssKeyframes}</style>
      
      <div
        className={`transition-container ${className}`}
        style={combinedStyle}
        onTransitionEnd={handleTransitionEnd}
        data-testid={testId}
        data-visible={localVisible}
        data-animating={isAnimating}
        data-type={type}
      >
        {children}
      </div>
    </>
  );
};

TransitionContainer.propTypes = {
  children: PropTypes.node.isRequired,
  isVisible: PropTypes.bool,
  type: PropTypes.oneOf([
    'fade',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'scale',
    'scale-up',
    'scale-down',
    'zoom'
  ]),
  duration: PropTypes.number,
  delay: PropTypes.number,
  easing: PropTypes.string,
  onAnimationComplete: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  testId: PropTypes.string
};

export default TransitionContainer;
