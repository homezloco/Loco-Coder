import React from 'react';
import { FiZap, FiCode, FiGlobe, FiDatabase, FiGithub, FiYoutube } from 'react-icons/fi';

const WelcomeScreen = ({ onCreateProject, isDarkMode }) => {
  const quickStarts = [
    {
      title: 'Web App',
      description: 'Start a new React, Vue, or Svelte project',
      icon: <FiGlobe className="w-6 h-6 text-blue-500" />,
      template: 'web-app',
      category: 'web'
    },
    {
      title: 'API Server',
      description: 'Build a REST or GraphQL API',
      icon: <FiDatabase className="w-6 h-6 text-green-500" />,
      template: 'api-server',
      category: 'backend'
    },
    {
      title: 'CLI Tool',
      description: 'Create a command-line application',
      icon: <FiCode className="w-6 h-6 text-purple-500" />,
      template: 'cli',
      category: 'cli'
    },
    {
      title: 'Library',
      description: 'Build a reusable code library',
      icon: <FiGithub className="w-6 h-6 text-yellow-500" />,
      template: 'library',
      category: 'library'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Welcome to Coder
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
          Let's build something amazing together
        </p>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick start</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {quickStarts.map((item) => (
            <button
              key={item.template}
              onClick={() => onCreateProject({ template: item.template })}
              className={`flex flex-col items-center p-6 rounded-xl border-2 border-dashed ${
                isDarkMode 
                  ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-800/50' 
                  : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              } transition-colors duration-200`}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Get started</h2>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiZap className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Create your first project
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Start from a template or import an existing project
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => onCreateProject()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Learn more</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="#"
            className="flex items-start p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex-shrink-0">
              <FiYoutube className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Video Tutorials</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Watch our getting started guides
              </p>
            </div>
          </a>
          <a
            href="#"
            className="flex items-start p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex-shrink-0">
              <FiCode className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Documentation</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Learn how to use all features
              </p>
            </div>
          </a>
          <a
            href="#"
            className="flex items-start p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex-shrink-0">
              <FiGithub className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Examples</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Explore sample projects
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
