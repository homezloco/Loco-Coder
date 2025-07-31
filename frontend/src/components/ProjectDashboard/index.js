// Export all dashboard components from a single file
import ProjectCard from './ProjectCard';
import ProjectFilters from './ProjectFilters';
import ProjectGrid from './ProjectGrid';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import * as projectUtils from './projectUtils.jsx';

// Export individual components
export {
  ProjectCard,
  ProjectFilters,
  ProjectGrid,
  LoadingState,
  ErrorState,
  EmptyState,
  projectUtils
};

// Create composite Dashboard component
import Dashboard from './Dashboard';
export default Dashboard;
