import React from 'react';

function TestPage() {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center', 
      marginTop: '100px',
      padding: '20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      maxWidth: '600px',
      margin: '100px auto'
    }}>
      <h1>Test Page</h1>
      <p>If you can see this, the frontend is working correctly!</p>
      <button 
        style={{
          padding: '10px 15px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
        onClick={() => alert('Button clicked!')}
      >
        Click Me
      </button>
    </div>
  );
}

export default TestPage;
