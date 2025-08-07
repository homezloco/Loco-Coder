import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectProvider, useProject } from '../NewProjectContext';
import { AuthProvider } from '../NewAuthContext';
import { ApiProvider } from '../NewApiContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAllKeys: jest.fn(() => Object.keys(store)),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock API context
jest.mock('../NewApiContext', () => ({
  ...jest.requireActual('../NewApiContext'),
  useApi: () => ({
    createProject: jest.fn().mockResolvedValue({ id: 'server-project-123', name: 'Test Project' }),
    getProjects: jest.fn().mockResolvedValue([]),
    getProject: jest.fn().mockResolvedValue(null),
  }),
}));

// Test component that uses the project context
const TestComponent = () => {
  const { 
    currentProject, 
    projects, 
    createProject, 
    loading,
    error 
  } = useProject();

  return (
    <div>
      <div data-testid="loading-state">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error-state">{error || 'No Error'}</div>
      <div data-testid="projects-count">{projects.length}</div>
      <div data-testid="current-project">{currentProject ? currentProject.name : 'No Project'}</div>
      <button 
        data-testid="create-project-btn" 
        onClick={() => createProject('New Test Project', 'javascript')}
      >
        Create Project
      </button>
    </div>
  );
};

// Wrapper component with all required providers
const AllProviders = ({ children }) => (
  <AuthProvider>
    <ApiProvider>
      <ProjectProvider>
        {children}
      </ProjectProvider>
    </ApiProvider>
  </AuthProvider>
);

describe('NewProjectContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('should create a project when authenticated', async () => {
    // Mock authenticated state
    jest.mock('../NewAuthContext', () => ({
      ...jest.requireActual('../NewAuthContext'),
      useAuth: () => ({
        isAuthenticated: true,
        user: { username: 'testuser' },
      }),
    }));

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    // Verify initial state
    expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
    expect(screen.getByTestId('current-project')).toHaveTextContent('No Project');

    // Create a project
    await act(async () => {
      userEvent.click(screen.getByTestId('create-project-btn'));
    });

    // Verify project was created
    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-project')).not.toHaveTextContent('No Project');
    });
  });

  test('should create a local project when not authenticated', async () => {
    // Mock unauthenticated state
    jest.mock('../NewAuthContext', () => ({
      ...jest.requireActual('../NewAuthContext'),
      useAuth: () => ({
        isAuthenticated: false,
        user: null,
      }),
    }));

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    // Verify initial state
    expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
    expect(screen.getByTestId('current-project')).toHaveTextContent('No Project');

    // Create a project
    await act(async () => {
      userEvent.click(screen.getByTestId('create-project-btn'));
    });

    // Verify local project was created
    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-project')).not.toHaveTextContent('No Project');
      
      // Verify localStorage was used
      expect(localStorage.setItem).toHaveBeenCalled();
      
      // Check that the project ID starts with 'local_'
      const storageKeys = localStorage.getAllKeys();
      const projectKeys = storageKeys.filter(key => key.includes('project_'));
      expect(projectKeys.length).toBeGreaterThan(0);
      
      // At least one key should contain a local project
      const localProjectExists = storageKeys.some(key => 
        key.includes('project_') && localStorage.getItem(key).includes('local_')
      );
      expect(localProjectExists).toBe(true);
    });
  });

  test('should load projects from localStorage when not authenticated', async () => {
    // Setup mock localStorage with a project
    const mockProject = {
      id: 'local_12345',
      name: 'Local Test Project',
      techStack: 'javascript',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: []
    };
    
    localStorage.setItem('projects_index', JSON.stringify(['local_12345']));
    localStorage.setItem('project_local_12345', JSON.stringify(mockProject));

    // Mock unauthenticated state
    jest.mock('../NewAuthContext', () => ({
      ...jest.requireActual('../NewAuthContext'),
      useAuth: () => ({
        isAuthenticated: false,
        user: null,
      }),
    }));

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    // Verify projects are loaded from localStorage
    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('1');
      expect(localStorage.getItem).toHaveBeenCalledWith('projects_index');
      expect(localStorage.getItem).toHaveBeenCalledWith('project_local_12345');
    });
  });
});
