import { renderHook, act } from '@testing-library/react-hooks';
import { ProjectProvider, useProject } from '../NewProjectContext';
import { AuthProvider } from '../NewAuthContext';
import { ApiProvider } from '../NewApiContext';
import { vi } from 'vitest';

// Mock the API responses
const mockApi = {
  projects: {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
};

// Mock the auth context
const mockAuth = {
  isAuthenticated: true,
  user: { id: 'user-123' },
};

// Wrapper component to provide all necessary contexts
const AllTheProviders = ({ children }) => (
  <ApiProvider value={mockApi}>
    <AuthProvider value={mockAuth}>
      <ProjectProvider>
        {children}
      </ProjectProvider>
    </AuthProvider>
  </ApiProvider>
);

describe('ProjectContext', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();

    global.localStorage = localStorageMock;
    
    // Default mock implementations
    mockApi.projects.getProjects.mockResolvedValue([
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' },
    ]);
    
    mockApi.projects.getProject.mockImplementation((id) => 
      Promise.resolve({ id, name: `Project ${id}` })
    );
    
    mockApi.projects.createProject.mockImplementation((data) => 
      Promise.resolve({ id: 'new-id', ...data })
    );
    
    mockApi.projects.updateProject.mockImplementation((id, updates) => 
      Promise.resolve({ id, name: updates.name || `Updated Project ${id}` })
    );
    
    mockApi.projects.deleteProject.mockResolvedValue(true);
  });

  it('should load projects', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.projects).toEqual([]);

    // Wait for projects to load
    await waitForNextUpdate();

    // After loading
    expect(result.current.loading).toBe(false);
    expect(result.current.projects).toHaveLength(2);
    expect(mockApi.projects.getProjects).toHaveBeenCalledTimes(1);
  });

  it('should handle project creation', async () => {
    const newProject = { name: 'New Project', description: 'A new project' };
    const { result } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      await result.current.createProject(newProject);
    });

    expect(mockApi.projects.createProject).toHaveBeenCalledWith(newProject);
    expect(result.current.projects).toContainEqual(
      expect.objectContaining({ id: 'new-id', ...newProject })
    );
  });

  it('should load a single project', async () => {
    const projectId = 'test-123';
    const { result } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    await act(async () => {
      const project = await result.current.loadProject(projectId);
      expect(project).toEqual({
        id: projectId,
        name: `Project ${projectId}`,
      });
    });

    expect(mockApi.projects.getProject).toHaveBeenCalledWith(projectId);
    expect(result.current.currentProject).toEqual({
      id: projectId,
      name: `Project ${projectId}`,
    });
  });

  it('should update a project', async () => {
    const projectId = '1';
    const updates = { name: 'Updated Project' };
    const { result } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    // First load the project
    await act(async () => {
      await result.current.loadProject(projectId);
    });

    // Then update it
    await act(async () => {
      const updated = await result.current.updateProject(projectId, updates);
      expect(updated).toEqual({
        id: projectId,
        name: updates.name,
      });
    });

    expect(mockApi.projects.updateProject).toHaveBeenCalledWith(projectId, updates);
    expect(result.current.currentProject).toEqual({
      id: projectId,
      name: updates.name,
    });
  });

  it('should delete a project', async () => {
    const projectId = '1';
    const { result } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = () => true;

    // Load some projects first
    await act(async () => {
      await result.current.loadProjects();
    });

    // Then delete one
    await act(async () => {
      const success = await result.current.deleteProject(projectId);
      expect(success).toBe(true);
    });

    expect(mockApi.projects.deleteProject).toHaveBeenCalledWith(projectId);
    expect(result.current.projects).not.toContainEqual(
      expect.objectContaining({ id: projectId })
    );

    // Restore window.confirm
    window.confirm = originalConfirm;
  });

  it('should handle errors when loading projects', async () => {
    const errorMessage = 'Failed to load projects';
    mockApi.projects.getProjects.mockRejectedValueOnce(new Error(errorMessage));
    
    const { result, waitForNextUpdate } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    await waitForNextUpdate();

    expect(result.current.error).toBeDefined();
    expect(result.current.error.message).toContain(errorMessage);
    expect(result.current.loading).toBe(false);
  });

  it('should use cached projects when available', async () => {
    const cachedProjects = [
      { id: 'cached-1', name: 'Cached Project 1' },
      { id: 'cached-2', name: 'Cached Project 2' },
    ];
    
    // Mock localStorage to return cached projects
    localStorage.setItem('projects', JSON.stringify(cachedProjects));
    localStorage.setItem('projects_last_fetch', Date.now().toString());
    
    const { result, waitForNextUpdate } = renderHook(() => useProject(), {
      wrapper: AllTheProviders,
    });

    // Should not call the API immediately due to cache
    expect(mockApi.projects.getProjects).not.toHaveBeenCalled();
    
    // Force refresh to get from API
    await act(async () => {
      await result.current.loadProjects(true);
    });
    
    // Now it should call the API
    expect(mockApi.projects.getProjects).toHaveBeenCalled();
  });
});
