import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiZap, FiCode, FiDatabase, FiGlobe, FiFile, FiChevronRight, FiInfo, FiCheck, FiEdit } from 'react-icons/fi';
import TemplatePreview from './TemplatePreview';
import ProjectGenerator from '../../services/projectGenerator';
import { generateProjectPlan } from '../../services/aiService';

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
  
  // New states for enhanced workflow
  const [projectIdea, setProjectIdea] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ status: '', message: '' });
  const [editMode, setEditMode] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState(null);
  const [generatedArchitecture, setGeneratedArchitecture] = useState(null);
  const [generatedFramework, setGeneratedFramework] = useState(null);

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
  );

  // Generate project plan from user idea
  const handleGeneratePlan = async () => {
    if (!projectIdea.trim()) {
      // Show error toast or validation message
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress({ status: 'starting', message: 'Analyzing your project idea...' });

    try {
      // Call AI service to generate project plan
      const plan = await generateProjectPlan(projectIdea, selectedTemplate?.id);
      
      setGeneratedPlan(plan);
      setProjectName(plan.projectName || '');
      setProjectDescription(plan.projectDescription || '');
      setGeneratedLogo(plan.logo || null);
      setGeneratedArchitecture(plan.architecture || null);
      setGeneratedFramework(plan.framework || null);
      
      // Auto-select tags based on generated plan
      if (plan.tags && selectedTemplate) {
        const validTags = plan.tags.filter(tag => selectedTemplate.tags.includes(tag));
        setSelectedTags(validTags);
      }
      
      setGenerationProgress({ status: 'success', message: 'Project plan generated successfully!' });
      setStep(3); // Move to plan review step
    } catch (error) {
      console.error('Error generating project plan:', error);
      setGenerationProgress({ 
        status: 'error', 
        message: error.message || 'Failed to generate project plan' 
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleCreate = async () => {
    console.log('ProjectCreator: Starting project creation');
    
    // Validate input
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      console.error('Project name is required');
      // Show error toast
      return;
    }
    
    setIsCreating(true);
    setGenerationProgress({ status: 'starting', message: 'Creating your project...' });
    
    try {
      console.log('Creating project with template:', selectedTemplate);
      
      // Use the generated plan or create a default structure
      const projectInfo = {
        name: trimmedName,
        description: projectDescription,
        template: selectedTemplate?.id,
        tags: selectedTags,
        metadata: {
          idea: projectIdea,
          framework: generatedFramework,
          architecture: generatedArchitecture,
          logo: generatedLogo
        }
      };
      
      // Use the ProjectGenerator service to create the project
      const project = await ProjectGenerator.generateProject(
        projectInfo, 
        generatedPlan || { projectDescription, structure: {} },
        (progress) => {
          setGenerationProgress(progress);
        }
      );
      
      // Call the onCreate callback with the generated project
      onCreate(project);
      
      // Reset the form
      resetForm();
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      setGenerationProgress({ 
        status: 'error', 
        message: error.message || 'Failed to create project' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setSelectedTags([]); // Reset tags when template changes
  };

  const togglePreview = (e) => {
    e.preventDefault();
    setShowPreview(!showPreview);
  };

  const resetForm = () => {
    setStep(1);
    setSearchQuery('');
    setSelectedTemplate(null);
    setShowPreview(false);
    setProjectName('');
    setProjectDescription('');
    setSelectedTags([]);
    setProjectIdea('');
    setGeneratedPlan(null);
    setIsGeneratingPlan(false);
    setGenerationProgress({ status: '', message: '' });
    setEditMode(false);
    setGeneratedLogo(null);
    setGeneratedArchitecture(null);
    setGeneratedFramework(null);
  };

  // If the modal is closed, reset the form
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {step === 1 && 'Select Project Template'}
            {step === 2 && 'Describe Your Project Idea'}
            {step === 3 && 'Review Project Plan'}
            {step === 4 && 'Project Details'}
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Template Selection */}
          {step === 1 && (
            <div>
              <div className="mb-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center">
                      {template.icon}
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 2: Project Idea Input */}
          {step === 2 && (
            <div>
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <div className="flex">
                  <FiInfo className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Describe your project idea
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                      <p>
                        Be as specific as possible. Include details about:
                      </p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>What problem your project solves</li>
                        <li>Target users or audience</li>
                        <li>Key features or functionality</li>
                        <li>Technology preferences (if any)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="project-idea" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Project Idea
                </label>
                <textarea
                  id="project-idea"
                  rows="6"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe your project idea in detail..."
                  value={projectIdea}
                  onChange={(e) => setProjectIdea(e.target.value)}
                />
              </div>
              
              {isGeneratingPlan && (
                <div className="mt-6">
                  <div className="flex items-center">
                    <div className="mr-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {generationProgress.message || 'Generating project plan...'}
                    </p>
                  </div>
                </div>
              )}
              
              {generationProgress.status === 'error' && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FiInfo className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                        Error generating project plan
                      </h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                        <p>{generationProgress.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Review Generated Plan */}
          {step === 3 && generatedPlan && (
            <div>
              <div className="mb-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                <div className="flex">
                  <FiCheck className="h-5 w-5 text-green-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                      Project plan generated successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-200">
                      <p>
                        Review the generated plan below. You can make adjustments if needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Project Name */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Project Name
                  </h3>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 text-sm flex items-center"
                    onClick={() => setEditMode(!editMode)}
                  >
                    <FiEdit className="h-4 w-4 mr-1" />
                    {editMode ? 'Done' : 'Edit'}
                  </button>
                </div>
                
                {editMode ? (
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 text-xl font-semibold">
                    {projectName}
                  </p>
                )}
              </div>
              
              {/* Project Logo */}
              {generatedLogo && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Project Logo
                  </h3>
                  <div className="flex justify-center p-4 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                    {generatedLogo.type === 'svg' ? (
                      <div dangerouslySetInnerHTML={{ __html: generatedLogo.content }} />
                    ) : (
                      <img 
                        src={generatedLogo.content} 
                        alt="Project Logo" 
                        className="h-32 w-32 object-contain" 
                      />
                    )}
                  </div>
                </div>
              )}
              
              {/* Project Description */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Project Description
                </h3>
                {editMode ? (
                  <textarea
                    rows="4"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    {projectDescription}
                  </p>
                )}
              </div>
              
              {/* Framework */}
              {generatedFramework && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Framework & Technologies
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    {editMode ? (
                      <textarea
                        rows="3"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        value={generatedFramework}
                        onChange={(e) => setGeneratedFramework(e.target.value)}
                      />
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300">
                        {generatedFramework}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Architecture */}
              {generatedArchitecture && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Architecture
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    {editMode ? (
                      <textarea
                        rows="6"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        value={generatedArchitecture}
                        onChange={(e) => setGeneratedArchitecture(e.target.value)}
                      />
                    ) : (
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {generatedArchitecture}
                      </pre>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tags */}
              {selectedTemplate?.tags && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Tags
                  </h3>
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
          
          {/* Step 4: Project Details (Original form) */}
          {step === 4 && (
            <div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="project-name"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="My Awesome Project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
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
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between flex-shrink-0">
          {step > 1 && (
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setStep(step - 1)}
              disabled={isGeneratingPlan || isCreating}
            >
              Back
            </button>
          )}
          <div className="ml-auto">
            {step === 1 && (
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={!selectedTemplate}
                onClick={() => setStep(2)}
              >
                Next
                <FiChevronRight className="ml-2 -mr-1 h-5 w-5" />
              </button>
            )}
            
            {step === 2 && (
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={!projectIdea.trim() || isGeneratingPlan}
                onClick={handleGeneratePlan}
              >
                {isGeneratingPlan ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Plan
                    <FiZap className="ml-2 -mr-1 h-5 w-5" />
                  </>
                )}
              </button>
            )}
            
            {step === 3 && (
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={!projectName.trim() || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
            )}
            
            {step === 4 && (
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
  );
};

export default ProjectCreator;
