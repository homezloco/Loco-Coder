import React, { useState, useEffect, useCallback } from 'react';
import aiConnectionHelper, { CONNECTION_TYPES } from '../utils/aiConnectionHelper';

/**
 * AIDiagnosticTool provides a user interface for troubleshooting AI connection issues
 * with detailed diagnostics and actionable recommendations
 * 
 * @param {boolean} isOpen - Controls the visibility of the modal
 * @param {Function} onClose - Callback when the modal is closed
 * @param {string} [initialStatus='unknown'] - Initial status of the AI service
 * @param {Date} [lastCheckTime] - When the last status check was performed
 * @param {string} [errorMessage] - Any error message to display
 */
const AIDiagnosticTool = ({ 
  isOpen, 
  onClose, 
  initialStatus = 'unknown',
  lastCheckTime,
  errorMessage 
}) => {
  const [loading, setLoading] = useState(false);
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.OLLAMA_LOCAL);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [actionTaken, setActionTaken] = useState('');
  const [configStatus, setConfigStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Check configuration status on open
      checkConfig();
    }
  }, [isOpen]);

  const checkConfig = async () => {
    const status = await aiConnectionHelper.checkConfiguration();
    setConfigStatus(status);
  };

  const runDiagnostic = async () => {
    setLoading(true);
    setDiagnosticResults(null);
    
    try {
      const results = await aiConnectionHelper.runDiagnostics(connectionType);
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Diagnostic error:', error);
      setDiagnosticResults({
        success: false,
        connectionType,
        message: `Error running diagnostics: ${error.message}`,
        results: []
      });
    }
    
    setLoading(false);
  };

  const handleActionClick = (action) => {
    setActionTaken(`Recommended action: ${action}`);
    // In a real implementation, we might actually execute some of these actions
    // For now, we'll just display what would be done
  };

  if (!isOpen) return null;

  // Format last check time for display
  const formatLastCheckTime = useCallback((time) => {
    if (!time) return 'Never';
    
    const now = new Date();
    const checkTime = new Date(time);
    const diffMs = now - checkTime;
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return checkTime.toLocaleString();
  }, []);

  // Get status display info
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'success':
        return { text: 'Operational', className: 'text-green-600 bg-green-50 border-green-200' };
      case 'partial':
      case 'degraded':
        return { text: 'Degraded', className: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
      case 'error':
      case 'offline':
        return { text: 'Offline', className: 'text-red-600 bg-red-50 border-red-200' };
      case 'checking':
        return { text: 'Checking...', className: 'text-blue-600 bg-blue-50 border-blue-200' };
      default:
        return { text: 'Unknown', className: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const statusDisplay = getStatusDisplay(initialStatus);
  const lastCheckDisplay = lastCheckTime ? formatLastCheckTime(lastCheckTime) : 'Never';

  return (
    <div className="ai-diagnostic-tool fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="diagnostic-content bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Connection Diagnostics</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close diagnostic tool"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        
        {/* Status Overview */}
        <div className={`status-overview mb-6 p-4 rounded-lg border ${statusDisplay.className}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Status</h3>
              <p className="text-lg font-semibold">{statusDisplay.text}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Checked</h3>
              <p className="text-lg">{lastCheckDisplay}</p>
            </div>
          </div>
          
          {errorMessage && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-200 text-sm">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}
        </div>
        
        {/* Configuration status */}
        {configStatus && (
          <div className={`config-status mb-6 p-4 rounded-lg ${configStatus.allPassed ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <h3 className="font-medium mb-2">Configuration Check</h3>
            <ul className="list-none">
              <li className="flex items-center">
                <span className={`inline-block w-5 h-5 mr-2 rounded-full flex items-center justify-center ${configStatus.checks.backendConnectivity ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {configStatus.checks.backendConnectivity ? '✓' : '✗'}
                </span>
                Backend connectivity
              </li>
              <li className="flex items-center">
                <span className={`inline-block w-5 h-5 mr-2 rounded-full flex items-center justify-center ${configStatus.checks.ollamaConfigured ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {configStatus.checks.ollamaConfigured ? '✓' : '✗'}
                </span>
                Ollama configuration
              </li>
              <li className="flex items-center">
                <span className={`inline-block w-5 h-5 mr-2 rounded-full flex items-center justify-center ${configStatus.checks.modelAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {configStatus.checks.modelAvailable ? '✓' : '✗'}
                </span>
                Model availability
              </li>
            </ul>
            
            {!configStatus.allPassed && configStatus.recommendations.length > 0 && (
              <div className="recommendations mt-3 p-3 bg-yellow-50 rounded-md">
                <h4 className="font-medium mb-1">Recommendations:</h4>
                <ul className="list-disc pl-5 text-sm">
                  {configStatus.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Diagnostic controls */}
        <div className="diagnostic-controls mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
              <select 
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={loading}
              >
                <option value={CONNECTION_TYPES.OLLAMA_LOCAL}>Local Ollama</option>
                <option value={CONNECTION_TYPES.OLLAMA_REMOTE}>Remote Ollama</option>
                <option value={CONNECTION_TYPES.OFFLINE_EMBEDDED}>Offline (Browser-based)</option>
                <option value={CONNECTION_TYPES.OPENAI_API}>OpenAI API</option>
                <option value={CONNECTION_TYPES.ANTHROPIC_API}>Anthropic API</option>
              </select>
            </div>
            
            <div className="flex-none self-end">
              <button
                onClick={runDiagnostic}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={loading}
              >
                {loading ? 'Running...' : 'Run Diagnostic'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Diagnostic results */}
        {diagnosticResults && (
          <div className="diagnostic-results mb-6 border rounded-lg p-4">
            <div dangerouslySetInnerHTML={{ 
              __html: aiConnectionHelper.formatDiagnosticReport(diagnosticResults) 
            }} />
            
            {!diagnosticResults.success && (
              <div className="actions mt-4">
                <h4 className="font-medium mb-2">Take Action:</h4>
                <div className="action-buttons space-y-2">
                  {aiConnectionHelper.getRecommendedActions(diagnosticResults).criticalActions.map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleActionClick(action)}
                      className="w-full px-3 py-2 text-left bg-red-50 border border-red-200 rounded-md text-red-700 hover:bg-red-100"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Action feedback */}
        {actionTaken && (
          <div className="action-feedback mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
            {actionTaken}
          </div>
        )}
        
        {/* Help resources */}
        <div className="help-resources border-t pt-4">
          <h3 className="font-medium mb-2">Additional Resources:</h3>
          <ul className="list-disc pl-5 text-sm">
            <li><a href="https://ollama.ai/docs" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ollama Documentation</a></li>
            <li><a href="https://github.com/ollama/ollama/issues" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ollama GitHub Issues</a></li>
            <li><a href="https://discord.com/invite/ollama" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ollama Discord Community</a></li>
            <li><a href="#" className="text-blue-500 hover:underline">Coder AI Platform Documentation</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AIDiagnosticTool;
