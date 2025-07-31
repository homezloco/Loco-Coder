import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiStar, 
  FiMoreVertical, 
  FiTrash2, 
  FiEdit2, 
  FiGitBranch, 
  FiClock,
  FiCode
} from 'react-icons/fi';
import { 
  FaJs, 
  FaPython, 
  FaJava, 
  FaRust, 
  FaHtml5, 
  FaCss3, 
  FaReact 
} from 'react-icons/fa';
import { 
  SiTypescript, 
  SiGo, 
  SiCplusplus, 
  SiCsharp 
} from 'react-icons/si';

/**
 * Individual project card component with modern design and smooth animations
 */
const ProjectCard = ({ 
  project, 
  onSelect, 
  onToggleFavorite, 
  onDelete,
  isDarkMode = false,
  isSelected = false,
  isDragging = false,
  isCustomizing = false
}) => {
  // State for hover and interaction effects
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format the last modified date with relative time
  const formatLastModified = useCallback((dateString) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `Today at ${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)} weeks ago`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Recently';
    }
  }, []);

  // Get language color with proper contrast
  const getLanguageColor = useCallback((language) => {
    if (!language) return { main: '#607D8B', light: '#CFD8DC', dark: '#455A64', text: '#FFFFFF' };
    
    const colors = {
      javascript: { main: '#F7DF1E', light: '#FFF9C4', dark: '#E6C60D', text: '#000000' },
      js: { main: '#F7DF1E', light: '#FFF9C4', dark: '#E6C60D', text: '#000000' },
      typescript: { main: '#3178C6', light: '#BBDEFB', dark: '#1A57A2', text: '#FFFFFF' },
      ts: { main: '#3178C6', light: '#BBDEFB', dark: '#1A57A2', text: '#FFFFFF' },
      python: { main: '#3776AB', light: '#BBDEFB', dark: '#2B5B85', text: '#FFFFFF' },
      java: { main: '#ED8B00', light: '#FFECB3', dark: '#C66C00', text: '#000000' },
      go: { main: '#00ADD8', light: '#B3E5FC', dark: '#0082A3', text: '#FFFFFF' },
      rust: { main: '#DEA584', light: '#FFE0B2', dark: '#B57A63', text: '#000000' },
      html: { main: '#E44D26', light: '#FEE0D2', dark: '#B33C1B', text: '#FFFFFF' },
      css: { main: '#264DE4', light: '#D6E0FF', dark: '#1E3FB0', text: '#FFFFFF' },
      react: { main: '#61DAFB', light: '#E0F7FA', dark: '#00ACC1', text: '#000000' },
      cpp: { main: '#659AD2', light: '#E3F2FD', dark: '#3F6797', text: '#000000' },
      csharp: { main: '#9B4F96', light: '#F3E5F5', dark: '#7B1FA2', text: '#FFFFFF' },
      default: { main: '#607D8B', light: '#CFD8DC', dark: '#455A64', text: '#FFFFFF' }
    };
    
    return colors[language.toLowerCase()] || colors.default;
  }, []);

  // Get language icon
  const getLanguageIcon = (language) => {
    if (!language) return <FiCode />;
    
    const lang = language.toLowerCase();
    if (lang.includes('javascript')) return <FaJs />;
    if (lang.includes('typescript')) return <SiTypescript />;
    if (lang.includes('python')) return <FaPython />;
    if (lang.includes('java')) return <FaJava />;
    if (lang.includes('go')) return <SiGo />;
    if (lang.includes('rust')) return <FaRust />;
    if (lang.includes('html')) return <FaHtml5 />;
    if (lang.includes('css')) return <FaCss3 />;
    if (lang.includes('react')) return <FaReact />;
    if (lang.includes('c++') || lang.includes('cpp')) return <SiCplusplus />;
    if (lang.includes('c#')) return <SiCsharp />;
    return <FiCode />;
  };
  
  // Handle favorite toggle
  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    onToggleFavorite?.(project.id);
  };

  // Handle delete with confirmation
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      onDelete?.(project.id);
    }
    setIsMenuOpen(false);
  };

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    },
    hover: { 
      y: -4,
      boxShadow: isDarkMode 
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
    },
    tap: { scale: 0.98 }
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    },
    exit: { opacity: 0, y: -10 }
  };

  // Theme and style variables
  const themeBg = isDarkMode ? '#1E1E2E' : '#FFFFFF';
  const themeText = isDarkMode ? '#E2E8F0' : '#1A202C';
  const themeBorder = isDarkMode ? '#2D374850' : '#E2E8F0';
  const langColor = getLanguageColor(project.language || 'default');
  
  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'opacity-75' : 'opacity-100'}`}
      style={{
        backgroundColor: themeBg,
        border: `1px solid ${themeBorder}`,
        transform: 'translateZ(0)', // Force GPU acceleration
      }}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMenuOpen(false);
      }}
      onClick={() => onSelect?.(project)}
      role="button"
      tabIndex={0}
      aria-label={`Open project ${project.name}`}
    >
      {/* Card Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${langColor.main}20` }}
              >
                <span style={{ color: langColor.main }}>
                  {getLanguageIcon(project.language)}
                </span>
              </div>
              <h3 
                className="text-lg font-semibold truncate"
                style={{ color: themeText }}
              >
                {project.name}
              </h3>
            </div>
            
            {project.description && (
              <p 
                className="mt-2 text-sm line-clamp-2"
                style={{ color: isDarkMode ? '#A0AEC0' : '#4A5568' }}
              >
                {project.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={handleFavoriteToggle}
              className="p-1.5 rounded-full hover:bg-opacity-20 hover:bg-gray-400"
              aria-label={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <FiStar 
                className={`w-5 h-5 ${project.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} 
              />
            </button>
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-full hover:bg-opacity-20 hover:bg-gray-400"
                aria-label="More options"
              >
                <FiMoreVertical className="w-5 h-5 text-gray-400" />
              </button>
              
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    className="absolute right-0 z-10 w-48 py-1 mt-1 origin-top-right bg-white rounded-md shadow-lg dark:bg-gray-800 ring-1 ring-black ring-opacity-5"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={menuVariants}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit action
                        setIsMenuOpen(false);
                      }}
                    >
                      <FiEdit2 className="w-4 h-4 mr-2" />
                      Edit Project
                    </button>
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900"
                      onClick={handleDelete}
                    >
                      <FiTrash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Footer */}
      <div 
        className="px-4 py-3 border-t"
        style={{ borderColor: themeBorder }}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center" style={{ color: isDarkMode ? '#A0AEC0' : '#718096' }}>
              <FiClock className="w-3.5 h-3.5 mr-1" />
              <span>{formatLastModified(project.updatedAt || project.createdAt)}</span>
            </div>
            
            {project.branch && (
              <div className="flex items-center" style={{ color: isDarkMode ? '#A0AEC0' : '#718096' }}>
                <FiGitBranch className="w-3.5 h-3.5 mr-1" />
                <span>{project.branch}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            <span 
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${langColor.main}20`,
                color: langColor.main
              }}
            >
              {project.language || 'Unknown'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Hover overlay */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isHovered ? 0.05 : 0,
          transition: { duration: 0.2 }
        }}
      />
      
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </motion.div>
  );
};

// Prop types validation
ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    language: PropTypes.string,
    isFavorite: PropTypes.bool,
    updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    branch: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func,
  onToggleFavorite: PropTypes.func,
  onDelete: PropTypes.func,
  isDarkMode: PropTypes.bool,
  isSelected: PropTypes.bool,
  isDragging: PropTypes.bool,
  isCustomizing: PropTypes.bool,
};

export default React.memo(ProjectCard);
