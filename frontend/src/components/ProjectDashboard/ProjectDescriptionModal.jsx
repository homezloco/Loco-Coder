import React, { useState, useEffect } from 'react';
import { FiX, FiHelpCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

const ProjectDescriptionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false, 
  error = null,
  onRetry = null
}) => {
  const [description, setDescription] = useState('');
  const [localIsSubmitting, setLocalIsSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // Reset error state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setShowError(!!error);
    }
  }, [isOpen, error]);
  
  // Handle external loading state changes
  useEffect(() => {
    setLocalIsSubmitting(isLoading);
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || localIsSubmitting) return;
    
    setShowError(false);
    setLocalIsSubmitting(true);
    
    try {
      await onSubmit(description);
    } catch (error) {
      console.error('Error in ProjectDescriptionModal submit:', error);
      setShowError(true);
      throw error; // Re-throw to allow parent component to handle
    } finally {
      setLocalIsSubmitting(false);
    }
  };
  
  const handleRetry = () => {
    if (onRetry && description) {
      onRetry();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Project
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Describe your project
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Be specific about the type of application, features, and technologies you want to use.
                The AI will generate a detailed project plan based on your description.
              </p>
              <div className="relative">
                <textarea
                  id="project-description"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Example: A React e-commerce site with product listings, shopping cart, and user authentication using Firebase..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                  {description.length}/1000
                </div>
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <FiHelpCircle className="mr-1" />
                <span>Tip: The more details you provide, the better the AI can tailor your project.</span>
              </div>
            </div>
            
            {/* Error message */}
            {showError && error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-start">
                <FiAlertCircle className="flex-shrink-0 h-5 w-5 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">{error.title || 'Error'}</p>
                  <p className="text-sm">{error.message || 'Failed to generate project plan. Please try again.'}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-2 inline-flex items-center text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
                      disabled={localIsSubmitting}
                    >
                      <FiRefreshCw className={`mr-1 h-4 w-4 ${localIsSubmitting ? 'animate-spin' : ''}`} />
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={localIsSubmitting}
              >
                {error ? 'Close' : 'Cancel'}
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors ${
                  localIsSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={!description.trim() || localIsSubmitting}
              >
                {localIsSubmitting ? (
                  <span className="flex items-center">
                    <FiRefreshCw className="animate-spin mr-2 h-4 w-4" />
                    Generating...
                  </span>
                ) : 'Generate Project Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectDescriptionModal;
