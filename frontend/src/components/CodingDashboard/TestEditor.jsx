import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiDownload, FiUpload, FiPlay, FiCode } from 'react-icons/fi';
import './TestEditor.css';

/**
 * TestEditor Component
 * 
 * A component for creating and managing test cases for API endpoints
 * Allows users to define test cases with request data, expected responses, and assertions
 */
const TestEditor = ({
  initialTestCases = [],
  apiEndpoints = [],
  onChange,
  isDarkMode = false
}) => {
  // State for test cases
  const [testCases, setTestCases] = useState(initialTestCases);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [isAddingTestCase, setIsAddingTestCase] = useState(false);
  const [newTestCaseData, setNewTestCaseData] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'GET',
    requestHeaders: {},
    requestBody: {},
    expectedStatus: 200,
    expectedResponse: {},
    assertions: []
  });
  
  // HTTP methods
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  
  // Initialize with default test cases if none provided and endpoints exist
  useEffect(() => {
    if (initialTestCases.length === 0 && apiEndpoints.length > 0) {
      const defaultTestCases = generateDefaultTestCases(apiEndpoints);
      setTestCases(defaultTestCases);
    } else {
      setTestCases(initialTestCases);
    }
  }, [initialTestCases, apiEndpoints]);
  
  // Notify parent component when test cases change
  useEffect(() => {
    if (onChange) {
      onChange(testCases);
    }
  }, [testCases, onChange]);
  
  // Generate default test cases for endpoints
  const generateDefaultTestCases = (endpoints) => {
    const defaultTestCases = [];
    
    endpoints.forEach(endpoint => {
      const method = endpoint.method;
      const path = endpoint.path;
      const description = endpoint.description;
      
      // Basic test case for each endpoint
      defaultTestCases.push({
        id: `test-${endpoint.id}`,
        name: `Test ${method} ${path}`,
        description: `Test case for ${description}`,
        endpoint: endpoint.id,
        method: method,
        requestHeaders: endpoint.requiresAuth ? {
          'Authorization': 'Bearer ${TOKEN}'
        } : {},
        requestBody: method === 'GET' ? {} : generateRequestBodyFromSchema(endpoint.requestSchema),
        expectedStatus: method === 'POST' ? 201 : 200,
        expectedResponse: generateExpectedResponseFromSchema(endpoint.responseSchema),
        assertions: [
          {
            type: 'status',
            value: method === 'POST' ? 201 : 200,
            description: 'Status code should be successful'
          },
          {
            type: 'responseTime',
            value: 500,
            description: 'Response time should be less than 500ms'
          }
        ]
      });
      
      // Error test case for invalid input (for POST, PUT, PATCH)
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        defaultTestCases.push({
          id: `test-${endpoint.id}-error`,
          name: `Test ${method} ${path} with invalid input`,
          description: `Test case for ${description} with invalid input`,
          endpoint: endpoint.id,
          method: method,
          requestHeaders: endpoint.requiresAuth ? {
            'Authorization': 'Bearer ${TOKEN}'
          } : {},
          requestBody: { invalid: 'data' },
          expectedStatus: 400,
          expectedResponse: {
            error: 'Bad Request'
          },
          assertions: [
            {
              type: 'status',
              value: 400,
              description: 'Status code should be 400 Bad Request'
            }
          ]
        });
      }
      
      // Authentication test case if endpoint requires auth
      if (endpoint.requiresAuth) {
        defaultTestCases.push({
          id: `test-${endpoint.id}-auth`,
          name: `Test ${method} ${path} without authentication`,
          description: `Test case for ${description} without authentication`,
          endpoint: endpoint.id,
          method: method,
          requestHeaders: {},
          requestBody: method === 'GET' ? {} : generateRequestBodyFromSchema(endpoint.requestSchema),
          expectedStatus: 401,
          expectedResponse: {
            error: 'Unauthorized'
          },
          assertions: [
            {
              type: 'status',
              value: 401,
              description: 'Status code should be 401 Unauthorized'
            }
          ]
        });
      }
    });
    
    return defaultTestCases;
  };
  
  // Generate request body from schema
  const generateRequestBodyFromSchema = (schema) => {
    if (!schema || !schema.properties) return {};
    
    const requestBody = {};
    const properties = schema.properties;
    
    Object.keys(properties).forEach(key => {
      const prop = properties[key];
      
      switch (prop.type) {
        case 'string':
          requestBody[key] = `test_${key}`;
          break;
        case 'number':
          requestBody[key] = 1;
          break;
        case 'integer':
          requestBody[key] = 1;
          break;
        case 'boolean':
          requestBody[key] = true;
          break;
        case 'array':
          requestBody[key] = [];
          break;
        case 'object':
          requestBody[key] = {};
          break;
        default:
          requestBody[key] = null;
      }
    });
    
    return requestBody;
  };
  
  // Generate expected response from schema
  const generateExpectedResponseFromSchema = (schema) => {
    if (!schema) return {};
    
    if (schema.type === 'array') {
      return [generateRequestBodyFromSchema(schema.items)];
    } else if (schema.type === 'object') {
      return generateRequestBodyFromSchema(schema);
    }
    
    return {};
  };
  
  // Add a new test case
  const addTestCase = () => {
    if (!newTestCaseData.name || !newTestCaseData.endpoint) return;
    
    const newTestCase = {
      id: `test-${Date.now()}`,
      ...newTestCaseData
    };
    
    setTestCases([...testCases, newTestCase]);
    setNewTestCaseData({
      name: '',
      description: '',
      endpoint: '',
      method: 'GET',
      requestHeaders: {},
      requestBody: {},
      expectedStatus: 200,
      expectedResponse: {},
      assertions: []
    });
    setIsAddingTestCase(false);
    setSelectedTestCase(newTestCase.id);
  };
  
  // Remove a test case
  const removeTestCase = (testCaseId) => {
    const updatedTestCases = testCases.filter(testCase => testCase.id !== testCaseId);
    setTestCases(updatedTestCases);
    
    if (selectedTestCase === testCaseId) {
      setSelectedTestCase(null);
    }
  };
  
  // Update a test case
  const updateTestCase = (testCaseId, field, value) => {
    const updatedTestCases = testCases.map(testCase => {
      if (testCase.id === testCaseId) {
        return {
          ...testCase,
          [field]: value
        };
      }
      return testCase;
    });
    
    setTestCases(updatedTestCases);
  };
  
  // Add an assertion to a test case
  const addAssertion = (testCaseId, assertion) => {
    const updatedTestCases = testCases.map(testCase => {
      if (testCase.id === testCaseId) {
        return {
          ...testCase,
          assertions: [...testCase.assertions, assertion]
        };
      }
      return testCase;
    });
    
    setTestCases(updatedTestCases);
  };
  
  // Remove an assertion from a test case
  const removeAssertion = (testCaseId, assertionIndex) => {
    const updatedTestCases = testCases.map(testCase => {
      if (testCase.id === testCaseId) {
        const updatedAssertions = [...testCase.assertions];
        updatedAssertions.splice(assertionIndex, 1);
        
        return {
          ...testCase,
          assertions: updatedAssertions
        };
      }
      return testCase;
    });
    
    setTestCases(updatedTestCases);
  };
  
  // Export test cases as JSON
  const exportTestCases = () => {
    const dataStr = JSON.stringify(testCases, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = 'test-cases.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Import test cases from JSON
  const importTestCases = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTestCases = JSON.parse(e.target.result);
        setTestCases(importedTestCases);
      } catch (error) {
        console.error('Error importing test cases:', error);
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };
  
  // Export test cases as Python pytest code
  const exportPytestCode = () => {
    let pytestCode = `import pytest\nimport requests\nimport json\n\n`;
    pytestCode += `# Base URL for API\nBASE_URL = "http://localhost:8000"\n\n`;
    pytestCode += `# Test token for authenticated requests\nTOKEN = "your_test_token_here"\n\n`;
    
    testCases.forEach(testCase => {
      const endpoint = apiEndpoints.find(e => e.id === testCase.endpoint);
      if (!endpoint) return;
      
      const path = endpoint.path.replace(/{([^}]+)}/g, '1'); // Replace path params with 1
      const method = testCase.method.toLowerCase();
      const functionName = testCase.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      pytestCode += `def test_${functionName}():\n`;
      pytestCode += `    """${testCase.description}\n    """\n`;
      pytestCode += `    url = f"{BASE_URL}${path}"\n`;
      
      // Headers
      if (Object.keys(testCase.requestHeaders).length > 0) {
        pytestCode += `    headers = ${JSON.stringify(testCase.requestHeaders, null, 4).replace(/"Bearer \${TOKEN}"/g, 'f"Bearer {TOKEN}"')}\n`;
      } else {
        pytestCode += `    headers = {}\n`;
      }
      
      // Request body
      if (Object.keys(testCase.requestBody).length > 0) {
        pytestCode += `    payload = ${JSON.stringify(testCase.requestBody, null, 4)}\n`;
      }
      
      // Make request
      if (method === 'get') {
        pytestCode += `    response = requests.get(url, headers=headers)\n`;
      } else if (method === 'post') {
        pytestCode += `    response = requests.post(url, headers=headers, json=payload)\n`;
      } else if (method === 'put') {
        pytestCode += `    response = requests.put(url, headers=headers, json=payload)\n`;
      } else if (method === 'patch') {
        pytestCode += `    response = requests.patch(url, headers=headers, json=payload)\n`;
      } else if (method === 'delete') {
        pytestCode += `    response = requests.delete(url, headers=headers)\n`;
      }
      
      // Assertions
      testCase.assertions.forEach(assertion => {
        if (assertion.type === 'status') {
          pytestCode += `    assert response.status_code == ${assertion.value} # ${assertion.description}\n`;
        } else if (assertion.type === 'responseTime') {
          pytestCode += `    assert response.elapsed.total_seconds() * 1000 < ${assertion.value} # ${assertion.description}\n`;
        } else if (assertion.type === 'jsonPath') {
          pytestCode += `    response_json = response.json()\n`;
          pytestCode += `    assert response_json${assertion.path} == ${JSON.stringify(assertion.value)} # ${assertion.description}\n`;
        }
      });
      
      pytestCode += `\n`;
    });
    
    const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(pytestCode)}`;
    const exportFileDefaultName = 'test_api.py';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Render a test case card
  const renderTestCaseCard = (testCase) => {
    const isSelected = selectedTestCase === testCase.id;
    const endpoint = apiEndpoints.find(e => e.id === testCase.endpoint);
    const methodColors = {
      GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      PATCH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    
    return (
      <div 
        key={testCase.id}
        className={`test-case-card ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedTestCase(isSelected ? null : testCase.id)}
      >
        <div className="test-case-header">
          <div className="test-case-name">{testCase.name}</div>
          <div className="test-case-actions">
            <button 
              className="test-icon-button delete"
              onClick={(e) => {
                e.stopPropagation();
                removeTestCase(testCase.id);
              }}
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
        
        <div className="test-case-endpoint">
          <span className={`test-case-method ${methodColors[testCase.method]}`}>
            {testCase.method}
          </span>
          <span className="test-case-path">
            {endpoint ? endpoint.path : 'Unknown endpoint'}
          </span>
        </div>
        
        <div className="test-case-description">
          {testCase.description}
        </div>
        
        <div className="test-case-assertions">
          <span className="assertions-count">
            {testCase.assertions.length} assertion{testCase.assertions.length !== 1 ? 's' : ''}
          </span>
          <span className={`expected-status status-${testCase.expectedStatus < 300 ? 'success' : 'error'}`}>
            {testCase.expectedStatus}
          </span>
        </div>
        
        {isSelected && (
          <div className="test-case-details">
            <div className="test-detail-row">
              <label>Name:</label>
              <input 
                type="text" 
                value={testCase.name}
                onChange={(e) => updateTestCase(testCase.id, 'name', e.target.value)}
              />
            </div>
            
            <div className="test-detail-row">
              <label>Description:</label>
              <input 
                type="text" 
                value={testCase.description}
                onChange={(e) => updateTestCase(testCase.id, 'description', e.target.value)}
              />
            </div>
            
            <div className="test-detail-row">
              <label>Expected Status:</label>
              <input 
                type="number" 
                value={testCase.expectedStatus}
                onChange={(e) => updateTestCase(testCase.id, 'expectedStatus', parseInt(e.target.value))}
              />
            </div>
            
            <div className="test-schemas">
              <div className="schema-section">
                <h4>Request Headers</h4>
                <pre className="schema-json">
                  {JSON.stringify(testCase.requestHeaders, null, 2)}
                </pre>
              </div>
              
              <div className="schema-section">
                <h4>Request Body</h4>
                <pre className="schema-json">
                  {JSON.stringify(testCase.requestBody, null, 2)}
                </pre>
              </div>
              
              <div className="schema-section">
                <h4>Expected Response</h4>
                <pre className="schema-json">
                  {JSON.stringify(testCase.expectedResponse, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="test-assertions">
              <h4>Assertions</h4>
              {testCase.assertions.map((assertion, index) => (
                <div key={index} className="assertion-item">
                  <div className="assertion-content">
                    <span className="assertion-type">{assertion.type}:</span>
                    <span className="assertion-value">{assertion.value}</span>
                    <span className="assertion-description">{assertion.description}</span>
                  </div>
                  <button 
                    className="test-icon-button delete-small"
                    onClick={() => removeAssertion(testCase.id, index)}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
              
              <button 
                className="test-button add-small"
                onClick={() => {
                  const newAssertion = {
                    type: 'status',
                    value: 200,
                    description: 'Status code should be successful'
                  };
                  addAssertion(testCase.id, newAssertion);
                }}
              >
                <FiPlus /> Add Assertion
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render the add test case form
  const renderAddTestCaseForm = () => {
    return (
      <div className="test-add-modal">
        <div className={`test-add-form ${isDarkMode ? 'dark' : ''}`}>
          <h3>Add New Test Case</h3>
          
          <div className="form-row">
            <label>Name:</label>
            <input
              type="text"
              placeholder="Test case name"
              value={newTestCaseData.name}
              onChange={(e) => setNewTestCaseData({
                ...newTestCaseData,
                name: e.target.value
              })}
            />
          </div>
          
          <div className="form-row">
            <label>Description:</label>
            <input
              type="text"
              placeholder="Describe this test case"
              value={newTestCaseData.description}
              onChange={(e) => setNewTestCaseData({
                ...newTestCaseData,
                description: e.target.value
              })}
            />
          </div>
          
          <div className="form-row">
            <label>Endpoint:</label>
            <select
              value={newTestCaseData.endpoint}
              onChange={(e) => {
                const selectedEndpoint = apiEndpoints.find(endpoint => endpoint.id === e.target.value);
                setNewTestCaseData({
                  ...newTestCaseData,
                  endpoint: e.target.value,
                  method: selectedEndpoint ? selectedEndpoint.method : 'GET'
                });
              }}
            >
              <option value="">Select an endpoint</option>
              {apiEndpoints.map(endpoint => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.method} {endpoint.path}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-row">
            <label>Expected Status:</label>
            <input
              type="number"
              value={newTestCaseData.expectedStatus}
              onChange={(e) => setNewTestCaseData({
                ...newTestCaseData,
                expectedStatus: parseInt(e.target.value)
              })}
            />
          </div>
          
          <div className="form-actions">
            <button 
              className="test-button add"
              onClick={addTestCase}
              disabled={!newTestCaseData.name || !newTestCaseData.endpoint}
            >
              Add
            </button>
            <button 
              className="test-button cancel"
              onClick={() => setIsAddingTestCase(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`test-editor-container ${isDarkMode ? 'dark' : ''}`}>
      {/* Toolbar */}
      <div className="test-toolbar">
        <button 
          className="test-toolbar-button"
          onClick={() => setIsAddingTestCase(true)}
        >
          <FiPlus /> Add Test Case
        </button>
        <button 
          className="test-toolbar-button"
          onClick={() => {
            const defaultTestCases = generateDefaultTestCases(apiEndpoints);
            setTestCases(defaultTestCases);
          }}
        >
          <FiCode /> Generate Tests
        </button>
        <button 
          className="test-toolbar-button"
          onClick={exportPytestCode}
        >
          <FiDownload /> Export Pytest
        </button>
        <button 
          className="test-toolbar-button"
          onClick={exportTestCases}
        >
          <FiDownload /> Export JSON
        </button>
        <label className="test-toolbar-button">
          <FiUpload /> Import JSON
          <input 
            type="file" 
            accept=".json" 
            style={{ display: 'none' }} 
            onChange={importTestCases} 
          />
        </label>
      </div>
      
      {/* Content */}
      <div className="test-content">
        {testCases.length === 0 ? (
          <div className="test-empty-state">
            <p>No test cases defined yet.</p>
            <button 
              className="test-button add"
              onClick={() => setIsAddingTestCase(true)}
            >
              <FiPlus /> Add Test Case
            </button>
            {apiEndpoints.length > 0 && (
              <button 
                className="test-button generate"
                onClick={() => {
                  const defaultTestCases = generateDefaultTestCases(apiEndpoints);
                  setTestCases(defaultTestCases);
                }}
              >
                <FiCode /> Generate Test Cases
              </button>
            )}
          </div>
        ) : (
          <div className="test-cases-list">
            {testCases.map(renderTestCaseCard)}
          </div>
        )}
      </div>
      
      {/* Add Test Case Modal */}
      {isAddingTestCase && renderAddTestCaseForm()}
    </div>
  );
};

export default TestEditor;
