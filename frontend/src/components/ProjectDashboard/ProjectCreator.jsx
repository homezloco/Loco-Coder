import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiZap, FiCode, FiDatabase, FiGlobe, FiFile, FiChevronRight, FiInfo } from 'react-icons/fi';
import TemplatePreview from './TemplatePreview';

const templates = [
  {
    id: 'web',
    name: 'Web App',
    description: 'Create a modern web application',
    icon: <FiGlobe className="w-6 h-6 text-blue-500" />,
    category: 'web',
    tags: ['react', 'nextjs', 'html', 'css']
  },
  {
    id: 'api',
    name: 'API Server',
    description: 'Build a REST or GraphQL API',
    icon: <FiDatabase className="w-6 h-6 text-green-500" />,
    category: 'backend',
    tags: ['node', 'express', 'python', 'fastapi']
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Create a reusable code library',
    icon: <FiCode className="w-6 h-6 text-purple-500" />,
    category: 'library',
    tags: ['typescript', 'javascript', 'python']
  },
  {
    id: 'cli',
    name: 'CLI Tool',
    description: 'Build a command-line application',
    icon: <FiFile className="w-6 h-6 text-yellow-500" />,
    category: 'cli',
    tags: ['node', 'python', 'go', 'rust']
  }
];

const ProjectCreator = ({ isOpen, onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
  );

  const handleCreate = async () => {
    console.log('ProjectCreator: Starting project creation');
    
    // Validate input
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      console.error('Project name is required');
      showErrorToast('Project name is required');
      return;
    }
    
    setIsCreating(true);
    
    try {
      console.log('Creating project with template:', selectedTemplate);
      
      // Get default files based on template or use empty array
      const getDefaultFiles = () => {
        if (selectedTemplate?.id === 'web') {
          return [
            {
              path: 'index.html',
              content: `<!DOCTYPE html>
<html>
<head>
  <title>${trimmedName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Welcome to ${trimmedName}</h1>
  <div id="app">
    <p>${projectDescription || 'Start building your amazing project!'}</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`
            },
            {
              path: 'styles.css',
              content: `/* ${trimmedName} - Main Styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #333;
  background-color: #fff;
}

h1 {
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}`
            },
            {
              path: 'app.js',
              content: `// ${trimmedName} - Main JavaScript
console.log("${trimmedName} initialized!");

// Add your JavaScript here
document.addEventListener('DOMContentLoaded', () => {
  console.log('${trimmedName} is ready!');
});`
            },
            {
              path: 'README.md',
              content: `# ${trimmedName}

## Description
${projectDescription || 'A new project created with Coder AI'}

## Getting Started
1. Open index.html in your browser
2. Start coding!

## Project Structure
- \`index.html\`: Main HTML file
- \`styles.css\`: CSS styles
- \`app.js\`: JavaScript code`
            }
          ];
        }
        return [];
      };
      
      // Prepare project data with validation
      const projectData = {
        id: `project_${Date.now()}`,
        name: trimmedName,
        description: projectDescription.trim() || 'A new project created with Coder AI',
        template: selectedTemplate?.id || 'custom',
        category: selectedTemplate?.category || 'other',
        tags: [...new Set([
          ...(selectedTemplate?.tags || []), 
          ...selectedTags
        ].filter(Boolean))],
        files: getDefaultFiles(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
        metadata: {
          createdWith: 'Coder AI',
          version: '1.0.0',
          template: selectedTemplate?.id || 'custom'
        }
      };
      
      console.log('Project data prepared:', projectData);
      
      // Call the parent's onCreate handler
      const result = await onCreate(projectData);
      
      if (!result) {
        throw new Error('Project creation returned no result');
      }
      
      console.log('Project created successfully, closing creator');
      showSuccessToast(`Project "${trimmedName}" created successfully!`);
      onClose();
    } catch (error) {
      console.error('Error in ProjectCreator.handleCreate:', {
        error: error.message,
        stack: error.stack,
        projectName: projectName,
        selectedTemplate: selectedTemplate?.id
      });
      
      // Don't close on error - let the error toast show and allow retry
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    // Auto-advance to next step if not already there
    if (step === 1) setStep(2);
  };
  
  const togglePreview = (e) => {
    e.stopPropagation();
    setShowPreview(!showPreview);
  };

  const resetForm = () => {
    setStep(1);
    setSearchQuery('');
    setSelectedTemplate(null);
    setProjectName('');
    setProjectDescription('');
    setSelectedTags([]);
    setShowPreview(false);
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal is closed
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-black opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {step === 1 ? 'Create a new project' : 'Project details'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
                aria-label="Close"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 ? (
              <>
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          {template.icon}
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {template.name}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTemplate(template);
                                setShowPreview(true);
                              }}
                              className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400"
                              aria-label="Preview template"
                            >
                              <FiInfo className="w-5 h-5" />
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {template.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag) => (
                              <span 
                                key={tag} 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                              >
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                +{template.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <button
                            onClick={togglePreview}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                          >
                            {showPreview ? 'Hide preview' : 'Show preview'}
                            <FiChevronRight className={`ml-1 w-3 h-3 transition-transform ${showPreview ? 'transform rotate-90' : ''}`} />
                          </button>
                          {showPreview && selectedTemplate.id === template.id && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                              <TemplatePreview 
                                template={selectedTemplate} 
                                onSelect={() => {}}
                                onClose={() => setShowPreview(false)}
                                compact={true}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project name
                  </label>
                  <input
                    type="text"
                    id="project-name"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="my-awesome-project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description (optional)
                  </label>
                  <textarea
                    id="project-description"
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="What's this project about?"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                </div>

                {selectedTemplate?.tags && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            selectedTags.includes(tag)
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => {
                            setSelectedTags(prev =>
                              prev.includes(tag)
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            );
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between flex-shrink-0">
            {step === 2 && (
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setStep(1)}
              >
                Back
              </button>
            )}
            <div className="ml-auto">
              {step === 1 ? (
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={!selectedTemplate}
                  onClick={() => setStep(2)}
                >
                  Next
                  <FiChevronRight className="ml-2 -mr-1 h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={!projectName.trim() || isCreating}
                  onClick={handleCreate}
                >
                  {isCreating ? 'Creating...' : 'Create project'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreator;
