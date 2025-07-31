import React from 'react';

const HamburgerTest = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 9999,
      padding: '10px',
      background: '#333',
      color: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '24px',
        height: '20px',
        cursor: 'pointer'
      }}>
        <span style={{
          display: 'block',
          width: '100%',
          height: '2px',
          backgroundColor: 'white',
          borderRadius: '2px'
        }}></span>
        <span style={{
          display: 'block',
          width: '100%',
          height: '2px',
          backgroundColor: 'white',
          borderRadius: '2px'
        }}></span>
        <span style={{
          display: 'block',
          width: '100%',
          height: '2px',
          backgroundColor: 'white',
          borderRadius: '2px'
        }}></span>
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px' }}>Test Hamburger</div>
    </div>
  );
};

export default HamburgerTest;
