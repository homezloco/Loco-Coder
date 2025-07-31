import React, { useState, useEffect } from 'react';
import * as api from '../services/api/auth';

function ApiTest() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [isLoading, setIsLoading] = useState({
    health: false,
    ollama: false
  });
  const [error, setError] = useState(null);

  const testBackendHealth = async () => {
    setIsLoading(prev => ({ ...prev, health: true }));
    setError(null);
    try {
      const data = await api.healthCheck();
      setHealthStatus(data);
    } catch (err) {
      setError(`Health check failed: ${err.message}`);
      console.error('Health check error:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, health: false }));
    }
  };

  const testOllamaConnection = async () => {
    setIsLoading(prev => ({ ...prev, ollama: true }));
    setError(null);
    try {
      const data = await api.testOllamaConnection();
      setOllamaStatus(data);
    } catch (err) {
      setError(`Ollama connection test failed: ${err.message}`);
      console.error('Ollama test error:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, ollama: false }));
    }
  };

  return (
    <div style={styles.container}>
      <h2>API Connection Tests</h2>
      
      <div style={styles.testSection}>
        <h3>Backend Health Check</h3>
        <button 
          onClick={testBackendHealth}
          disabled={isLoading.health}
          style={styles.button}
        >
          {isLoading.health ? 'Testing...' : 'Test Backend Health'}
        </button>
        {healthStatus && (
          <div style={styles.result}>
            <h4>Backend Status:</h4>
            <pre>{JSON.stringify(healthStatus, null, 2)}</pre>
          </div>
        )}
      </div>

      <div style={styles.testSection}>
        <h3>Ollama Connection</h3>
        <button 
          onClick={testOllamaConnection}
          disabled={isLoading.ollama}
          style={styles.button}
        >
          {isLoading.ollama ? 'Testing...' : 'Test Ollama Connection'}
        </button>
        {ollamaStatus && (
          <div style={styles.result}>
            <h4>Ollama Status:</h4>
            <pre>{JSON.stringify(ollamaStatus, null, 2)}</pre>
          </div>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  testSection: {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #eaeaea',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  },
  button: {
    padding: '10px 15px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px',
    marginBottom: '15px',
  },
  result: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    overflowX: 'auto',
  },
  error: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '4px',
    color: '#d32f2f',
  },
};

export default ApiTest;
