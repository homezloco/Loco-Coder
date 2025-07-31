import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../../../../contexts/NewProjectContext';
import { filterProjects, sortProjects } from '../utils/projectUtils';

/**
 * Custom hook to manage projects state and logic
 */
const useProjects = () => {
  // Get projects from context
  const { projects: contextProjects, loadProjects } = useProject();
  
  // Local state
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter, sort, and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Load projects on mount
  useEffect(() => {
    const loadProjectsData = async () => {
      try {
        setLoading(true);
        await loadProjects();
        setError(null);
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    
    loadProjectsData();
  }, [loadProjects]);
  
  // Update local projects when context changes
  useEffect(() => {
    if (contextProjects) {
      setProjects(contextProjects);
    }
  }, [contextProjects]);
  
  // Apply filters and sorting when dependencies change
  useEffect(() => {
    if (!projects.length) return;
    
    // Filter projects based on search query
    let result = [...projects];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(project => 
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        (project.tags && project.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Sort projects
    result = sortProjects(result, sortBy, sortOrder);
    
    setFilteredProjects(result);
  }, [projects, searchQuery, sortBy, sortOrder]);
  
  // Handle sort change
  const handleSortChange = useCallback((key) => {
    if (sortBy === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }, [sortBy]);
  
  // Refresh projects
  const refreshProjects = useCallback(async () => {
    try {
      setLoading(true);
      await loadProjects();
      setError(null);
    } catch (err) {
      console.error('Error refreshing projects:', err);
      setError('Failed to refresh projects');
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);
  
  // Toggle favorite status
  const toggleFavorite = useCallback(async (projectId) => {
    try {
      // Update local state optimistically
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId
            ? { ...project, isFavorite: !project.isFavorite }
            : project
        )
      );
      
      // In a real app, you would update this in the backend
      // await api.updateProject(projectId, { 
      //   isFavorite: !projects.find(p => p.id === projectId)?.isFavorite 
      // });
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on error
      setProjects(contextProjects || []);
      throw err;
    }
  }, [contextProjects]);
  
  // Delete project
  const deleteProject = useCallback(async (projectId) => {
    try {
      // Optimistic update
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // In a real app, you would delete from the backend
      // await api.deleteProject(projectId);
    } catch (err) {
      console.error('Error deleting project:', err);
      // Revert on error
      setProjects(contextProjects || []);
      throw err;
    }
  }, [contextProjects]);
  
  return {
    // State
    projects,
    filteredProjects,
    loading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    
    // Actions
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setViewMode, // Add setViewMode to the returned actions
    handleSortChange,
    refreshProjects,
    toggleFavorite,
    deleteProject,
  };
};

export default useProjects;
