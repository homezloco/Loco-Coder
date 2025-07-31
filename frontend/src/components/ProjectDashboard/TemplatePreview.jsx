import React from 'react';
import { 
  FiExternalLink, 
  FiGithub, 
  FiStar, 
  FiGitBranch, 
  FiX, 
  FiCheck, 
  FiCode, 
  FiZap,
  FiClock,
  FiTag
} from 'react-icons/fi';

const TemplatePreview = ({ 
  template, 
  onSelect, 
  onClose, 
  compact = false 
}) => {
  if (!template) return null;

  const getTemplateDetails = () => {
    switch (template.id) {
      case 'web-app':
        return {
          description: 'A modern web application with React, Next.js, and Tailwind CSS',
          features: [
            'React 18 with Hooks',
            'Next.js 13+ with App Router',
            'Tailwind CSS for styling',
            'ESLint + Prettier configured',
            'Responsive design ready',
            'API routes included'
          ],
          techStack: ['react', 'nextjs', 'typescript', 'tailwindcss'],
          stars: '24.5k',
          forks: '5.2k',
          lastUpdated: '2 days ago'
        };
      case 'api':
        return {
          description: 'A production-ready API server with FastAPI and PostgreSQL',
          features: [
            'FastAPI with async support',
            'SQLAlchemy ORM',
            'JWT Authentication',
            'OpenAPI documentation',
            'PostgreSQL with migrations',
            'Docker configuration'
          ],
          techStack: ['python', 'fastapi', 'postgresql', 'docker'],
          stars: '8.7k',
          forks: '1.2k',
          lastUpdated: '1 week ago'
        };
      case 'cli':
        return {
          description: 'A command-line application built with TypeScript',
          features: [
            'TypeScript with strict mode',
            'Commander.js for CLI',
            'Chalk for styling output',
            'Jest for testing',
            'ESLint + Prettier',
            'Built-in help system'
          ],
          techStack: ['typescript', 'node', 'commander', 'jest'],
          stars: '3.2k',
          forks: '856',
          lastUpdated: '3 days ago'
        };
      default:
        return {
          description: 'A custom project template',
          features: [],
          techStack: [],
          stars: '0',
          forks: '0',
          lastUpdated: 'Just now'
        };
    }
  };

  const details = getTemplateDetails();

  const renderCompactView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              {template.icon && <span className="mr-2">{template.icon}</span>}
              {template.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {details.description}
            </p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              {details.techStack.slice(0, 3).map(tech => (
                <span 
                  key={tech}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                >
                  {tech}
                </span>
              ))}
              {details.techStack.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  +{details.techStack.length - 3} more
                </span>
              )}
            </div>
            
            <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center mr-4">
                <FiStar className="mr-1 w-3.5 h-3.5" />
                {details.stars}
              </span>
              <span className="flex items-center">
                <FiGitBranch className="mr-1 w-3.5 h-3.5" />
                {details.forks}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                Updated {details.lastUpdated}
              </span>
            </div>
          </div>
          
          {!compact && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 ml-2"
              aria-label="Close preview"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
            <FiZap className="mr-1.5 w-4 h-4 text-yellow-500" />
            Key Features
          </h4>
          <ul className="space-y-1.5">
            {details.features.slice(0, 3).map((feature, idx) => (
              <li key={idx} className="flex items-start">
                <FiCheck className="h-3.5 w-3.5 text-green-500 mt-0.5 mr-1.5 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
              </li>
            ))}
          </ul>
          
          {onSelect && (
            <button
              onClick={() => onSelect(template)}
              className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiCode className="mr-2 -ml-1 w-4 h-4" />
              Use this template
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (compact) {
    return renderCompactView();
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{template.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{details.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded-full transition-colors"
              aria-label="Close preview"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-6 border border-blue-100 dark:border-blue-900/30">
                <div className="aspect-w-16 aspect-h-9 bg-white dark:bg-gray-700 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-600">
                  <div className="w-full h-full flex items-center justify-center text-blue-200">
                    {template.icon || (
                      <div className="text-center p-4">
                        <FiCode className="mx-auto h-12 w-12 text-blue-400" />
                        <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                          {template.name} Template Preview
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      {template.category || 'General'}
                    </span>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FiStar className="mr-1 w-4 h-4 text-yellow-400" />
                      <span>{details.stars} stars</span>
                      <FiGitBranch className="ml-3 mr-1 w-4 h-4 text-gray-400" />
                      <span>{details.forks} forks</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center">
                    <FiClock className="mr-1 w-3.5 h-3.5" />
                    Updated {details.lastUpdated}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <FiZap className="mr-2 w-5 h-5 text-yellow-500" />
                  Key Features
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {details.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          <FiCheck className="h-3 w-3" />
                        </div>
                      </div>
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <FiTag className="mr-2 w-5 h-5 text-blue-500" />
                  Template Details
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {details.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Popularity
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <div className="p-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 mr-2">
                          <FiStar className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{details.stars}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Stars</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="p-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 mr-2">
                          <FiGitBranch className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{details.forks}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Forks</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Last Updated
                    </h4>
                    <div className="flex items-center">
                      <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mr-3">
                        <FiClock className="h-4 w-4 text-gray-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {details.lastUpdated}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => onSelect && onSelect(template)}
                    className="w-full flex justify-center items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <FiCode className="-ml-1 mr-2 h-4 w-4" />
                    Use this template
                  </button>
                  
                  <button
                    type="button"
                    className="w-full flex justify-center items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <FiGithub className="-ml-1 mr-2 h-4 w-4" />
                    View on GitHub
                  </button>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400 dark:text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Need help getting started?
                    </h3>
                    <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      <p>
                        Check out our documentation for guides, tutorials, and API references.
                      </p>
                    </div>
                    <div className="mt-4">
                      <a
                        href="#"
                        className="inline-flex items-center text-sm font-medium text-amber-700 dark:text-amber-200 hover:text-amber-600 dark:hover:text-amber-100"
                      >
                        View documentation
                        <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSelect && onSelect(template)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FiCode className="-ml-1 mr-2 h-4 w-4" />
              Create project with this template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
