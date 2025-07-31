import React from 'react';
import PropTypes from 'prop-types';
import Login from '../../Login';

const LoginModal = ({ isOpen, onLoginSuccess, onClose, isDarkMode }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: isDarkMode ? '#2d2d2d' : '#fff',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <Login 
          onLoginSuccess={onLoginSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

LoginModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool
};

export default LoginModal;
