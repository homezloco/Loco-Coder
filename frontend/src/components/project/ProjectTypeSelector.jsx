import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiSend, FiZap, FiChevronDown, FiChevronUp, FiCode, FiCpu, FiShield, FiCheck, FiX } from 'react-icons/fi';

const examplePrompts = [
  'A React todo list with TypeScript',
  'A Node.js API with Express and MongoDB',
  'A React Native mobile app for notes',
  'A Python data analysis project with pandas',
  'A full-stack e-commerce site'
];

const ProjectTypeSelector = ({ onSelect, onCancel }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiPreferences, setAiPreferences] = useState({});

  // Load AI preferences from settings
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    setAiPreferences(settings.aiPreferences || {});
  }, []);

  const getFrameworkName = (type) => {
    const framework = aiPreferences[type]?.framework || aiPreferences[type]?.language || 'Not specified';
    return framework.charAt(0).toUpperCase() + framework.slice(1);
  };

  const renderPreferenceBadge = (label, value, icon) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2 mb-2">
      {icon && <span className="mr-1">{icon}</span>}
      {label}: {value}
    </span>
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      setIsLoading(true);
      // Simulate API call to generate project
      setTimeout(() => {
        onSelect({
          type: 'custom',
          name: prompt.split(' ').slice(0, 5).join(' '),
          description: prompt,
          template: 'custom'
        });
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 mb-4">
          <FiZap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Create a new project
        </h2>
        <p className="mt-3 max-w-md mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
          Describe what you want to build
        </p>
      </div>
      
      <div className="mt-8">
        {/* AI Preferences Preview */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex justify-between items-center text-left text-blue-700 dark:text-blue-300 font-medium"
          >
            <span>AI Coding Preferences</span>
            {showPreview ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {showPreview && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <FiCode className="mr-1.5" /> Code Style
                </h4>
                <div className="flex flex-wrap">
                  {renderPreferenceBadge('Quotes', aiPreferences.quoteStyle === 'single' ? 'Single' : 'Double', '“”')}
                  {renderPreferenceBadge('Line Length', (aiPreferences.maxLineLength || 100) + ' chars', '⇥')}
                  {renderPreferenceBadge('Trailing Comma', 
                    aiPreferences.trailingComma === 'es5' ? 'ES5' : 
                    aiPreferences.trailingComma === 'all' ? 'All' : 'None', ',')}
                </div>
              </div>
              
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <FiCpu className="mr-1.5" /> Frameworks
                </h4>
                <div className="flex flex-wrap">
                  {aiPreferences.frontend?.framework && 
                    renderPreferenceBadge('Frontend', getFrameworkName('frontend'), '💻')}
                  {aiPreferences.backend?.language && 
                    renderPreferenceBadge('Backend', getFrameworkName('backend'), '⚙️')}
                  {aiPreferences.mobile?.framework && 
                    renderPreferenceBadge('Mobile', getFrameworkName('mobile'), '📱')}
                </div>
              </div>
              
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <FiShield className="mr-1.5" /> Code Quality
                </h4>
                <div className="flex flex-wrap">
                  {aiPreferences.enableESLint && renderPreferenceBadge('ESLint', 'Enabled', <FiCheck />)}
                  {aiPreferences.enablePrettier && renderPreferenceBadge('Prettier', 'Enabled', <FiCheck />)}
                  {aiPreferences.autoFixOnSave && renderPreferenceBadge('Auto-fix', 'On Save', <FiCheck />)}
                  {aiPreferences.generateTests && renderPreferenceBadge('Tests', 'Auto-generated', '🧪')}
                </div>
              </div>
              
              <div className="text-right">
                <a 
                  href="/settings/ai-preferences" 
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit preferences
                </a>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="block w-full px-6 py-4 text-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="A React todo list with TypeScript and Tailwind CSS"
              autoFocus
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                !prompt.trim() || isLoading
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              {isLoading ? 'Creating...' : 'Create'}
              <FiSend className="ml-2 h-4 w-4" />
            </button>
          </div>
        </form>
        
        <div className="mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
            Try one of these examples:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPrompt(example)}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

ProjectTypeSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ProjectTypeSelector;
