import React, { useEffect, useRef } from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const statusIcons = {
  starting: <FiLoader className="animate-spin text-blue-500" />,
  generating: <FiLoader className="animate-spin text-blue-500" />,
  success: <FiCheck className="text-green-500" />,
  error: <FiX className="text-red-500" />,
  warning: <FiAlertTriangle className="text-yellow-500" />
};

const statusColors = {
  starting: 'text-blue-500',
  generating: 'text-blue-500',
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500'
};

const ProjectGenerationProgress = ({ 
  isOpen, 
  status = 'starting', 
  message = '',
  progress = 0,
  total = 1,
  logs = [],
  onClose,
  onRetry
}) => {
  const logsEndRef = useRef(null);
  
  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  if (!isOpen) return null;
  
  const progressPercent = Math.min(100, Math.max(0, (progress / total) * 100));
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {status === 'success' ? 'Project Created!' : 'Creating Project...'}
            </h2>
            {status !== 'generating' && status !== 'starting' && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <FiX className="h-6 w-6" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              {statusIcons[status] || statusIcons.starting}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${statusColors[status] || 'text-gray-700 dark:text-gray-300'}`}>
                {message || 'Initializing project generation...'}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <motion.div 
                  className="h-full bg-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {status === 'success' ? 'Complete!' : `${progress} of ${total} ${total === 1 ? 'item' : 'items'}`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`text-sm p-2 rounded ${
                  log.status === 'error' 
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <span className="flex-shrink-0 text-gray-500 dark:text-gray-500 mr-2">
                    {statusIcons[log.status] || '•'}
                  </span>
                  <span>{log.message}</span>
                </div>
                {log.error && (
                  <div className="mt-1 text-xs text-red-500 dark:text-red-400 pl-6">
                    {log.error}
                  </div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          {status === 'error' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </>
          ) : status === 'success' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Open Project
            </button>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              This may take a moment...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectGenerationProgress;
