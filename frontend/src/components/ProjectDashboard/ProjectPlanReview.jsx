import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiFolder, FiFile, FiChevronDown, FiChevronRight, FiImage } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { generateProjectName, generateProjectLogo } from '../../services/aiService';

// Helper function to count files in the project structure
const countFiles = (structure = []) => {
  if (!structure) return 0;
  
  // Handle both array and object structures
  const items = Array.isArray(structure) 
    ? structure 
    : Object.values(structure || {});
    
  if (!items.length) return 0;
  
  return items.reduce((count, item) => {
    if (!item) return count;
    
    if (item.type === 'file') {
      return count + 1;
    } else if (item.children) {
      return count + countFiles(item.children);
    }
    return count;
  }, 0);
};

// Helper function to count folders in the project structure
const countFolders = (structure = []) => {
  if (!structure) return 0;
  
  // Handle both array and object structures
  const items = Array.isArray(structure) 
    ? structure 
    : Object.values(structure || {});
    
  if (!items.length) return 0;
  
  return items.reduce((count, item) => {
    if (!item) return count;
    
    if (item.type === 'directory') {
      return count + 1 + (item.children ? countFolders(item.children) : 0);
    } else if (item.children) {
      return count + countFolders(item.children);
    }
    return count;
  }, 0);
};

const FileTree = ({ structure, level = 0 }) => {
  const [expanded, setExpanded] = useState({});

  // Handle null or undefined structure
  if (!structure) {
    return (
      <div className="text-gray-500 dark:text-gray-400 italic">
        No project structure available
      </div>
    );
  }

  // Handle case where structure is an array
  const structureToRender = Array.isArray(structure) 
    ? structure.reduce((acc, item, index) => ({
        ...acc,
        [`item-${index}`]: item
      }), {})
    : structure;

  const toggleExpand = (path) => {
    setExpanded(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  return (
    <div className={`${level > 0 ? 'ml-4 border-l border-gray-200 dark:border-gray-700 pl-2' : ''}`}>
      {Object.entries(structureToRender).map(([name, value]) => {
        const isDirectory = typeof value === 'object' && value !== null;
        const path = `${level}-${name}`;
        const isExpanded = expanded[path];
        
        return (
          <div key={path} className="py-1">
            <div 
              className="flex items-center py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
              onClick={() => isDirectory && toggleExpand(path)}
            >
              <span className="mr-1 text-gray-500">
                {isDirectory ? (
                  isExpanded ? <FiChevronDown /> : <FiChevronRight />
                ) : null}
              </span>
              <span className="mr-2">
                {isDirectory ? 
                  <FiFolder className="text-blue-500" /> : 
                  <FiFile className="text-gray-400" />
                }
              </span>
              <span className={`text-sm ${isDirectory ? 'font-medium' : ''}`}>
                {name}
              </span>
            </div>
            
            {isDirectory && isExpanded && (
              <div className="mt-1">
                <FileTree structure={value} level={level + 1} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ProjectPlanReview = ({ 
  plan, 
  onConfirm, 
  onBack,
  onClose,
  isGenerating = false,
  aiService // Add aiService as a prop
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [logo, setLogo] = useState(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  
  // Provide default values for plan
  const safePlan = plan || {};
  
  // Generate project name if not provided
  const projectName = safePlan.projectName || 'My Awesome Project';
  
  // Generate or load the project logo
  useEffect(() => {
    const generateLogo = async () => {
      // If logo already exists in the plan, use it
      if (plan.logo) {
        setLogo(plan.logo);
        return;
      }
      
      try {
        setIsGeneratingLogo(true);
        
        // Even if aiService is not available, the generateProjectLogo function now handles fallbacks
        // so we don't need to check for aiService availability here
        const logoData = await generateProjectLogo(
          projectName, 
          plan.projectDescription || '',
          aiService // This can be null/undefined and will still work with fallbacks
        );
        
        // Set the logo data from either AI or fallback
        setLogo(logoData);
        
        // If this is a fallback logo, log it but don't show error to user
        if (logoData.isFallback) {
          console.log('Using fallback logo generation');
        }
      } catch (error) {
        console.error('Error generating logo:', error);
        // Even if there's an error, we'll still provide a fallback logo
        const fallbackLogo = {
          type: 'svg',
          content: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" rx="40" fill="#4A90E2" opacity="0.9"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${projectName.charAt(0).toUpperCase()}</text>
          </svg>`,
          concept: 'Simple initial logo',
          isFallback: true
        };
        setLogo(fallbackLogo);
      } finally {
        setIsGeneratingLogo(false);
      }
    };
    
    generateLogo();
  }, [plan.logo, projectName, plan.projectDescription]);
  
  if (!plan) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 flex-1 overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Review Project Plan
            </h2>
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isGenerating}
            >
              <FiX size={24} />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {isGeneratingLogo ? (
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                    <FiImage className="text-gray-400" />
                  </div>
                ) : logo ? (
                  <div 
                    className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: logo.content }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {projectName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                  {projectName}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                  {plan.projectDescription || plan.description || 'A new project created with Windsurf AI'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">
              {['overview', 'structure', 'architecture', 'dependencies', 'features'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="min-h-[300px]">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Project Overview
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</h5>
                        <p className="text-gray-900 dark:text-white">{projectName}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generated</h5>
                        <p className="text-gray-900 dark:text-white">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</h5>
                        <p className="text-gray-900 dark:text-white">
                          {plan.projectDescription || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Quick Stats
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Files</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {countFiles(plan.structure)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Folders</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {countFolders(plan.structure)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Dependencies</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Object.values(plan.dependencies || {}).reduce((sum, deps) => sum + deps.length, 0)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Features</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan.features?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Preview
                  </h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                      <div className="text-center p-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
                          {projectName.substring(0, 2).toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{projectName}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                          {plan.projectDescription?.substring(0, 60) || 'A new project generated with Windsurf AI'}
                          {plan.projectDescription?.length > 60 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'structure' && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Project Structure
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <FileTree structure={plan.structure} />
                </div>
              </div>
            )}
            
            {activeTab === 'architecture' && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  System Architecture
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
                  {plan.architecture}
                </div>
              </div>
            )}
            
            {activeTab === 'dependencies' && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Dependencies
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(plan.dependencies || {}).map(([category, deps]) => (
                    <div key={category} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        {category}
                      </h5>
                      <ul className="space-y-1">
                        {deps.map((dep, i) => (
                          <li key={i} className="text-sm text-gray-600 dark:text-gray-300">
                            • {dep}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'features' && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Key Features
                </h4>
                <ul className="space-y-3">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <FiCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isGenerating}
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center ${
                isGenerating ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Project...
                </>
              ) : (
                <>
                  <FiCheck className="mr-2" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPlanReview;
