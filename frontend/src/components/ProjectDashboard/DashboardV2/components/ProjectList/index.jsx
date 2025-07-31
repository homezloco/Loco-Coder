import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiTrash2, FiClock } from 'react-icons/fi';
import ProjectCard from '../ProjectCard';

const ProjectList = ({ 
  projects, 
  onSelect, 
  onToggleFavorite, 
  onDeleteClick, 
  isDarkMode 
}) => {
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
          <FiClock className="h-full w-full opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No projects found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first project to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {projects.map((project) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className={`p-4 rounded-lg cursor-pointer ${
                isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              } border border-gray-200 dark:border-gray-700`}
              onClick={() => onSelect(project)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium truncate">
                      {project.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {project.language || 'JavaScript'}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm mt-1 text-gray-500 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(project.id);
                    }}
                    className="p-1 rounded-full hover:bg-opacity-20 hover:bg-gray-500"
                    aria-label={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <FiStar 
                      className={`h-5 w-5 ${
                        project.isFavorite 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : isDarkMode 
                            ? 'text-gray-500' 
                            : 'text-gray-300'
                      }`} 
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(project, e);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500 hover:bg-opacity-10"
                    aria-label="Delete project"
                  >
                    <FiTrash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center mt-4 text-sm">
                {project.tags?.slice(0, 3).map((tag, index) => (
                  <span 
                    key={index}
                    className="mr-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {tag}
                  </span>
                ))}
                {project.tags?.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{project.tags.length - 3} more
                  </span>
                )}
                
                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <FiClock className="mr-1 h-3 w-3" />
                  <span>
                    Updated {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ProjectList;
