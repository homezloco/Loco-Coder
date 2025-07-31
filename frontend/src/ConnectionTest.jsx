import React, { useState, useEffect } from 'react';
import api from './api';

/**
 * A simple component to test API connectivity with fallbacks
 */
const ConnectionTest = () => {
  const [status, setStatus] = useState('Loading...');
  const [apiUrl, setApiUrl] = useState('Unknown');
  const [error, setError] = useState(null);
  const [filesData, setFilesData] = useState(null);
  
  // Test the API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test health endpoint
        const healthResponse = await api.checkHealth();
        setStatus(healthResponse.status || 'OK');
        setApiUrl(api.getBaseUrl());
        
        // Try to fetch files as a secondary test
        try {
          const files = await api.loadFiles();
          setFilesData({ files });
        } catch (fileError) {
          console.warn('Files endpoint test failed', fileError);
          // Don't fail the whole test if just the files endpoint fails
        }
      } catch (e) {
        console.error('API connection test failed', e);
        setStatus('Failed');
        setError(e.message || String(e));
        
        // Try fallback direct connection
        try {
          const directResponse = await fetch('http://localhost:8000/health');
          if (directResponse.ok) {
            const data = await directResponse.json();
            setStatus(`OK (Direct: ${data.status})`);
            setApiUrl('http://localhost:8000 (direct)');
          }
        } catch (directError) {
          console.error('Direct connection also failed', directError);
        }
      }
    };
    
    testConnection();
  }, []);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Coder App - Connection Test</h1>
      
      <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f5f5f5' }}>
        <h2>API Connection Status</h2>
        <div style={{ 
          padding: '10px', 
          backgroundColor: status.includes('Failed') ? '#ffeeee' : '#eeffee',
          border: `1px solid ${status.includes('Failed') ? '#ffaaaa' : '#aaffaa'}`,
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Connected API URL:</strong> {apiUrl}</p>
          {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
        </div>
      </div>
      
      {filesData && (
        <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f5f5f5' }}>
          <h2>Files API Test</h2>
          <pre style={{ 
            padding: '10px', 
            backgroundColor: '#fff', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(filesData, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h3>Troubleshooting</h3>
        <ul>
          <li>Make sure the backend server is running on port 8000</li>
          <li>Check that the proxy configuration in vite.config.js is correctly set</li>
          <li>Verify network connectivity between frontend and backend</li>
          <li>Check browser console (F12) for more detailed error information</li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionTest;
