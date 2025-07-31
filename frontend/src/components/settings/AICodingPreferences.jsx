import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { FiCode, FiCpu, FiShield, FiZap, FiCheck, FiLayers, FiDatabase, FiSmartphone, FiMonitor } from 'react-icons/fi';

const AICodingPreferences = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('frontend');
  const [formData, setFormData] = useState(settings.aiPreferences || {});

  useEffect(() => {
    setFormData(settings.aiPreferences || {});
  }, [settings.aiPreferences]);

  const handleChange = (field, value, parent = null) => {
    if (parent) {
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const savePreferences = () => {
    updateSettings({
      aiPreferences: formData
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'frontend':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Framework
                </label>
                <select
                  value={formData.frontend?.framework || 'react'}
                  onChange={(e) => handleChange('framework', e.target.value, 'frontend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="angular">Angular</option>
                  <option value="svelte">Svelte</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State Management
                </label>
                <select
                  value={formData.frontend?.stateManagement || 'context'}
                  onChange={(e) => handleChange('stateManagement', e.target.value, 'frontend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="context">Context API</option>
                  <option value="redux">Redux</option>
                  <option value="mobx">MobX</option>
                  <option value="recoil">Recoil</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Styling
                </label>
                <select
                  value={formData.frontend?.styling || 'tailwind'}
                  onChange={(e) => handleChange('styling', e.target.value, 'frontend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="tailwind">Tailwind CSS</option>
                  <option value="css">CSS</option>
                  <option value="scss">SCSS</option>
                  <option value="styled-components">Styled Components</option>
                  <option value="emotion">Emotion</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Testing
                </label>
                <select
                  value={formData.frontend?.testing || 'jest'}
                  onChange={(e) => handleChange('testing', e.target.value, 'frontend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="jest">Jest</option>
                  <option value="vitest">Vitest</option>
                  <option value="testing-library">Testing Library</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Code Style</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="preferFunctional"
                    checked={formData.preferFunctional !== false}
                    onChange={(e) => handleChange('preferFunctional', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="preferFunctional" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Prefer functional components
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="preferTypeScript"
                    checked={formData.preferTypeScript !== false}
                    onChange={(e) => handleChange('preferTypeScript', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="preferTypeScript" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Prefer TypeScript
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'backend':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Language
                </label>
                <select
                  value={formData.backend?.language || 'node'}
                  onChange={(e) => handleChange('language', e.target.value, 'backend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="go">Go</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                  <option value="ruby">Ruby</option>
                  <option value="php">PHP</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Framework
                </label>
                <select
                  value={formData.backend?.framework || 'express'}
                  onChange={(e) => handleChange('framework', e.target.value, 'backend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="express">Express</option>
                  <option value="nest">NestJS</option>
                  <option value="fastify">Fastify</option>
                  <option value="django">Django</option>
                  <option value="flask">Flask</option>
                  <option value="spring">Spring</option>
                  <option value="laravel">Laravel</option>
                  <option value="rails">Ruby on Rails</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ORM
                </label>
                <select
                  value={formData.backend?.orm || 'prisma'}
                  onChange={(e) => handleChange('orm', e.target.value, 'backend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="prisma">Prisma</option>
                  <option value="typeorm">TypeORM</option>
                  <option value="sequelize">Sequelize</option>
                  <option value="mongoose">Mongoose</option>
                  <option value="drizzle">Drizzle</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Database
                </label>
                <select
                  value={formData.backend?.database || 'postgresql'}
                  onChange={(e) => handleChange('database', e.target.value, 'backend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Authentication
                </label>
                <select
                  value={formData.backend?.authentication || 'jwt'}
                  onChange={(e) => handleChange('authentication', e.target.value, 'backend')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="jwt">JWT</option>
                  <option value="session">Session</option>
                  <option value="oauth">OAuth</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        );
        
      case 'code-style':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Line Length
                </label>
                <input
                  type="number"
                  value={formData.maxLineLength || 100}
                  onChange={(e) => handleChange('maxLineLength', parseInt(e.target.value))}
                  min={40}
                  max={200}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quote Style
                </label>
                <select
                  value={formData.quoteStyle || 'single'}
                  onChange={(e) => handleChange('quoteStyle', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="single">Single quotes</option>
                  <option value="double">Double quotes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trailing Commas
                </label>
                <select
                  value={formData.trailingComma || 'es5'}
                  onChange={(e) => handleChange('trailingComma', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="none">None</option>
                  <option value="es5">ES5 (default)</option>
                  <option value="all">All</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arrow Function Parentheses
                </label>
                <select
                  value={formData.arrowParens || 'always'}
                  onChange={(e) => handleChange('arrowParens', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="always">Always include</option>
                  <option value="avoid">Avoid when possible</option>
                </select>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Code Style Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'preferAsyncAwait', label: 'Prefer async/await over callbacks' },
                  { id: 'preferArrowFunctions', label: 'Prefer arrow functions' },
                  { id: 'preferDestructuring', label: 'Prefer destructuring' },
                  { id: 'preferTemplateLiterals', label: 'Prefer template literals' },
                  { id: 'preferConst', label: 'Prefer const over let' },
                  { id: 'preferForOf', label: 'Prefer for...of over for loops' },
                  { id: 'preferOptionalChaining', label: 'Use optional chaining' },
                  { id: 'preferNullishCoalescing', label: 'Use nullish coalescing' },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={id}
                      checked={formData[id] !== false}
                      onChange={(e) => handleChange(id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={id} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'code-quality':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">TypeScript Strictness</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'enforceTypes', label: 'Enforce TypeScript types' },
                  { id: 'noImplicitAny', label: 'No implicit any' },
                  { id: 'strictNullChecks', label: 'Strict null checks' },
                  { id: 'strictFunctionTypes', label: 'Strict function types' },
                  { id: 'strictBindCallApply', label: 'Strict bind/call/apply' },
                  { id: 'noUnusedLocals', label: 'No unused locals' },
                  { id: 'noUnusedParameters', label: 'No unused parameters' },
                  { id: 'noImplicitReturns', label: 'No implicit returns' },
                  { id: 'noFallthroughCasesInSwitch', label: 'No fallthrough cases in switch' },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={id}
                      checked={formData[id] !== false}
                      onChange={(e) => handleChange(id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={id} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Documentation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'generateJSDoc', label: 'Generate JSDoc comments' },
                  { id: 'generateTypeDoc', label: 'Generate TypeDoc for types' },
                  { id: 'includeExamples', label: 'Include examples in docs' },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={id}
                      checked={formData[id] !== false}
                      onChange={(e) => handleChange(id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={id} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'validateInput', label: 'Validate all input', description: 'Ensure all user input is validated' },
                  { id: 'escapeOutput', label: 'Escape output', description: 'Escape all output to prevent XSS' },
                  { id: 'useSecureDefaults', label: 'Use secure defaults', description: 'Enable security best practices by default' },
                ].map(({ id, label, description }) => (
                  <div key={id} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        id={id}
                        checked={formData[id] !== false}
                        onChange={(e) => handleChange(id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={id} className="font-medium text-gray-700 dark:text-gray-300">
                        {label}
                      </label>
                      <p className="text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'testing':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Test Framework
                </label>
                <select
                  value={formData.testFramework || 'jest'}
                  onChange={(e) => handleChange('testFramework', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="jest">Jest</option>
                  <option value="vitest">Vitest</option>
                  <option value="mocha">Mocha</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Test Coverage Target (%)
                </label>
                <input
                  type="number"
                  value={formData.testCoverage || 80}
                  onChange={(e) => handleChange('testCoverage', parseInt(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="generateTests"
                  checked={formData.generateTests !== false}
                  onChange={(e) => handleChange('generateTests', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="generateTests" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Automatically generate tests for new code
                </label>
              </div>
            </div>
          </div>
        );
        
      case 'linting':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Linting & Formatting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'enableESLint', label: 'Enable ESLint', description: 'Use ESLint for code quality' },
                  { id: 'enablePrettier', label: 'Enable Prettier', description: 'Use Prettier for code formatting' },
                  { id: 'autoFixOnSave', label: 'Auto-fix on save', description: 'Automatically fix linting issues on save' },
                  { id: 'conventionalCommits', label: 'Conventional Commits', description: 'Follow conventional commit messages' },
                  { id: 'semanticCommitMessages', label: 'Semantic Commit Messages', description: 'Enforce semantic commit messages' },
                ].map(({ id, label, description }) => (
                  <div key={id} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        id={id}
                        checked={formData[id] !== false}
                        onChange={(e) => handleChange(id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={id} className="font-medium text-gray-700 dark:text-gray-300">
                        {label}
                      </label>
                      <p className="text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'frontend', name: 'Frontend', icon: <FiMonitor className="w-5 h-5" /> },
    { id: 'backend', name: 'Backend', icon: <FiServer className="w-5 h-5" /> },
    { id: 'code-style', name: 'Code Style', icon: <FiCode className="w-5 h-5" /> },
    { id: 'code-quality', name: 'Code Quality', icon: <FiCheck className="w-5 h-5" /> },
    { id: 'testing', name: 'Testing', icon: <FiZap className="w-5 h-5" /> },
    { id: 'linting', name: 'Linting', icon: <FiLayers className="w-5 h-5" /> },
    { id: 'security', name: 'Security', icon: <FiShield className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Coding Preferences</h2>
          <button
            onClick={savePreferences}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Preferences
          </button>
        </div>
        
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AICodingPreferences;
