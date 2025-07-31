import React, { useState, useEffect } from 'react';

// Super simple App component to test basic rendering
function App() {
  // State for basic UI functionality
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  
  // Log when component mounts
  useEffect(() => {
    console.log('Simple App component mounted');
    
    // Check if we can access window and document
    try {
      console.log('Window object available:', typeof window !== 'undefined');
      console.log('Document object available:', typeof document !== 'undefined');
      
      // Add a direct DOM element as a fallback
      const div = document.createElement('div');
      div.id = 'direct-injection-test';
      div.style.position = 'fixed';
      div.style.top = '50px';
      div.style.left = '10px';
      div.style.backgroundColor = '#ff5722';
      div.style.color = 'white';
      div.style.padding = '20px';
      div.style.zIndex = '99999';
      div.style.borderRadius = '5px';
      div.textContent = 'React is rendering!';
      document.body.appendChild(div);
    } catch (err) {
      console.error('Error in useEffect:', err);
      setError(err.message);
    }
  }, []);

  // Basic styles using objects to avoid CSS issues
  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '100px auto 0',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    header: {
      backgroundColor: '#4a90e2',
      color: 'white',
      padding: '10px 20px',
      marginBottom: '20px',
      borderRadius: '5px'
    },
    button: {
      padding: '10px 15px',
      backgroundColor: '#4caf50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      margin: '5px'
    },
    errorBox: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '10px',
      borderRadius: '4px',
      marginTop: '20px'
    },
    menu: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#333',
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 20px',
      color: 'white',
      zIndex: 9999
    },
    menuLinks: {
      display: 'flex',
      gap: '20px'
    },
    link: {
      color: 'white',
      textDecoration: 'none',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      {/* Always visible menu */}
      <div style={styles.menu}>
        <div>Local AI Coding Platform</div>
        <div style={styles.menuLinks}>
          <a href="/" style={styles.link}>Home</a>
          <a href="/projects" style={styles.link}>Projects</a>
          <a href="/direct-menu.html" style={styles.link}>Direct Menu</a>
          <a href="/editor.html" style={styles.link}>Editor</a>
        </div>
      </div>
      
      <header style={styles.header}>
        <h1>Simple React App</h1>
      </header>
      
      <main>
        <h2>Counter: {count}</h2>
        <button 
          style={styles.button} 
          onClick={() => setCount(count + 1)}
        >
          Increment
        </button>
        <button 
          style={styles.button} 
          onClick={() => setCount(0)}
        >
          Reset
        </button>
        
        {/* Show any errors */}
        {error && (
          <div style={styles.errorBox}>
            <h3>Error:</h3>
            <p>{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
