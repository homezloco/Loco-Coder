import React, { useState, useRef } from 'react';
import { FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectFilters = ({
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
  isDarkMode
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const sortOptions = [
    { key: 'name', label: 'Name' },
    { key: 'updatedAt', label: 'Last Updated' },
    { key: 'createdAt', label: 'Date Created' },
  ];

  const handleSortOptionClick = (key) => {
    onSortChange(key);
    setIsSortOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className={`block w-full pl-10 pr-3 py-2 border ${
            isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
          } rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {/* Sort and view controls */}
      <div className="flex items-center space-x-4">
        {/* Sort dropdown */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            type="button"
            className={`inline-flex items-center px-3 py-2 border ${
              isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-200' : 'border-gray-300 bg-white text-gray-700'
            } rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => setIsSortOpen(!isSortOpen)}
          >
            Sort by: {sortOptions.find(opt => opt.key === sortBy)?.label}
            {sortOrder === 'asc' ? (
              <FiChevronUp className="ml-2 h-5 w-5 text-gray-400" />
            ) : (
              <FiChevronDown className="ml-2 h-5 w-5 text-gray-400" />
            )}
          </button>
          
          <AnimatePresence>
            {isSortOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                } ring-1 ring-black ring-opacity-5 focus:outline-none z-10`}
              >
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.key}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        sortBy === option.key
                          ? isDarkMode
                            ? 'bg-gray-700 text-white'
                            : 'bg-gray-100 text-gray-900'
                          : isDarkMode
                          ? 'text-gray-200 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSortOptionClick(option.key)}
                    >
                      <div className="flex items-center">
                        <span>{option.label}</span>
                        {sortBy === option.key && (
                          <span className="ml-auto">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* View toggle */}
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            className={`relative inline-flex items-center px-3 py-2 rounded-l-md border ${
              viewMode === 'grid'
                ? isDarkMode
                  ? 'bg-blue-900/30 border-blue-500 text-blue-300'
                  : 'bg-blue-50 border-blue-500 text-blue-700'
                : isDarkMode
                ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid view"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`-ml-px relative inline-flex items-center px-3 py-2 rounded-r-md border ${
              viewMode === 'list'
                ? isDarkMode
                  ? 'bg-blue-900/30 border-blue-500 text-blue-300'
                  : 'bg-blue-50 border-blue-500 text-blue-700'
                : isDarkMode
                ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectFilters;
