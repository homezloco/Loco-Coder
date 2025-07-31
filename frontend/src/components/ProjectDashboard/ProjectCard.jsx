import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  FiStar, 
  FiMoreVertical, 
  FiTrash2, 
  FiEdit2, 
  FiGitBranch, 
  FiClock,
  FiCode,
  FiExternalLink
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

// Error boundary component for ProjectCard
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ProjectCard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800">
          <p className="font-medium">Error loading project card</p>
          <p className="text-sm">{this.state.error?.message || 'Unknown error occurred'}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Individual project card component with modern design and smooth animations
 */
// Skeleton component for loading state
const ProjectCardSkeleton = ({ isDarkMode }) => {
  const bgColor = isDarkMode ? '#2D3748' : '#E2E8F0';
  const shimmerColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  
  return (
    <div 
      className="rounded-xl overflow-hidden relative"
      style={{
        background: isDarkMode 
          ? 'linear-gradient(145deg, #1E1E2E 0%, #252538 100%)'
          : 'linear-gradient(145deg, #FFFFFF 0%, #f8fafc 100%)',
        border: `1px solid ${isDarkMode ? '#2D374850' : '#E2E8F0'}`,
        height: '100%',
        minHeight: '180px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div className="absolute inset-0" style={{
        background: `linear-gradient(90deg, ${bgColor} 25%, ${shimmerColor} 50%, ${bgColor} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }} />
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

// Debug wrapper component to catch and log errors
const ProjectCardWithErrorBoundary = (props) => {
  try {
    // Log the incoming props for debugging
    console.group('ProjectCard Render');
    console.log('ProjectCard props:', JSON.parse(JSON.stringify(props, (key, value) => 
      key === 'project' ? 
        value ? 
          { ...value, files: value.files ? `[${value.files.length} files]` : 'no files' } : 
          'null' : 
        value
    )));
    
    // Render the actual component
    const result = <ProjectCard {...props} />;
    console.groupEnd();
    return result;
  } catch (error) {
    console.error('Error in ProjectCard render:', error, 'Props:', props);
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800">
        <p className="font-medium">Error rendering project card</p>
        <p className="text-sm">{error.message}</p>
        <p className="text-xs mt-2">Check console for details</p>
      </div>
    );
  }
};

const ProjectCard = memo(({ 
  project, 
  onSelect, 
  onToggleFavorite, 
  onDelete, 
  isSelected = false, 
  isDarkMode = false,
  isDragging = false,
  isCustomizing = false,
  isLoading = false
}) => {
  // Debug logging
  useEffect(() => {
    if (!project) {
      console.error('ProjectCard received null/undefined project:', { project, onSelect, onToggleFavorite, onDelete });
      return;
    }
    
    if (!project.id || !project.name) {
      console.error('ProjectCard missing required fields:', { 
        id: project.id, 
        name: project.name,
        project: JSON.stringify(project, null, 2) 
      });
    }
  }, [project]);
  
  // Ensure project is valid
  if (!project) {
    return (
      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
        <p className="font-medium">Invalid Project</p>
        <p className="text-sm">Project data is missing or invalid</p>
      </div>
    );
  }
  
  // Ensure required fields have defaults
  const safeProject = {
    id: project.id || `project-${Math.random().toString(36).substr(2, 9)}`,
    name: project.name || 'Untitled Project',
    description: project.description || '',
    language: project.language || 'plaintext',
    type: project.type || 'other',
    tags: Array.isArray(project.tags) ? project.tags : [],
    favorite: !!project.favorite,
    createdAt: project.createdAt || new Date().toISOString(),
    lastModified: project.lastModified || new Date().toISOString(),
    lastAccessed: project.lastAccessed || Date.now(),
    status: project.status || 'active',
    thumbnail: project.thumbnail || null,
    files: Array.isArray(project.files) ? project.files : [],
    path: project.path || `/${(project.name || 'untitled').toLowerCase().replace(/\s+/g, '-')}`,
    settings: typeof project.settings === 'object' ? project.settings : {},
    metadata: typeof project.metadata === 'object' ? project.metadata : {}
  };
  
  // Use the safe project object instead of the original
  const { id, name, description, language, tags, favorite, lastModified } = safeProject;

  // State for hover and interaction effects
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Get the theme context for dark mode
  const { isDarkMode: themeDarkMode } = useTheme();
  const isDark = isDarkMode !== undefined ? isDarkMode : themeDarkMode;
  const menuRef = useRef(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
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

  // Safely get language color based on project language
  const getLanguageColor = useCallback((language) => {
    if (!language) return isDarkMode ? '#9ca3af' : '#6b7280';
    
    try {
      const lang = String(language).toLowerCase().trim();
      switch (lang) {
        case 'javascript':
        case 'js':
          return '#f7df1e';
        case 'typescript':
        case 'ts':
          return '#3178c6';
        case 'python':
        case 'py':
          return '#3776ab';
        case 'java':
          return '#007396';
        case 'rust':
        case 'rs':
          return '#000000';
        case 'html':
          return '#e44d26';
        case 'css':
          return '#1572b6';
        case 'cpp':
        case 'c++':
          return '#00599c';
        case 'csharp':
        case 'c#':
          return '#239120';
        case 'go':
        case 'golang':
          return '#00add8';
        case 'react':
          return '#61dafb';
        default:
          return isDarkMode ? '#9ca3af' : '#6b7280';
      }
    } catch (error) {
      console.error('Error getting language color:', error);
      return isDarkMode ? '#9ca3af' : '#6b7280';
    }
  }, [isDarkMode]);

  // Safely get language icon based on project language
  const getLanguageIcon = useCallback((language) => {
    if (!language) return <FiCode className="w-4 h-4" aria-label="Code" />;
    
    try {
      const lang = String(language).toLowerCase().trim();
      switch (lang) {
        case 'javascript':
        case 'js':
          return <FaJs className="w-4 h-4" aria-label="JavaScript" />;
        case 'typescript':
        case 'ts':
          return <SiTypescript className="w-4 h-4" aria-label="TypeScript" />;
        case 'python':
        case 'py':
          return <FaPython className="w-4 h-4" aria-label="Python" />;
        case 'java':
          return <FaJava className="w-4 h-4" aria-label="Java" />;
        case 'rust':
        case 'rs':
          return <FaRust className="w-4 h-4" aria-label="Rust" />;
        case 'html':
          return <FaHtml5 className="w-4 h-4" aria-label="HTML" />;
        case 'css':
          return <FaCss3 className="w-4 h-4" aria-label="CSS" />;
        case 'cpp':
        case 'c++':
          return <SiCplusplus className="w-4 h-4" aria-label="C++" />;
        case 'csharp':
        case 'c#':
          return <SiCsharp className="w-4 h-4" aria-label="C#" />;
        case 'go':
        case 'golang':
          return <SiGo className="w-4 h-4" aria-label="Go" />;
        case 'react':
          return <FaReact className="w-4 h-4" aria-label="React" />;
        default:
          return <FiCode className="w-4 h-4" aria-label="Code" />;
      }
    } catch (error) {
      console.error('Error getting language icon:', error);
      return <FiCode className="w-4 h-4" aria-label="Code" />;
    }
  }, []);

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

  // Animation variants with reduced motion support
  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 10,
      scale: 0.98,
      boxShadow: 'none'
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring',
        stiffness: 400,
        damping: 25,
        when: 'beforeChildren',
        staggerChildren: 0.03,
        delay: Math.random() * 0.1 // Slight stagger between cards
      }
    },
    hover: { 
      y: -4,
      boxShadow: isDarkMode 
        ? '0 15px 30px -10px rgba(0, 0, 0, 0.3), 0 10px 15px -5px rgba(0, 0, 0, 0.12)'
        : '0 15px 30px -10px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.08)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 15
      }
    },
    tap: { 
      scale: 0.97,
      transition: {
        type: 'spring',
        stiffness: 1000,
        damping: 30
      }
    }
  };
  
  // Child animation variants
  const itemVariants = {
    initial: { opacity: 0, y: 5 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    },
    hover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    }
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
  // Check if user prefers reduced motion
  const prefersReducedMotion = useReducedMotion();
  
  // Theme variables
  const themeBg = isDarkMode ? '#1E1E2E' : '#FFFFFF';
  const themeText = isDarkMode ? '#E2E8F0' : '#1A202C';
  const themeBorder = isDarkMode ? '#2D374850' : '#E2E8F0';
  const langColor = getLanguageColor(project?.language || 'default');
  
  // Handle keyboard events for accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.key === 'Enter') {
        onSelect?.(project);
      }
    }
  };
  
  // Show skeleton if loading
  if (isLoading) {
    return <ProjectCardSkeleton isDarkMode={isDarkMode} />;
  }
  
  // Safely calculate project completion percentage
  const calculateCompletion = () => {
    if (!project || !Array.isArray(project.files) || project.files.length === 0) {
      return 0;
    }
    
    try {
      const totalFiles = project.files.length;
      const completedFiles = project.files.filter(file => file && file.completed).length;
      return Math.round((completedFiles / totalFiles) * 100) || 0;
    } catch (error) {
      console.error('Error calculating completion:', error);
      return 0;
    }
  };
  
  // Safely calculate completion percentage
  const completionPercentage = useMemo(() => {
    try {
      if (!project || !project.files) return 0;
      
      const totalFiles = project.files.length;
      if (totalFiles === 0) return 0;
      
      const completedFiles = project.files.filter(file => file.completed).length;
      return Math.round((completedFiles / totalFiles) * 100);
    } catch (error) {
      console.error('Error calculating completion percentage:', error);
      return 0;
    }
  }, [project]);
  
  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'opacity-75' : 'opacity-100'}`}
      style={{
        background: isDarkMode 
          ? `linear-gradient(145deg, ${themeBg} 0%, #252538 100%)`
          : `linear-gradient(145deg, ${themeBg} 0%, #f8fafc 100%)`,
        border: `1px solid ${isSelected ? (isDarkMode ? '#60A5FA' : '#3B82F6') : themeBorder}`,
        transform: 'translateZ(0)', // Force GPU acceleration
        willChange: 'transform, box-shadow',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
        transition: 'all 0.2s ease-in-out'
      }}
      variants={prefersReducedMotion ? {} : cardVariants}
      initial="initial"
      animate="animate"
      whileHover={prefersReducedMotion ? {} : "hover"}
      whileTap={prefersReducedMotion ? {} : "tap"}
      aria-roledescription="project card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMenuOpen(false);
      }}
      onClick={() => onSelect?.(project)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Project: ${project.name}. ${project.description || ''} ${project.language ? `Written in ${project.language}.` : ''} ${project.isFavorite ? 'Marked as favorite.' : ''}. Click to open.`}
      aria-pressed={isSelected}
      data-testid={`project-card-${project.id}`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
      </div>
      
      {/* Card Header */}
      <div className="p-4 pb-2 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <motion.div 
                className="p-2 rounded-lg flex-shrink-0"
                style={{ 
                  backgroundColor: `${langColor}15`,
                  border: `1px solid ${langColor}30`
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span style={{ color: langColor, display: 'flex' }}>
                  {getLanguageIcon(project.language)}
                </span>
              </motion.div>
              <div className="min-w-0">
                <motion.h3 
                  className="text-lg font-semibold truncate"
                  style={{ color: themeText }}
                  variants={itemVariants}
                >
                  {project.name}
                </motion.h3>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.tags.slice(0, 2).map((tag, index) => (
                      <motion.span 
                        key={index}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isDarkMode ? '#2D374850' : '#EDF2F7',
                          color: isDarkMode ? '#A0AEC0' : '#4A5568'
                        }}
                        variants={itemVariants}
                      >
                        {tag}
                      </motion.span>
                    ))}
                    {project.tags.length > 2 && (
                      <motion.span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isDarkMode ? '#2D374850' : '#EDF2F7',
                          color: isDarkMode ? '#A0AEC0' : '#4A5568'
                        }}
                        variants={itemVariants}
                      >
                        +{project.tags.length - 2}
                      </motion.span>
                    )}
                  </div>
                )}
              </div>
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
            <motion.button
              onClick={handleFavoriteToggle}
              className="p-1.5 rounded-full hover:bg-opacity-20 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
              aria-label={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              variants={itemVariants}
            >
              <motion.span
                animate={{
                  scale: project.isFavorite ? [1, 1.2, 1] : 1,
                  rotate: project.isFavorite ? [0, -10, 10, 0] : 0,
                }}
                transition={{
                  scale: { duration: 0.3 },
                  rotate: { duration: 0.5 }
                }}
              >
                <FiStar 
                  className={`w-5 h-5 transition-all duration-200 ${
                    project.isFavorite 
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' 
                      : 'text-gray-400 hover:text-yellow-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="sr-only">
                  {project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                </span>
              </motion.span>
            </motion.button>
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-full hover:bg-opacity-20 hover:bg-gray-400"
                aria-label="More options"
              >
                <FiMoreVertical className="w-5 h-5 text-gray-400" aria-hidden="true" />
              <span className="sr-only">More options</span>
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
      
      {/* Progress Bar */}
      {(project.files && project.files.length > 0) && (
        <div className="px-4 pt-1 pb-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{completionPercentage}% complete</span>
            <span>{project.files.filter(f => f.completed).length}/{project.files.length} tasks</span>
          </div>
        </div>
      )}
      
      {/* Card Footer */}
      <div 
        className="px-4 py-3 border-t bg-opacity-50"
        style={{ 
          borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
        }}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <motion.div 
              className="flex items-center" 
              style={{ color: isDarkMode ? '#A0AEC0' : '#718096' }}
              variants={itemVariants}
            >
              <FiClock className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">
                {formatLastModified(project.updatedAt || project.createdAt)}
              </span>
            </motion.div>
            
            {project.branch && (
              <motion.div 
                className="flex items-center" 
                style={{ color: isDarkMode ? '#A0AEC0' : '#718096' }}
                variants={itemVariants}
              >
                <FiGitBranch className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-none">{project.branch}</span>
              </motion.div>
            )}
          </div>
          
          <motion.div 
            className="flex items-center"
            variants={itemVariants}
          >
            <span 
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-opacity-30 transition-all duration-200 hover:shadow-sm"
              style={{
                backgroundColor: `${langColor.main}15`,
                color: langColor.main,
                borderColor: `${langColor.main}40`,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {project.language || 'Unknown'}
            </span>
          </motion.div>
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
});

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
    tags: PropTypes.arrayOf(PropTypes.string),
    files: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string,
      completed: PropTypes.bool,
    })),
  }),
  onSelect: PropTypes.func,
  onToggleFavorite: PropTypes.func,
  onDelete: PropTypes.func,
  isDarkMode: PropTypes.bool,
  isSelected: PropTypes.bool,
  isDragging: PropTypes.bool,
  isCustomizing: PropTypes.bool,
  isLoading: PropTypes.bool,
};

ProjectCard.defaultProps = {
  project: null,
  onSelect: () => {},
  onToggleFavorite: () => {},
  onDelete: () => {},
  isDarkMode: false,
  isSelected: false,
  isDragging: false,
  isCustomizing: false,
  isLoading: false,
};

export default React.memo(ProjectCardWithErrorBoundary);
