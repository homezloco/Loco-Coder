import React, { useState, useEffect } from 'react';
import { useAppSettings } from '../../context/AppSettingsContext';
import { FiSave, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';

const SettingsPanel = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(localSettings);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Autosave Settings */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex items-center h-5">
                <input
                  id="autosave"
                  name="autosave"
                  type="checkbox"
                  checked={localSettings.autosave || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="autosave" className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Autosave
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Automatically save changes to files
                </p>
              </div>
            </div>

            {localSettings.autosave && (
              <div className="ml-7 space-y-2">
                <label htmlFor="autosaveInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Autosave Interval (seconds)
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiClock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="autosaveInterval"
                    id="autosaveInterval"
                    min="1"
                    max="300"
                    value={localSettings.autosaveInterval || 5}
                    onChange={handleChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI Audit Settings */}
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="enableAIAudit"
                  name="enableAIAudit"
                  type="checkbox"
                  checked={localSettings.enableAIAudit || false}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="enableAIAudit" className="font-medium text-gray-700 dark:text-gray-300">
                  Enable AI Code Audit
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Get AI-powered code suggestions and audits
                </p>
              </div>
            </div>

            {localSettings.enableAIAudit && (
              <div className="ml-7 space-y-4">
                <div>
                  <label htmlFor="aiAuditEndpoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AI Audit Endpoint
                  </label>
                  <input
                    type="url"
                    name="aiAuditEndpoint"
                    id="aiAuditEndpoint"
                    value={localSettings.aiAuditEndpoint || ''}
                    onChange={handleChange}
                    placeholder="https://api.example.com/audit"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="aiAuditApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    name="aiAuditApiKey"
                    id="aiAuditApiKey"
                    value={localSettings.aiAuditApiKey || ''}
                    onChange={handleChange}
                    placeholder="Your API key"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="rounded-md bg-blue-50 dark:bg-blue-900 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FiAlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Audit Privacy</h3>
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        <p>Your code will be sent to the specified AI endpoint for analysis. Make sure to use a trusted service.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiSave className="mr-2 h-4 w-4" />
              Save Settings
            </button>
          </div>

          {showSaveSuccess && (
            <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-lg flex items-center">
              <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Settings saved successfully!
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SettingsPanel;
