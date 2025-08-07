import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import '../styles/ProjectCreationModal.css';
import { 
  checkApiHealth, 
  fetchProjects, 
  toggleProjectFavorite, 
  deleteProject, 
  searchProjects, 
  persistProjects,
  mergeProjects
} from './projectUtils.jsx';
import ProjectGrid from './ProjectGrid';
import ProjectFilters from './ProjectFilters';
import VirtualizedProjectList from './VirtualizedProjectList';
import { TransitionContainer } from '../transitions';
import PersistenceStatus from './PersistenceStatus';
import DashboardControls from './DashboardControls';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import SyncIndicator from './SyncIndicator';
import ProjectCreationModal from '../ProjectCreationModal';
import CodingDashboard from '../CodingDashboard';
import { FiCode } from 'react-icons/fi';

// Modal for delete confirmation
const DeleteConfirmationModal = ({ project, onDelete, onCancel, isDarkMode }) => (
  <div style={{
    backgroundColor: isDarkMode ? '#1e2030' : 'white',
    padding: '24px',
    borderRadius: '8px',
    width: '400px',
    maxWidth: '90%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  }}>
    <h3 style={{ margin: '0 0 16px', color: isDarkMode ? '#e8ecf3' : '#2c3e50' }}>
      Delete Project
    </h3>
    <p style={{ color: isDarkMode ? '#a9b3cc' : '#64748b' }}>
      Are you sure you want to delete <strong>{project.name}</strong>? This cannot be undone.
    </p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
      <button 
        onClick={onCancel}
        style={{
          padding: '8px 16px',
          borderRadius: '4px',
          border: isDarkMode ? '1px solid #4b5563' : '1px solid #e2e8f0',
          background: 'transparent',
          color: isDarkMode ? '#e2e8f0' : '#4b5563',
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
      <button 
        onClick={onDelete}
        style={{
          padding: '8px 16px',
          borderRadius: '4px',
          border: 'none',
          background: '#ef4444',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Delete
      </button>
    </div>
  </div>
);

/**
 * Main ProjectDashboard component with comprehensive fallbacks
 * Modularized for better maintainability and organization
 */
const Dashboard = ({ 
  isVisible = true, 
  onClose, 
  onProjectSelect,
  isDarkMode = false,
  apiEndpoint = 'http://localhost:8000'
}) => {
  // State management
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [dataSource, setDataSource] = useState('loading');
  const [apiStatus, setApiStatus] = useState({ status: 'checking', message: 'Checking connection...' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('recent');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' });
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCodingDashboardOpen, setIsCodingDashboardOpen] = useState(false);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(800);
  
  // Refs
  const dashboardRef = useRef(null);
  
  // Effect to focus dashboard on mount for keyboard shortcuts
  useEffect(() => {
    if (dashboardRef.current) {
      dashboardRef.current.focus();
    }
  }, []);
  
  // Initialize from localStorage/preferences
  useEffect(() => {
    // Check for saved layout mode
    const savedLayoutMode = localStorage.getItem('dashboardLayoutMode');
    if (savedLayoutMode) {
      setLayoutMode(savedLayoutMode);
    }
    
    // Check for customization mode
    const isCustomizing = localStorage.getItem('dashboardCustomizing') === 'true';
    setIsCustomizing(isCustomizing);
    
    // Check for last known API status
    const lastKnownStatus = localStorage.getItem('lastKnownApiStatus');
    if (lastKnownStatus) {
      setApiStatus(prev => ({ ...prev, status: lastKnownStatus }));
    }
    
    // Check for last sync time
    const storedSyncTime = localStorage.getItem('projectsLastSyncTime');
    if (storedSyncTime) {
      console.log('Found last sync time:', storedSyncTime);
      setLastSyncTime(parseInt(storedSyncTime, 10));
    }
    
    // Initial load of projects
    const controller = new AbortController();
    loadProjects(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [loadProjects]);
  
  // Listen for auth state changes
  useEffect(() => {
    const handleAuthStateChanged = (event) => {
      console.log('[Dashboard] Auth state changed event received:', event.detail);
      
      if (event.detail?.isAuthenticated) {
        console.log('[Dashboard] User authenticated, loading projects...');
        const controller = new AbortController();
        loadProjects(controller.signal);
        
        // Set up a retry mechanism in case the first load fails
        const retryTimeout = setTimeout(() => {
          loadProjects();
        }, 2000);
        
        return () => {
          controller.abort();
          clearTimeout(retryTimeout);
        };
      } else if (event.detail?.isAuthenticated === false) {
        console.log('[Dashboard] User logged out, clearing projects');
        // Clear projects when user logs out
        setProjects([]);
        setFilteredProjects([]);
        setDataSource('none');
        setApiStatus({ status: 'unauthenticated', message: 'Not logged in' });
      }
    };
    
    // Add event listener for auth state changes
    window.addEventListener('auth-state-changed', handleAuthStateChanged);
    
    // Add event listener for token refresh events
    const handleTokenRefresh = (event) => {
      console.log('[Dashboard] Token refresh event received');
      // Re-initialize auth token and reload projects if token was refreshed
      if (event.detail?.success) {
        initializeAuthToken().then(isValid => {
          if (isValid) {
            loadProjects();
          }
        });
      }
    };
    window.addEventListener('token-refreshed', handleTokenRefresh);
    
    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
      window.removeEventListener('token-refreshed', handleTokenRefresh);
    };
  }, [loadProjects, initializeAuthToken]);
  
  // Initialize authentication token before API calls
  const initializeAuthToken = useCallback(async () => {
    console.log('[Dashboard] Initializing authentication token');
    try {
      // Try to dynamically import the token module
      const tokenModule = await import('../../services/api/auth/token');
      if (!tokenModule || typeof tokenModule.getAuthToken !== 'function') {
        console.warn('[Dashboard] Token module not available');
        return false;
      }
      
      // Get the token and validate it
      const token = tokenModule.getAuthToken();
      if (!token) {
        console.warn('[Dashboard] No authentication token found');
        return false;
      }
      
      // Parse and validate token
      if (typeof tokenModule.parseToken === 'function') {
        const decoded = tokenModule.parseToken(token);
        if (!decoded) {
          console.warn('[Dashboard] Invalid token format');
          return false;
        }
        
        // Check if token is expired or about to expire (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp - now < 300) { // 5 minutes
          console.warn('[Dashboard] Token expired or about to expire, attempting refresh');
          
          // Try to refresh the token
          try {
            // Try to import auth service
            const authModule = await import('../../services/api/auth');
            if (authModule && authModule.default && typeof authModule.default.refreshToken === 'function') {
              const refreshed = await authModule.default.refreshToken();
              if (refreshed) {
                console.log('[Dashboard] Token refreshed successfully');
                return true;
              }
            } else {
              console.warn('[Dashboard] Auth module not available for token refresh');
            }
          } catch (refreshError) {
            console.error('[Dashboard] Error refreshing token:', refreshError);
          }
          
          // If we reach here, refresh failed
          if (decoded.exp <= now) {
            console.warn('[Dashboard] Token expired and refresh failed');
            return false;
          }
        }
      }
      
      console.log('[Dashboard] Valid authentication token found');
      return true;
    } catch (error) {
      console.error('[Dashboard] Error initializing authentication token:', error);
      return false;
    }
  }, []);

  // Helper function to deduplicate projects by ID
  const deduplicateProjects = (projects) => {
    if (!Array.isArray(projects)) return [];
    
    const seen = new Set();
    return projects.filter(project => {
      if (!project || !project.id) return false;
      if (seen.has(project.id)) return false;
      seen.add(project.id);
      return true;
    });
  };
  
  // Load projects with robust multi-tiered fallback
  const loadProjects = useCallback(async (abortSignal) => {
    console.group('Dashboard: Loading Projects');
    console.log('Starting project load...');
    
    setIsLoading(true);
    setError(null);
    
    // Initialize authentication token before making API calls
    await initializeAuthToken();
    
    try {
      console.log('Checking API health...');
      const apiHealth = await checkApiHealth(apiEndpoint, true);
      console.log('API health check result:', apiHealth);
      
      // Skip if the component was unmounted or the request was aborted
      if (abortSignal?.aborted) return;
      
      console.log('Fetching projects...');
      const result = await fetchProjects(apiEndpoint, {
        quiet: true, // Suppress console errors during fetch
        filter: activeFilter !== 'all' ? activeFilter : null,
        search: searchQuery || null,
        signal: abortSignal
      });
      
      // Skip if the component was unmounted or the request was aborted
      if (abortSignal?.aborted) return;
      
      console.log('Projects loaded from source:', result.source);
      console.log(`Found ${result.projects.length} projects`);
      
      // Deduplicate projects to prevent storage quota issues
      const dedupedProjects = deduplicateProjects(result.projects);
      if (dedupedProjects.length !== result.projects.length) {
        console.log(`[Dashboard] Removed ${result.projects.length - dedupedProjects.length} duplicate projects`);
      }
      
      // Update projects state
      setProjects(prevProjects => {
        // Only update if the projects have actually changed
        const projectsChanged = JSON.stringify(prevProjects) !== JSON.stringify(dedupedProjects);
        return projectsChanged ? dedupedProjects : prevProjects;
      });
      
      // Apply filters to the loaded projects
      let filtered = [...result.projects];
      
      // Apply tag/type filter if active
      if (activeFilter !== 'all') {
        filtered = filtered.filter(project => {
          if (activeFilter === 'favorite') return project.favorite;
          if (activeFilter === 'recent') return true; // We'll sort by date below
          return project.tags?.includes(activeFilter) || project.type === activeFilter;
        });
      }
      
      // Apply language filter if active
      if (languageFilter !== 'all') {
        filtered = filtered.filter(project => {
          return project.language === languageFilter || 
                 project.techStack?.includes(languageFilter) || 
                 project.tags?.includes(languageFilter);
        });
      }
      
      // Apply date filter if active
      if (dateFilter !== 'all') {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        filtered = filtered.filter(project => {
          const createdAt = project.createdAt || project.created_at || 0;
          if (dateFilter === 'today') {
            return (now - createdAt) < dayInMs;
          } else if (dateFilter === 'week') {
            return (now - createdAt) < (7 * dayInMs);
          } else if (dateFilter === 'month') {
            return (now - createdAt) < (30 * dayInMs);
          }
          return true;
        });
      }
      
      // Apply status filter if active
      if (statusFilter !== 'all') {
        filtered = filtered.filter(project => {
          if (statusFilter === 'complete') {
            return project.status === 'complete' || project.progress === 100;
          } else if (statusFilter === 'in-progress') {
            return project.status === 'in-progress' || (project.progress > 0 && project.progress < 100);
          } else if (statusFilter === 'not-started') {
            return project.status === 'not-started' || project.progress === 0;
          }
          return true;
        });
      }
      
      // Apply search filter if present
      if (searchQuery) {
        filtered = searchProjects(filtered, searchQuery);
      }
      
      // Apply sorting based on selected option
      if (searchQuery) {
        // Search results are already sorted by relevance by the searchProjects function
      } else {
        switch (sortOption) {
          case 'recent':
            filtered.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
            break;
          case 'created':
            filtered.sort((a, b) => {
              const bCreated = b.createdAt || b.created_at || 0;
              const aCreated = a.createdAt || a.created_at || 0;
              return bCreated - aCreated;
            });
            break;
          case 'alphabetical':
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
          case 'favorites':
            filtered.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
            break;
          case 'language':
            filtered.sort((a, b) => (a.language || '').localeCompare(b.language || ''));
            break;
          default:
            // Default to recent
            filtered.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        }
      }
      
      setFilteredProjects(filtered);
      setDataSource(result.source);
      setError(null);
      
      // Handle different data sources with appropriate UI feedback
      if (result.source === 'API') {
        // API is online and working
        const now = Date.now();
        setLastSyncTime(now);
        localStorage.setItem('projectsLastSyncTime', now.toString());
        
        // Update API status
        setApiStatus({ 
          status: 'online', 
          message: 'Connected to API' 
        });
        localStorage.setItem('lastKnownApiStatus', 'online');
        
        console.log('API is online and working');
      } else if (result.source === 'IndexedDB') {
        // Using IndexedDB (API is offline but we have stored data)
        setApiStatus({ 
          status: 'degraded', 
          message: 'Limited connectivity - using stored data' 
        });
        localStorage.setItem('lastKnownApiStatus', 'degraded');
        
        // Show notification
        setSnackbar({
          visible: true,
          message: 'Working offline with cached projects. Changes will sync when you reconnect.',
          type: 'warning'
        });
        
        console.log('Using IndexedDB due to limited connectivity');
      } else if (result.source === 'localStorage' || result.source === 'sessionStorage') {
        // Using simple storage as backup
        setApiStatus({ 
          status: 'degraded', 
          message: 'Limited connectivity - using simple storage' 
        });
        localStorage.setItem('lastKnownApiStatus', 'degraded');
        
        // Show notification
        setSnackbar({
          visible: true,
          message: 'Working with limited storage. Some features may be unavailable.',
          type: 'warning'
        });
        
        console.log('Using simple storage due to limited connectivity');
      } else {
        // Using demo data (ultimate fallback)
        setApiStatus({ status: 'offline', message: 'No connection - using demo data' });
        localStorage.setItem('lastKnownApiStatus', 'offline');
        
        // Show notification
        setSnackbar({
          visible: true,
          message: 'Working offline with demo projects. Changes will not be saved.',
          type: 'error'
        });
        
        console.log('Using demo data due to no connection');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError(error.message || 'Failed to load projects');
      setSnackbar({ visible: true, message: 'Failed to load projects', type: 'error' });
      
      console.log('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  }, [activeFilter, searchQuery, apiStatus, apiEndpoint]);
  
  // Manual sync function to fetch fresh data from API
  const syncWithAPI = useCallback(async () => {
    console.group('Dashboard: Syncing with API');
    console.log('Starting sync...');
    
    try {
      setIsSyncing(true);
      
      // Show loading snackbar
      const showLoadingSnackbar = () => {
        setSnackbar({
          visible: true,
          message: 'Syncing projects with server...',
          type: 'info'
        });
      };
      
      showLoadingSnackbar();
      
      // First check if API is reachable
      const apiHealth = await checkApiHealth(apiEndpoint);
      
      if (apiHealth.status !== 'online') {
        // API is not available, show error
        setSnackbar(prev => ({
          ...prev,
          message: 'Cannot sync - API is not available. Check your connection.',
          type: 'error'
        }));
        setIsSyncing(false);
        console.log('API is not available');
        return;
      }
      
      // API is available, get latest projects
      const response = await fetch(`${apiEndpoint}/projects`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const freshProjects = await response.json();
      
      // Get local projects to determine what's changed
      const localProjects = [...projects];
      
      // Compare and merge projects
      const mergedProjects = mergeProjects(freshProjects, localProjects);
      
      // Update state with merged projects
      setProjects(mergedProjects);
      
      // Re-apply filters
      let filtered = [...mergedProjects];
      
      if (activeFilter !== 'all') {
        filtered = filtered.filter(project => {
          if (activeFilter === 'favorite') return project.favorite;
          if (activeFilter === 'recent') return true;
          return project.tags?.includes(activeFilter) || project.type === activeFilter;
        });
      }
      
      if (searchQuery) {
        filtered = searchProjects(filtered, searchQuery);
      }
      
      // Update filtered projects
      setFilteredProjects(filtered);
      
      // Update API status
      setApiStatus({ status: 'online', message: 'Connected to API' });
      
      // Update data source
      setDataSource('API');
      
      // Update last sync time
      const now = Date.now();
      setLastSyncTime(now);
      localStorage.setItem('projectsLastSyncTime', now.toString());
      
      // Persist merged projects to all storage layers
      persistProjects(mergedProjects);
      
      // Show success notification
      setSnackbar({
        visible: true,
        message: 'Projects synced successfully!',
        type: 'success'
      });
      
      console.log('Synced projects successfully');
    } catch (error) {
      console.error('Failed to sync projects:', error);
      
      setSnackbar({
        visible: true,
        message: `Sync failed: ${error.message}`,
        type: 'error'
      });
      
      console.log('Failed to sync projects:', error);
    } finally {
      setIsSyncing(false);
      console.groupEnd();
    }
  }, []);
  
  // Handle project selection
  const handleSelectProject = (project) => {
    console.group('Dashboard: Selecting Project');
    console.log('Selecting project:', project);
    
    setSelectedProjectId(project.id);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
    
    console.groupEnd();
  };
  
  // Handle project order change from drag-and-drop
  const handleProjectOrderChange = (reorderedProjects) => {
    console.group('Dashboard: Updating Project Order');
    console.log('Updating project order:', reorderedProjects);
    
    // Update projects array with new order
    setProjects(reorderedProjects);
    setFilteredProjects(reorderedProjects);
    
    // Persist the new order
    persistProjects(reorderedProjects);
    
    console.groupEnd();
  };
  
  // Toggle customization mode with persistence
  const toggleCustomizing = () => {
    console.group('Dashboard: Toggling Customization Mode');
    console.log('Toggling customization mode...');
    
    setIsCustomizing(prev => {
      const newValue = !prev;
      
      // Persist user preference
      localStorage.setItem('dashboardCustomizing', newValue.toString());
      
      // Show feedback to user
      setSnackbar({
        visible: true,
        message: newValue 
          ? 'Customization mode enabled. You can now reorder projects.' 
          : 'Customization mode disabled. Changes saved.',
        type: 'info'
      });
      
      return newValue;
    });
    
    console.groupEnd();
  };
  
  // Change dashboard layout mode with multi-tiered persistence
  const changeLayoutMode = (mode) => {
    console.group('Dashboard: Changing Layout Mode');
    console.log('Changing layout mode to:', mode);
    
    if (mode === layoutMode) return;
    
    setLayoutMode(mode);
    
    // Persist user preference
    try {
      localStorage.setItem('dashboardLayoutMode', mode);
      
      // Show feedback to user
      setSnackbar({
        visible: true,
        message: `Layout changed to ${mode} view`,
        type: 'info'
      });
    } catch (error) {
      console.error('Failed to persist layout mode:', error);
    }
    
    console.groupEnd();
  };
  
  // Open delete confirmation modal
  const openDeleteConfirmation = (projectId, projectName) => {
    console.group('Dashboard: Opening Delete Confirmation Modal');
    console.log('Opening delete confirmation modal for project:', projectId);
    
    const project = projects.find(p => p.id === projectId);
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
    
    console.groupEnd();
  };

  // Handle project creation with support for both template-based and form-based creation
  const handleCreateProject = async (projectData) => {
    console.group('Dashboard: Creating Project');
    console.log('Project data received:', projectData);
    
    // Ensure projectData is not null/undefined
    if (!projectData) {
      const errorMsg = 'No project data provided to handleCreateProject';
      console.error(errorMsg);
      setSnackbar({
        visible: true,
        message: 'Failed to create project: No project data provided',
        type: 'error'
      });
      console.groupEnd();
      return { success: false, error: errorMsg };
    }
    
    // Show loading indicator
    setIsLoading(true);
    
    // Handle template-based creation (legacy)
    if (typeof projectData === 'string') {
      const templateId = projectData;
      try {
        setIsLoading(true);
        
        // Generate a new project with default values
        const newId = `project-${Date.now()}`;
        const now = Date.now();
        const projectName = `New Project ${projects.length + 1}`;
        
        // Create a new project object with default structure
        const newProject = {
          id: newId,
          name: projectName,
          description: 'Click to edit project description',
          created: now,
          updated: now,
          lastAccessed: now,
          favorite: false,
          type: 'general',
          language: 'javascript',
          tags: ['new'],
          status: 'active',
          thumbnail: null,
          files: [
            {
              name: 'README.md',
              type: 'file',
              content: `# ${projectName}\n\nThis is a new project created with Coder AI.`
            },
            {
              name: 'src',
              type: 'directory',
              children: []
            }
          ]
        };

        // Add to current projects
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        setFilteredProjects(updatedProjects);
        
        // Persist the new project
        await persistProjects(updatedProjects);
        
        setSnackbar({
          visible: true,
          message: `Project "${newProject.name}" created successfully`,
          type: 'success'
        });
        
        // Select the new project
        handleProjectSelect(newProject.id);
        
        return { success: true, project: newProject };
      } catch (error) {
        console.error('Error creating project from template:', error);
        const errorMessage = error.message || 'Failed to create project from template';
        
        setSnackbar({
          visible: true,
          message: errorMessage,
          type: 'error'
        });
        
        console.groupEnd();
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    }
    
    // Handle form-based creation
    console.log('Processing form-based project creation');
    if (!projectData.name || typeof projectData.name !== 'string' || projectData.name.trim() === '') {
      setSnackbar({
        visible: true,
        message: 'A valid project name is required',
        type: 'error'
      });
      console.groupEnd();
      return { success: false, error: 'A valid project name is required' };
    }
    
    // Ensure projects array is initialized
    const currentProjects = Array.isArray(projects) ? [...projects] : [];
    console.log('Current projects before adding new one:', currentProjects);

    setIsCreating(true);
    
    try {
      // Create a new project object with all required fields
      const now = new Date().toISOString();
      const projectName = (projectData.name || 'Untitled Project').trim();
      const projectDescription = (projectData.description || '').trim();
      
      const newProject = {
        id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: projectName,
        description: projectDescription,
        language: projectData.language || 'javascript',
        type: projectData.type || 'other',
        tags: Array.isArray(projectData.tags) ? projectData.tags : [],
        favorite: false,
        createdAt: now,
        lastModified: now,
        lastAccessed: Date.now(),
        status: 'active',
        thumbnail: null,
        files: [
          {
            name: 'README.md',
            type: 'file',
            content: `# ${projectName}\n\n${projectDescription || 'Project description goes here.'}`
          },
          {
            name: 'src',
            type: 'directory',
            children: []
          }
        ],
        // Ensure all required fields have default values
        path: projectData.path || `/${projectName.toLowerCase().replace(/\s+/g, '-')}`,
        settings: {},
        metadata: {}
      };

      // Add to current projects with null check
      const updatedProjects = [...currentProjects, newProject];
      console.log('Updated projects array:', updatedProjects);
      
      // Validate the new project before setting state
      if (!newProject.id || !newProject.name) {
        const errorMsg = 'Invalid project data: missing required fields';
        console.error(errorMsg, newProject);
        setSnackbar({
          visible: true,
          message: 'Failed to create project: Invalid project data',
          type: 'error'
        });
        console.groupEnd();
        return { success: false, error: errorMsg };
      }
      
      setProjects(updatedProjects);
      setFilteredProjects(updatedProjects);
      
      // Persist the new project
      console.log('Persisting updated projects...');
      try {
        await persistProjects(updatedProjects);
        console.log('Projects persisted successfully');
      } catch (persistError) {
        console.error('Error persisting projects:', persistError);
        // Don't fail the operation, just log the error
      }
      
      const successMsg = `Project "${newProject.name}" created successfully`;
      console.log(successMsg);
      setSnackbar({
        visible: true,
        message: successMsg,
        type: 'success'
      });
      
      // Close the modal
      console.log('Closing create modal');
      setIsCreateModalOpen(false);
      
      // Select the new project
      console.log('Selecting new project with ID:', newProject.id);
      handleProjectSelect(newProject.id);
      
      console.groupEnd();
      return { success: true, project: newProject };
    } catch (error) {
      console.error('Error creating project:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      const errorMessage = error.message || 'Failed to create project';
      
      setSnackbar({
        visible: true,
        message: errorMessage,
        type: 'error'
      });
      
      console.groupEnd();
      return { success: false, error: errorMessage };
    } finally {
      console.log('Cleaning up create project state');
      setIsCreating(false);
      console.groupEnd();
    }
  };
  
  // Handle project selection with multi-tiered persistence
  const handleProjectSelect = async (projectId) => {
    if (!projectId) {
      console.warn('No project ID provided to handleProjectSelect');
      return;
    }
    
    // Ensure projects array is not null or undefined
    if (!projects || !Array.isArray(projects)) {
      console.error('Projects array is not properly initialized');
      setSnackbar({
        visible: true,
        message: 'Failed to select project: Projects not loaded',
        type: 'error'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // First try to find the project in current state
      let selectedProject = projects.find(p => p.id === projectId);
      
      // If not found, try to refresh the projects list once
      if (!selectedProject) {
        console.log('Project not found in current state, refreshing projects...');
        try {
          const result = await fetchProjects(apiEndpoint);
          const refreshedProjects = result.projects || [];
          
          if (refreshedProjects && Array.isArray(refreshedProjects)) {
            selectedProject = refreshedProjects.find(p => p.id === projectId);
            
            if (selectedProject) {
              // Update local state with refreshed projects
              setProjects(refreshedProjects);
              setFilteredProjects(refreshedProjects);
            } else {
              console.warn('Project still not found after refresh:', projectId);
            }
          } else {
            console.error('Invalid projects data received:', result);
          }
        } catch (refreshError) {
          console.error('Error refreshing projects:', refreshError);
        }
      }
      
      if (!selectedProject) {
        console.error('Selected project not found after refresh:', {
          projectId,
          availableProjectIds: projects.map(p => p.id)
        });
        throw new Error(`Project with ID ${projectId} not found`);
      }
      
      // Update selected project ID after we've verified it exists
      setSelectedProjectId(projectId);
      
      // Update last accessed timestamp
      const updatedProject = {
        ...selectedProject,
        lastAccessed: Date.now()
      };
      
      // Update in local state
      const updatedProjects = projects.map(p => 
        p.id === projectId ? updatedProject : p
      );
      
      setProjects(updatedProjects);
      
      // Persist updated projects
      await persistProjects(updatedProjects);
      
      // If project has a path, try to open it
      let projectFiles = [];
      
      if (updatedProject.path) {
        try {
          // First try to open the project folder
          const openResponse = await fetch(`${apiEndpoint}/project/open_folder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              folder_path: updatedProject.path
            })
          });
          
          if (!openResponse.ok) {
            throw new Error(`Failed to open project folder: ${openResponse.statusText}`);
          }
          
          // Then get the project files
          const filesResponse = await fetch(`${apiEndpoint}/project/${encodeURIComponent(projectId)}/files`);
          
          if (!filesResponse.ok) {
            throw new Error(`Failed to load project files: ${filesResponse.statusText}`);
          }
          
          const data = await filesResponse.json();
          projectFiles = data.files || [];
          
          // Update the project with the loaded files
          updatedProject.files = projectFiles;
          
          // Call the onProjectSelect callback with the updated project and files
          if (onProjectSelect) {
            onProjectSelect({
              ...updatedProject,
              files: projectFiles
            });
          }
          
          // Show success message
          showToast(`Project '${updatedProject.name}' loaded successfully`, 'success');
          
          // Close the project dashboard if it's open
          if (onClose) {
            onClose();
          }
        } catch (error) {
          console.error('Error opening project:', error);
          showToast(`Error opening project: ${error.message}`, 'error');
          
          // If opening via API fails, still try to pass the project to the parent
          // in case it can handle it differently (e.g., local file system access)
          if (onProjectSelect) {
            onProjectSelect(updatedProject);
          }
        }
      } else {
        // If no path, just pass the project to the parent
        if (onProjectSelect) {
          onProjectSelect(updatedProject);
        }
      }
    } catch (error) {
      console.error('Error in handleProjectSelect:', error);
      setSnackbar({
        visible: true,
        message: `Error selecting project: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      setIsLoading(true);
      
      // Attempt to delete from the server if API is available
      if (apiStatus.status === 'online') {
        await deleteProject(projectToDelete.id, apiEndpoint);
      }
      
      // Remove from local state regardless of API status
      const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
      setProjects(updatedProjects);
      
      // Update filtered projects
      setFilteredProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      
      // Persist to all storage layers
      persistProjects(updatedProjects);
      
      // Show feedback
      setSnackbar({
        visible: true,
        message: `Project "${projectToDelete.name}" was deleted`,
        type: 'success'
      });
      
      // Close modal
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      
      setSnackbar({
        visible: true,
        message: `Failed to delete project: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle dashboard close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
  
  // Handle new project creation with template support (legacy)
  // This is now handled by the unified handleCreateProject function
  const createProjectWithTemplate = async (templateId) => {
    try {
      // Implementation of template-based project creation
      const newProject = {
        id: `project-${Date.now()}`,
        name: `New Project from ${templateId}`,
        type: templateId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        // Add other required project fields with default values
        tags: [],
        favorite: false,
        status: 'active',
        files: [
          { name: 'README.md', type: 'file', content: `# New Project from ${templateId}` },
          { name: 'src', type: 'directory', children: [] }
        ]
      };

      // Create updated projects array with new project
      const updatedProjects = [newProject, ...(projects || [])];
      
      // Update state with new projects
      setProjects(updatedProjects);
      
      // Update filtered projects
      if (!activeFilter || activeFilter === 'all' || activeFilter === 'recent' || 
          newProject.tags?.includes(activeFilter) || newProject.type === activeFilter) {
        setFilteredProjects(prev => [newProject, ...(prev || [])]);
      }
      
      // Persist the updated projects
      await persistProjects(updatedProjects);
      
      // Show success message
      setSnackbar({
        visible: true,
        message: `Project created from template: ${templateId}`,
        type: 'success'
      });
      
      return { success: true, project: newProject };
    } catch (error) {
      console.error('Failed to create project from template:', error);
      
      setSnackbar({
        visible: true,
        message: `Failed to create project: ${error.message}`,
        type: 'error'
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={dashboardRef}
      className="project-dashboard"
      tabIndex="0"
      onKeyDown={handleKeyPress}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        zIndex: 1000,
        boxSizing: 'border-box',
        overflowY: 'auto',
        color: isDarkMode ? '#e8ecf3' : '#2c3e50',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
        visibility: 'visible',
        opacity: 1
      }}
    >
      {/* Header */}
      <header className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: isDarkMode ? '1px solid #2d3348' : '1px solid #edf2f7',
        paddingBottom: '16px'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '24px',
          color: isDarkMode ? '#e8ecf3' : '#2c3e50'
        }}>
          Projects
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsCodingDashboardOpen(true)}
            style={{
              backgroundColor: isDarkMode ? '#2d3348' : '#f1f5f9',
              color: isDarkMode ? '#e8ecf3' : '#4b5563',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: isDarkMode ? '#3d4663' : '#e2e8f0',
              }
            }}
          >
            <FiCode /> Coding Dashboard
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              backgroundColor: isDarkMode ? '#3d71e3' : '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              ':hover': {
                backgroundColor: isDarkMode ? '#4d7cff' : '#3b78e7',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <span>+</span> New Project
          </button>
        </div>
      </header>
      
      {/* Project Filters */}
      <ProjectFilters
        searchQuery={searchQuery}
        onSearch={query => {
          setSearchQuery(query);
          // Re-filter projects when search changes
          const filtered = searchQuery ? searchProjects(projects, query) : projects;
          setFilteredProjects(filtered);
        }}
        currentSortOption={sortOption}
        onSortChange={option => {
          setSortOption(option);
          // Re-sort projects when sort option changes
          const newFilteredProjects = [...filteredProjects];
          
          switch (option) {
            case 'recent':
              newFilteredProjects.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
              break;
            case 'created':
              newFilteredProjects.sort((a, b) => {
                const bCreated = b.createdAt || b.created_at || 0;
                const aCreated = a.createdAt || a.created_at || 0;
                return bCreated - aCreated;
              });
              break;
            case 'alphabetical':
              newFilteredProjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
              break;
            case 'favorites':
              newFilteredProjects.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
              break;
            case 'language':
              newFilteredProjects.sort((a, b) => (a.language || '').localeCompare(b.language || ''));
              break;
          }
          
          setFilteredProjects(newFilteredProjects);
        }}
        onLanguageFilterChange={filter => {
          setLanguageFilter(filter);
          // Re-filter projects when language filter changes
          const filtered = applyFilters(projects, filter, dateFilter, statusFilter);
          setFilteredProjects(filtered);
        }}
        onDateFilterChange={filter => {
          setDateFilter(filter);
          // Re-filter projects when date filter changes
          const filtered = applyFilters(projects, languageFilter, filter, statusFilter);
          setFilteredProjects(filtered);
        }}
        onStatusFilterChange={filter => {
          setStatusFilter(filter);
          // Re-filter projects when status filter changes
          const filtered = applyFilters(projects, languageFilter, dateFilter, filter);
          setFilteredProjects(filtered);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Main content */}
      <div className="dashboard-content" ref={containerRef}>
        {isLoading ? (
          <LoadingState message="Loading projects..." isDarkMode={isDarkMode} />
        ) : error ? (
          <ErrorState message={error} isDarkMode={isDarkMode} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState 
            message={searchQuery ? "No projects match your search" : "No projects yet"}
            actionText={searchQuery ? "Clear search" : "Create your first project"}
            onAction={searchQuery ? () => setSearchQuery('') : () => setIsCreateModalOpen(true)}
            isDarkMode={isDarkMode}
          />
        ) : (
          <TransitionContainer>
            {layoutMode === 'grid' ? (
              <ProjectGrid
                projects={filteredProjects}
                onSelect={handleProjectSelect}
                selectedProjectId={selectedProjectId}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={project => {
                  setProjectToDelete(project);
                  setIsDeleteModalOpen(true);
                }}
                isDarkMode={isDarkMode}
              />
            ) : (
              <VirtualizedProjectList
                projects={filteredProjects}
                onSelect={handleProjectSelect}
                selectedProjectId={selectedProjectId}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={project => {
                  setProjectToDelete(project);
                  setIsDeleteModalOpen(true);
                }}
                containerHeight={containerHeight}
                isDarkMode={isDarkMode}
              />
            )}
          </TransitionContainer>
        )}
      </div>

      {/* Project Creation Modal */}
      <ProjectCreationModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
        apiStatus={apiStatus}
      />

      {/* Coding Dashboard */}
      <CodingDashboard
        isOpen={isCodingDashboardOpen}
        onClose={() => setIsCodingDashboardOpen(false)}
        projectId={selectedProjectId}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && projectToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1200
        }}>
          <DeleteConfirmationModal 
            project={projectToDelete}
            onDelete={handleDeleteProject}
            onCancel={() => setIsDeleteModalOpen(false)}
            isDarkMode={isDarkMode}
          />
        </div>
      )}
    </div>
  );
};

// Helper function to apply all filters at once
const applyFilters = (allProjects, language, date, status) => {
  let filtered = [...allProjects];
  
  // Apply language filter
  if (language !== 'all') {
    filtered = filtered.filter(project => {
      return project.language === language || 
             project.techStack?.includes(language) || 
             project.tags?.includes(language);
    });
  }
  
  // Apply date filter
  if (date !== 'all') {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    filtered = filtered.filter(project => {
      const createdAt = project.createdAt || project.created_at || 0;
      if (date === 'today') {
        return (now - createdAt) < dayInMs;
      } else if (date === 'week') {
        return (now - createdAt) < (7 * dayInMs);
      } else if (date === 'month') {
        return (now - createdAt) < (30 * dayInMs);
      }
      return true;
    });
  }
  
  // Apply status filter
  if (status !== 'all') {
    filtered = filtered.filter(project => {
      if (status === 'complete') {
        return project.status === 'complete' || project.progress === 100;
      } else if (status === 'in-progress') {
        return project.status === 'in-progress' || (project.progress > 0 && project.progress < 100);
      } else if (status === 'not-started') {
        return project.status === 'not-started' || project.progress === 0;
      }
      return true;
    });
  }
  
  return filtered;
};

export default Dashboard;
