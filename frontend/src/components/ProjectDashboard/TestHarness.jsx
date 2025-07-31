import React, { useState } from 'react';
import Dashboard from './Dashboard';

/**
 * Test harness for the Project Dashboard component
 * Allows testing different scenarios and fallback mechanisms
 */
const TestHarness = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:5000/api');
  const [apiStatus, setApiStatus] = useState('online');

  // Simulate API status changes
  const simulateApiStatus = (status) => {
    setApiStatus(status);
    if (status === 'offline') {
      setApiEndpoint('http://invalid-endpoint:5000/api');
    } else {
      setApiEndpoint('http://localhost:5000/api');
    }
  };

  // Simulate project selection
  const handleProjectSelect = (project) => {
    console.log('Project selected:', project);
  };

  // Clear browser storage
  const clearStorage = () => {
    const confirmClear = window.confirm('Are you sure you want to clear all stored data? This will remove all projects from localStorage and sessionStorage.');
    if (confirmClear) {
      localStorage.removeItem('cachedProjects');
      localStorage.removeItem('projectsCacheTime');
      sessionStorage.removeItem('cachedProjects');
      console.log('Browser storage cleared');
    }
  };

  // Clear IndexedDB
  const clearIndexedDB = async () => {
    const confirmClear = window.confirm('Are you sure you want to clear IndexedDB? This will remove all projects from the database.');
    if (confirmClear) {
      try {
        const indexedDBModule = await import('../../utils/indexedDBService.js');
        const isAvailable = await indexedDBModule.isIndexedDBAvailable();
        
        if (isAvailable) {
          await indexedDBModule.clearAllProjects();
          console.log('IndexedDB cleared successfully');
        } else {
          console.warn('IndexedDB is not available');
        }
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
    }
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: isDarkMode ? '#222' : '#f5f5f5',
      color: isDarkMode ? '#fff' : '#333',
      minHeight: '100vh'
    }}>
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h1>Project Dashboard Test Harness</h1>
        <p>Use the controls below to test different scenarios and fallback mechanisms</p>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div>
            <h3>Dashboard Visibility</h3>
            <button 
              onClick={() => setIsVisible(!isVisible)}
              style={{
                padding: '8px 16px',
                backgroundColor: isVisible ? '#4CAF50' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isVisible ? 'Hide Dashboard' : 'Show Dashboard'}
            </button>
          </div>
          
          <div>
            <h3>Theme Mode</h3>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                padding: '8px 16px',
                backgroundColor: isDarkMode ? '#f9a825' : '#333',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          
          <div>
            <h3>API Status</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => simulateApiStatus('online')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: apiStatus === 'online' ? '#4CAF50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Online
              </button>
              <button 
                onClick={() => simulateApiStatus('offline')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: apiStatus === 'offline' ? '#f44336' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Offline
              </button>
            </div>
          </div>
          
          <div>
            <h3>Storage Controls</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={clearStorage}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Browser Storage
              </button>
              <button 
                onClick={clearIndexedDB}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e91e63',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear IndexedDB
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <h3>Current Settings</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><strong>Dashboard Visibility:</strong> {isVisible ? 'Visible' : 'Hidden'}</li>
            <li><strong>Theme:</strong> {isDarkMode ? 'Dark Mode' : 'Light Mode'}</li>
            <li><strong>API Endpoint:</strong> {apiEndpoint}</li>
            <li><strong>API Status Simulation:</strong> {apiStatus}</li>
          </ul>
        </div>
      </div>
      
      <Dashboard 
        isVisible={isVisible}
        isDarkMode={isDarkMode}
        apiEndpoint={apiEndpoint}
        onProjectSelect={handleProjectSelect}
        onClose={() => setIsVisible(false)}
      />
    </div>
  );
};

export default TestHarness;
