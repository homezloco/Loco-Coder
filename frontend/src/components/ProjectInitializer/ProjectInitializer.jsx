import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { FiSend, FiX, FiCode, FiZap, FiCheck, FiEdit2, FiLoader } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import api from '../../api';

// Project creation flow steps
const STEPS = {
  DESCRIPTION: 'description',
  PROPOSAL: 'proposal',
  CONFIRMATION: 'confirmation',
  CREATING: 'creating'
};

const ProjectInitializer = ({ onProjectInitialized, onCancel, isDarkMode }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.DESCRIPTION);
  const [projectDescription, setProjectDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectPlan, setProjectPlan] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('web');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi there! I'm your AI assistant. Describe the project you'd like to create, and I'll help set up the perfect development environment for you.\n\nFor example:\n\n- A React dashboard with charts and tables\n- A Python Flask API with MongoDB\n- A full-stack MERN application\n\nWhat would you like to build?",
      isAI: true,
      timestamp: new Date().toISOString(),
    },
  ]);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const theme = useTheme();

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [projectDescription]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle project description submission
  const handleDescriptionSubmit = async (e) => {
    e.preventDefault();
    if (!projectDescription.trim()) return;

    const userMessage = {
      id: uuidv4(),
      text: projectDescription,
      isAI: false,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setProjectDescription('');
    setIsGenerating(true);

    try {
      // Generate a project name from description
      const generatedName = `My ${projectDescription.split(' ')[0]} Project`;
      setProjectName(generatedName);

      // Generate project plan using AI service
      const plan = await generateProjectPlan(projectDescription);
      setProjectPlan(plan);

      // Show proposal to user
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          text: `I've created a plan for your project. Here's what I'll create:\n\n- **Project Name**: ${generatedName}\n- **Type**: ${plan.type || 'Web Application'}\n- **Description**: ${plan.description || projectDescription}\n\n**Project Structure**:\n${plan.structure?.map(item => `- ${item}`).join('\n') || '- Basic project structure'}\n\nWould you like to proceed with this setup?`,
          isAI: true,
          timestamp: new Date().toISOString(),
          isProposal: true,
          plan: plan
        }
      ]);
      
      setCurrentStep(STEPS.PROPOSAL);
    } catch (error) {
      console.error('Error generating project plan:', error);
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          text: 'Sorry, I encountered an error while planning your project. Please try again with a different description.',
          isAI: true,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate project plan using AI service
  const generateProjectPlan = async (description) => {
    try {
      // This would be an API call to your backend AI service
      // For now, we'll simulate a response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            name: `My ${description.split(' ')[0]} Project`,
            description: `A new project for: ${description}`,
            type: 'web',
            structure: [
              'src/',
              'src/index.js',
              'src/App.js',
              'src/styles/',
              'public/',
              'public/index.html',
              'package.json',
              'README.md',
              '.gitignore'
            ],
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
              'react-scripts': '5.0.1'
            },
            scripts: {
              start: 'react-scripts start',
              build: 'react-scripts build',
              test: 'react-scripts test',
              eject: 'react-scripts eject'
            }
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Error generating project plan:', error);
      throw error;
    }
  };

  // Handle project confirmation
  const handleConfirmProject = async () => {
    setCurrentStep(STEPS.CREATING);
    setIsGenerating(true);
    
    try {
      // Create project using the API
      const projectData = {
        name: projectName,
        description: projectPlan.description || projectDescription,
        project_type: projectType,
        config: {
          structure: projectPlan.structure,
          dependencies: projectPlan.dependencies,
          scripts: projectPlan.scripts
        }
      };

      // Call the API to create the project
      const response = await api.projects.create(projectData);
      
      // Notify parent component
      onProjectInitialized({
        ...response,
        files: [
          {
            name: 'README.md',
            content: `# ${projectName}\n\n${projectPlan.description || projectDescription}\n\n## Getting Started\n\n1. Install dependencies: \`npm install\`\n2. Start development server: \`npm start\`\n\n## Project Structure\n${projectPlan.structure?.map(item => `- ${item}`).join('\n')}`
          },
          {
            name: 'package.json',
            content: JSON.stringify({
              name: projectName.toLowerCase().replace(/\s+/g, '-'),
              version: '1.0.0',
              private: true,
              dependencies: projectPlan.dependencies || {},
              scripts: projectPlan.scripts || {}
            }, null, 2)
          }
        ]
      });
      
    } catch (error) {
      console.error('Error creating project:', error);
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          text: 'Sorry, I encountered an error while creating your project. Please try again.',
          isAI: true,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
      setCurrentStep(STEPS.PROPOSAL);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle edit project details
  const handleEditProject = () => {
    setCurrentStep(STEPS.DESCRIPTION);
  };

  // Handle form submission based on current step
  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep === STEPS.DESCRIPTION) {
      handleDescriptionSubmit(e);
    } else if (currentStep === STEPS.PROPOSAL) {
      handleConfirmProject();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900/80' : 'bg-black/50'}`}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`relative w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-2">
            <FiZap className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold">Initialize New Project</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.isAI
                    ? isDarkMode
                      ? 'bg-gray-700/50 text-gray-100'
                      : 'bg-gray-100 text-gray-800'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {message.text.split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {paragraph || <br />}
                  </p>
                ))}
                
                {message.isProposal && (
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={handleConfirmProject}
                      disabled={isGenerating}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      } transition-colors`}
                    >
                      <FiCheck />
                      <span>Looks good, create project</span>
                    </button>
                    <button
                      onClick={handleEditProject}
                      disabled={isGenerating}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <FiEdit2 size={14} />
                      <span>Edit project details</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isGenerating && currentStep === STEPS.CREATING ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                <FiLoader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={24} />
              </div>
              <p className="text-lg font-medium">Creating your project...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
            </div>
          ) : isGenerating ? (
            <div className="flex items-center justify-center space-x-2 p-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null}
          
          <div ref={messagesEndRef} />
        </div>

        {currentStep === STEPS.DESCRIPTION && (
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700/50">
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe your project..."
                  className={`w-full p-3 pr-10 rounded-lg resize-none max-h-40 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'
                  } border focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                  rows={1}
                  disabled={isGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!projectDescription.trim() || isGenerating}
                  className={`absolute right-2 bottom-2 p-1.5 rounded-md ${
                    projectDescription.trim() && !isGenerating
                      ? 'text-blue-500 hover:bg-blue-500/10'
                      : isDarkMode
                      ? 'text-gray-500'
                      : 'text-gray-400'
                  }`}
                >
                  <FiSend size={20} />
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {isGenerating ? 'Analyzing your project...' : 'Press Enter to send, Shift+Enter for new line'}
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ProjectInitializer;
