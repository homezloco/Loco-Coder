import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ApiTest from './components/ApiTest';

function TestApp() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <header style={styles.header}>
        <h1>AI Coding Platform</h1>
        <p>Development Environment Test</p>
      </header>
      
      <div style={styles.section}>
        <h2>Environment Check</h2>
        <div style={styles.card}>
          <h3>React is working correctly!</h3>
          <p>Current URL: {window.location.href}</p>
          <div>
            <h4>Debug Info:</h4>
            <pre style={styles.pre}>
              {JSON.stringify({
                userAgent: navigator.userAgent,
                viewport: {
                  width: window.innerWidth,
                  height: window.innerHeight
                },
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2>API Connection Tests</h2>
        <div style={styles.card}>
          <ApiTest />
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eaeaea',
  },
  section: {
    marginBottom: '40px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    marginTop: '15px',
  },
  pre: {
    backgroundColor: '#f5f5f5',
    padding: '15px',
    borderRadius: '4px',
    overflowX: 'auto',
    fontSize: '14px',
  },
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
