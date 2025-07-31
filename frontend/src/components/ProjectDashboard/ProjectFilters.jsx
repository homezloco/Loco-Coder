import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiChevronDown } from 'react-icons/fi';

/**
 * Project filtering tabs component with enhanced Replit-like UI and improved accessibility
 * @param {string} activeFilter - Currently selected filter
 * @param {Function} onFilterChange - Handler for filter changes
 * @param {boolean} isDarkMode - Current theme mode
 * @param {Function} onSearch - Handler for search input changes
 * @param {string} className - Additional CSS classes
 * @param {Object} filterCounts - Optional counts for each filter category
 */

const ProjectFilters = ({ 
  activeFilter, 
  onFilterChange, 
  isDarkMode,
  onSearch,
  className = '',
  filterCounts = {} // e.g. { all: 12, recent: 5, favorites: 3, frontend: 8, backend: 4, fullstack: 3 }
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Handle scroll for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };
  
  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: -10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    },
    hover: {
      scale: 1.03,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };
  
  // Available filter options with icon and counter data
  const filters = [
    { 
      id: 'all', 
      label: 'All Projects', 
      icon: '📂', 
      description: 'View all your projects',
      color: {
        light: { bg: '#E3F2FD', text: '#0D47A1', border: '#90CAF9' },
        dark: { bg: '#0D2D4A', text: '#90CAF9', border: '#1A4971' }
      }
    },
    { 
      id: 'recent', 
      label: 'Recent', 
      icon: '🕒', 
      description: 'Recently worked on projects',
      color: {
        light: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
        dark: { bg: '#0F2E19', text: '#81C784', border: '#1F4E2A' }
      }
    },
    { 
      id: 'favorites', 
      label: 'Favorites', 
      icon: '⭐', 
      description: 'Your starred projects',
      color: {
        light: { bg: '#FFF8E1', text: '#FF8F00', border: '#FFE082' },
        dark: { bg: '#442D05', text: '#FFD54F', border: '#715B2F' }
      },
      badge: 'New'
    },
    { 
      id: 'frontend', 
      label: 'Frontend', 
      icon: '🎨', 
      description: 'UI and client-side projects',
      color: {
        light: { bg: '#F3E5F5', text: '#6A1B9A', border: '#CE93D8' },
        dark: { bg: '#291F35', text: '#CE93D8', border: '#4A2E5F' }
      }
    },
    { 
      id: 'backend', 
      label: 'Backend', 
      icon: '⚙️', 
      description: 'Server and API projects',
      color: {
        light: { bg: '#E1F5FE', text: '#0277BD', border: '#81D4FA' },
        dark: { bg: '#01303F', text: '#4FC3F7', border: '#024A6A' }
      }
    },
    { 
      id: 'fullstack', 
      label: 'Fullstack', 
      icon: '🧰', 
      description: 'Complete application projects',
      color: {
        light: { bg: '#E0F2F1', text: '#00695C', border: '#80CBC4' },
        dark: { bg: '#002D28', text: '#4DB6AC', border: '#00564A' }
      }
    }
  ];
  
  // Shared button style with enhanced modern design
  const getButtonStyle = (filter, isActive, isHovered) => {
    const filterColor = filter.color || {
      light: { bg: '#F5F5F5', text: '#424242', border: '#E0E0E0' },
      dark: { bg: '#282C34', text: '#A9B3CC', border: '#3D4663' }
    };
    
    return {
      padding: '10px 16px',
      backgroundColor: isActive 
        ? (isDarkMode ? `${filterColor.dark.bg}90` : `${filterColor.light.bg}90`) 
        : isHovered 
          ? (isDarkMode ? `${filterColor.dark.bg}40` : `${filterColor.light.bg}40`)
          : 'transparent',
      border: isActive
        ? `1px solid ${isDarkMode ? filterColor.dark.border : filterColor.light.border}`
        : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      borderRadius: '10px',
      cursor: 'pointer',
      color: isActive
        ? (isDarkMode ? filterColor.dark.text : filterColor.light.text)
        : (isDarkMode ? '#a9b3cc' : '#5a6682'),
      fontWeight: isActive ? '600' : '500',
      fontSize: '14px',
      transition: 'all 0.2s ease-in-out',
      margin: '2px 4px',
      outline: 'none',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: isActive 
        ? isDarkMode 
          ? '0 4px 12px -2px rgba(0, 0, 0, 0.3)' 
          : '0 4px 12px -2px rgba(0, 0, 0, 0.1)'
        : 'none',
      transform: isHovered ? 'translateY(-1px)' : 'none',
      willChange: 'transform, box-shadow, background-color',
      backdropFilter: isDarkMode ? 'saturate(180%) blur(10px)' : 'saturate(120%) blur(10px)',
      WebkitBackdropFilter: isDarkMode ? 'saturate(180%) blur(10px)' : 'saturate(120%) blur(10px)'
    };
  };
  
  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div 
      className={`filter-tabs ${className}`} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
        padding: '12px',
        backgroundColor: isDarkMode ? 'rgba(17, 18, 30, 0.7)' : 'rgba(248, 250, 252, 0.8)',
        borderRadius: '14px',
        boxShadow: isScrolled 
          ? (isDarkMode 
              ? '0 4px 20px -5px rgba(0, 0, 0, 0.4)' 
              : '0 4px 20px -5px rgba(0, 0, 0, 0.1)')
          : 'none',
        border: isDarkMode ? '1px solid rgba(45, 55, 72, 0.2)' : '1px solid rgba(226, 232, 240, 0.5)',
        position: 'relative',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {/* Search Bar - Desktop */}
      <div className="hidden md:flex relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className={`h-4 w-4 ${isSearchFocused ? 'text-blue-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className={`block w-full pl-10 pr-3 py-2 rounded-lg text-sm border ${isDarkMode 
            ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'}`}
          placeholder="Search projects..."
          aria-label="Search projects"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <FiX className={`h-4 w-4 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`} />
          </button>
        )}
      </div>
      
      {/* Mobile Search and Filter Toggle */}
      <div className="md:hidden flex flex-col space-y-2">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className={`h-4 w-4 ${isSearchFocused ? 'text-blue-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={`block w-full pl-10 pr-3 py-2 rounded-lg text-sm border ${isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder="Search projects..."
              aria-label="Search projects"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="Clear search"
              >
                <FiX className={`h-4 w-4 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`} />
              </button>
            )}
          </div>
          <button
            onClick={toggleMobileMenu}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode 
              ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
              : 'bg-white text-gray-700 hover:bg-gray-100'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
            aria-label="Toggle filter menu"
          >
            <span>Filters</span>
            <FiChevronDown className={`ml-1 h-4 w-4 transform transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Mobile Filter Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <motion.div 
                className="flex flex-wrap gap-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filters.map((filter) => (
                  <motion.div
                    key={filter.id}
                    variants={itemVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <FilterButton 
                      filter={filter}
                      isActive={activeFilter === filter.id}
                      isDarkMode={isDarkMode}
                      filterCount={filterCounts[filter.id] || 0}
                      onClick={() => {
                        onFilterChange(filter.id);
                        setIsMobileMenuOpen(false);
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable Filter Button Component
const FilterButton = ({ filter, isActive, isDarkMode, filterCount, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const filterColor = filter.color || {
    light: { bg: '#F5F5F5', text: '#424242', border: '#E0E0E0' },
    dark: { bg: '#282C34', text: '#A9B3CC', border: '#3D4663' }
  };
  
  const buttonStyle = getButtonStyle(filter, isActive, isHovered);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      style={buttonStyle}
      aria-label={`Filter by ${filter.label}${filterCount > 0 ? `, ${filterCount} projects` : ''}`}
      aria-pressed={isActive}
      title={filter.description}
      className="group relative overflow-hidden"
    >
      {/* Active indicator */}
      {isActive && (
        <motion.span 
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
          layoutId="activeFilter"
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
        />
      )}
      
      <span className="relative z-10 flex items-center">
        {/* Icon with dynamic styling */}
        <span 
          role="img" 
          aria-hidden="true"
          className={`flex items-center justify-center w-5 h-5 transition-all duration-200 ${
            isActive ? 'scale-110' : isHovered ? 'scale-105' : 'scale-100'
          }`}
          style={{
            opacity: isActive ? 1 : (isHovered ? 0.9 : 0.7),
          }}
        >
          {filter.icon}
        </span>
        
        {/* Filter label text */}
        <span className="ml-2">{filter.label}</span>
        
        {/* Optional count indicator */}
        {filterCount > 0 && (
          <span 
            className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full transition-all duration-200 ${
              isActive 
                ? 'bg-opacity-100 text-white' 
                : 'bg-opacity-50 group-hover:bg-opacity-75'
            }`}
            style={{
              backgroundColor: isDarkMode 
                ? `${filterColor.dark.bg}${isActive ? 'e6' : '4d'}` 
                : `${filterColor.light.bg}${isActive ? 'e6' : '80'}`,
              color: isDarkMode ? filterColor.dark.text : filterColor.light.text,
              border: `1px solid ${
                isDarkMode 
                  ? `${filterColor.dark.border}${isActive ? 'ff' : '4d'}`
                  : `${filterColor.light.border}${isActive ? 'ff' : '80'}`
              }`,
              textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              minWidth: '20px',
              textAlign: 'center'
            }}
          >
            {filterCount}
          </span>
        )}
      </span>
    </button>
  );
};

FilterButton.propTypes = {
  filter: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.string,
    description: PropTypes.string,
    color: PropTypes.shape({
      light: PropTypes.shape({
        bg: PropTypes.string,
        text: PropTypes.string,
        border: PropTypes.string
      }),
      dark: PropTypes.shape({
        bg: PropTypes.string,
        text: PropTypes.string,
        border: PropTypes.string
      })
    })
  }).isRequired,
  isActive: PropTypes.bool,
  isDarkMode: PropTypes.bool,
  filterCount: PropTypes.number,
  onClick: PropTypes.func.isRequired
};

ProjectFilters.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool,
  onSearch: PropTypes.func,
  className: PropTypes.string,
  filterCounts: PropTypes.object
};

export default React.memo(ProjectFilters);
