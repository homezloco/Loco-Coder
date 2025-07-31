import React from 'react';
import PropTypes from 'prop-types';

/**
 * LoadingSpinner component that displays a loading animation.
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the spinner (small, medium, large)
 * @param {string} [props.color='primary'] - Color of the spinner
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Loading spinner component
 */
const LoadingSpinner = ({ size = 'medium', color = 'primary', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-4',
  };

  const colorClasses = {
    primary: 'border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent',
    white: 'border-t-white border-r-transparent border-b-transparent border-l-transparent',
    dark: 'border-t-gray-800 border-r-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div className={`inline-block ${className}`} role="status" aria-label="Loading">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size] || sizeClasses.medium} ${colorClasses[color] || colorClasses.primary}`}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['primary', 'white', 'dark']),
  className: PropTypes.string,
};

export default LoadingSpinner;
