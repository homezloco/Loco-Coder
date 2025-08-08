/**
 * Format a timestamp into a human-readable time string
 * @param {string|number|Date} timestamp - The timestamp to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeSeconds - Whether to include seconds in the output
 * @param {boolean} options.includeDate - Whether to include the date in the output
 * @returns {string} Formatted time string
 */
import logger from './logger';
const log = logger.ns('util:date');

export const formatTimestamp = (timestamp, options = {}) => {
  const { includeSeconds = false, includeDate = false } = options;
  
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  // Handle invalid date
  if (isNaN(date.getTime())) {
    log.warn('Invalid timestamp:', timestamp);
    return '';
  }
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  };
  
  const dateOptions = includeDate ? {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  } : {};
  
  try {
    if (includeDate) {
      return new Intl.DateTimeFormat('en-US', {
        ...timeOptions,
        ...dateOptions
      }).format(date);
    }
    
    return new Intl.DateTimeFormat('en-US', timeOptions).format(date);
  } catch (error) {
    log.error('Error formatting timestamp:', error);
    return date.toLocaleTimeString();
  }
};

/**
 * Format a duration in milliseconds into a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2m 30s")
 */
export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return '';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  
  const parts = [];
  
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
};

/**
 * Get a relative time string (e.g., "2 minutes ago")
 * @param {string|number|Date} timestamp - The timestamp to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  // Less than a minute
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  
  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  
  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  
  // Otherwise, return the full date
  return formatTimestamp(date, { includeDate: true });
};
