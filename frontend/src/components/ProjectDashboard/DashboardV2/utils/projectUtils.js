/**
 * Filters projects based on search query
 * @param {Array} projects - Array of project objects
 * @param {string} query - Search query string
 * @returns {Array} Filtered array of projects
 */
export const filterProjects = (projects, query) => {
  if (!query) return projects;
  
  const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
  
  return projects.filter(project => {
    const searchableText = [
      project.name,
      project.description,
      ...(project.tags || []),
      project.language
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });
};

/**
 * Sorts projects based on sort key and order
 * @param {Array} projects - Array of project objects
 * @param {string} sortBy - Key to sort by (name, createdAt, updatedAt)
 * @param {string} sortOrder - Sort order (asc or desc)
 * @returns {Array} Sorted array of projects
 */
export const sortProjects = (projects, sortBy, sortOrder) => {
  return [...projects].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'createdAt') {
      comparison = new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'updatedAt') {
      comparison = 
        new Date(a.updatedAt || a.createdAt) - 
        new Date(b.updatedAt || b.createdAt);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

/**
 * Gets the appropriate icon for a project based on its type/language
 * @param {Object} project - Project object
 * @returns {Object} Icon component and color class
 */
export const getProjectIcon = (project) => {
  // This is a simplified version - you can expand this with more languages/frameworks
  const language = project.language ? project.language.toLowerCase() : '';
  
  const icons = {
    javascript: { icon: 'js', color: 'text-yellow-400' },
    typescript: { icon: 'ts', color: 'text-blue-500' },
    python: { icon: 'py', color: 'text-blue-600' },
    react: { icon: 'react', color: 'text-blue-400' },
    vue: { icon: 'vue', color: 'text-green-500' },
    angular: { icon: 'angular', color: 'text-red-500' },
    node: { icon: 'node', color: 'text-green-600' },
    html: { icon: 'html', color: 'text-orange-500' },
    css: { icon: 'css', color: 'text-blue-400' },
  };
  
  return icons[language] || { icon: 'code', color: 'text-gray-500' };
};

/**
 * Formats a date string into a human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Truncates text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export const truncate = (text = '', maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Gets initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '??';
  
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
