import React from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiTrash2, FiClock, FiFolder, FiCode, FiDatabase, FiGlobe, FiFile } from 'react-icons/fi';

const ProjectCard = ({ 
  project, 
  onSelect, 
  onToggleFavorite, 
  onDeleteClick, 
  isDarkMode 
}) => {
  const getProjectIcon = (type) => {
    switch (type) {
      case 'web':
        return <FiGlobe className="h-5 w-5 text-blue-500" />;
      case 'api':
        return <FiCode className="h-5 w-5 text-green-500" />;
      case 'data':
        return <FiDatabase className="h-5 w-5 text-purple-500" />;
      default:
        return <FiFile className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        isDarkMode 
          ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' 
          : 'bg-white hover:bg-gray-50 border-gray-200'
      } border shadow-sm`}
      onClick={() => onSelect(project)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            {getProjectIcon(project.type)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {project.description}
              </p>
            )}
            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <FiClock className="mr-1" />
              <span>
                {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {project.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className={`text-xs px-2 py-1 rounded-full ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
              +{project.tags.length - 3} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ProjectCard;
