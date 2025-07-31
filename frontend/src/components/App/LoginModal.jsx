import React from 'react';
import Login from '../../Login';

const LoginModal = ({ 
  showLoginModal, 
  setShowLoginModal, 
  handleLoginSuccess 
}) => {
  if (!showLoginModal) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={() => setShowLoginModal(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-color)', 
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setShowLoginModal(false)}
        />
      </div>
    </div>
  );
};

export default LoginModal;
