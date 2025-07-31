import React, { useEffect, useState } from 'react';
import { useApiStatus } from '../contexts/ApiStatusContext';

const HealthCheckTest = () => {
  const { status, lastChecked, error, checkStatus, isOnline, isLoading } = useApiStatus();
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');

  const endpoints = [
    'http://localhost:8000/health',
    'http://127.0.0.1:8000/health',
    'http://172.28.112.1:8000/health',
    '/api/health',
    '/health'
  ];

  const runHealthCheck = async (endpoint = '') => {
    setIsTesting(true);
    setTestResults(prev => [
      ...prev,
      { type: 'info', message: `Starting health check${endpoint ? ` for ${endpoint}` : ''}...`, timestamp: new Date() }
    ]);

    try {
      const result = await checkStatus(true);
      setTestResults(prev => [
        ...prev,
        { 
          type: 'success', 
          message: `Health check successful: ${result.status}`, 
          details: result,
          timestamp: new Date() 
        }
      ]);
    } catch (err) {
      setTestResults(prev => [
        ...prev,
        { 
          type: 'error', 
          message: `Health check failed: ${err.message}`,
          details: err,
          timestamp: new Date() 
        }
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults([{ type: 'info', message: 'Starting all health checks...', timestamp: new Date() }]);
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        const responseTime = Date.now() - startTime;
        const data = await response.json().catch(() => ({}));
        
        setTestResults(prev => [
          ...prev,
          {
            type: response.ok ? 'success' : 'warning',
            message: `${endpoint}: ${response.status} ${response.statusText} (${responseTime}ms)`,
            details: { status: response.status, statusText: response.statusText, data },
            timestamp: new Date()
          }
        ]);
      } catch (err) {
        setTestResults(prev => [
          ...prev,
          {
            type: 'error',
            message: `${endpoint}: ${err.message}`,
            details: err,
            timestamp: new Date()
          }
        ]);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="health-check-test p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Health Check Tester</h2>
      
      <div className="mb-6 p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Status:</strong> <span className={`font-mono ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {status} {isOnline ? '✅' : '❌'}
            </span></p>
            <p><strong>Last Checked:</strong> {lastChecked ? lastChecked.toLocaleString() : 'Never'}</p>
            <p><strong>Loading:</strong> {isLoading ? '⏳' : '✓'}</p>
          </div>
          <div>
            {error && (
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
                <p className="font-medium">Error:</p>
                <p className="text-sm">{error.message}</p>
                {error.checks && (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">Component Status:</p>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(error.checks, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Test Controls</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => checkStatus(true)}
            disabled={isTesting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
          
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Select endpoint to test</option>
            {endpoints.map((endpoint) => (
              <option key={endpoint} value={endpoint}>
                {endpoint}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => runHealthCheck(selectedEndpoint)}
            disabled={isTesting || !selectedEndpoint}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Selected Endpoint
          </button>
          
          <button
            onClick={runAllTests}
            disabled={isTesting}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Test All Endpoints
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            Clear Results
          </button>
        </div>
      </div>

      <div className="test-results">
        <h3 className="text-lg font-semibold mb-2">Test Results</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto p-2 border rounded dark:border-gray-600">
          {testResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No test results yet. Run a test to see results.</p>
          ) : (
            testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded ${
                  result.type === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : result.type === 'error' 
                    ? 'bg-red-100 dark:bg-red-900/30' 
                    : result.type === 'warning'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{result.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      console.log(`Test result ${index} details:`, result.details);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Details
                  </button>
                </div>
                
                {result.details?.checks && (
                  <div className="mt-2 text-sm">
                    <pre className="whitespace-pre-wrap text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details.checks, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthCheckTest;
