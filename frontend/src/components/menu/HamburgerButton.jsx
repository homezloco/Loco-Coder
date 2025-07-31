import React from 'react';
import PropTypes from 'prop-types';

const HamburgerButton = ({ isOpen, onClick, isDarkMode = false }) => {
  return (
    <button
      className="hamburger-button"
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      aria-controls="mobile-menu"
    >
      {[0, 1, 2].map((index) => (
        <div 
          key={index} 
          className={`hamburger-line ${isOpen ? 'open' : ''}`}
          style={{
            backgroundColor: isDarkMode ? '#ffffff' : '#333333',
          }}
        />
      ))}
    </button>
  );
};

HamburgerButton.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool,
};


export default HamburgerButton;
