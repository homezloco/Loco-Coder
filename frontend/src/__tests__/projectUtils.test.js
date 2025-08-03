import { fetchProjects, getIndexedDBService } from '../components/ProjectDashboard/projectUtils';

// Mock the module to avoid side effects
jest.mock('../components/ProjectDashboard/projectUtils', () => {
  const originalModule = jest.requireActual('../components/ProjectDashboard/projectUtils');
  
  return {
    ...originalModule,
    // Mock getIndexedDBService to avoid real IndexedDB operations in tests
    getIndexedDBService: jest.fn(() => ({
      getProjects: jest.fn()
    }))
  };
});

// Mock localStorage and sessionStorage
const storageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Mock window.api
const mockApi = {
  getAuthToken: jest.fn(),
  clearAuthToken: jest.fn()
};

// Set up global mocks
Object.defineProperty(global, 'localStorage', {
  value: storageMock,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: storageMock,
  writable: true
});

// Mock window object
global.window = {
  ...global.window,
  api: mockApi,
  location: { href: 'http://localhost:3000' }
};

// Mock fetch
global.fetch = jest.fn();

describe('fetchProjects', () => {
  const mockProjects = [
    { id: '1', name: 'Test Project 1' },
    { id: '2', name: 'Test Project 2' }
  ];

  const mockToken = 'test-token-123';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorage.clear();
    
    // Reset window.api mocks
    mockApi.getAuthToken.mockReset();
    mockApi.clearAuthToken.mockReset();
  });

  it('should fetch projects successfully with token from window.api', async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset fetch mock implementation
    global.fetch.mockReset();
    // Mock successful API response
    const mockResponse = { projects: mockProjects };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })
    );

    // Mock token from window.api
    mockApi.getAuthToken.mockResolvedValue(mockToken);

    const result = await fetchProjects('http://localhost:8000');

    expect(result).toEqual({
      projects: mockProjects,
      source: 'api',
      error: null
    });

    // Verify fetch was called with correct headers
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/projects',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }),
        credentials: 'include'
      })
    );
  });

  it('should fetch projects with token from localStorage', async () => {
    // Mock successful API response
    const mockResponse = { projects: mockProjects };
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })
    );

    // Mock token in localStorage
    localStorage.setItem('auth_token', mockToken);

    const result = await fetchProjects('http://localhost:8000');

    expect(result).toEqual({
      projects: mockProjects,
      source: 'api',
      error: null
    });
  });

  it('should handle 401 Unauthorized by clearing token and redirecting to login', async () => {
    // Mock 401 response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })
    );

    // Mock window.location.href
    delete window.location;
    window.location = { href: 'http://localhost:3000/dashboard' };

    // Mock token from window.api
    mockApi.getAuthToken.mockResolvedValue(mockToken);
    mockApi.clearAuthToken.mockResolvedValue();

    await expect(fetchProjects('http://localhost:8000')).rejects.toThrow('Authentication required');

    // Verify token was cleared
    expect(mockApi.clearAuthToken).toHaveBeenCalled();
    
    // Verify redirect to login
    expect(window.location.href).toBe('/login');
  });

  it('should retry failed requests up to maxRetries', async () => {
    // Mock failing requests that eventually succeed
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ projects: mockProjects })
      });

    const result = await fetchProjects('http://localhost:8000', { 
      maxRetries: 2,
      retryDelay: 10 // Shorter delay for testing
    });

    expect(result).toEqual({
      projects: mockProjects,
      source: 'api',
      error: null
    });

    // Verify fetch was called 3 times (initial + 2 retries)
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should fall back to IndexedDB when API is unavailable', async () => {
    // Mock failed API request
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    // Mock IndexedDB
    const mockIdb = {
      getProjects: jest.fn().mockResolvedValue(mockProjects)
    };
    
    // Replace the getIndexedDBService implementation for this test
    const originalGetIndexedDBService = jest.requireActual('../components/ProjectDashboard/projectUtils').getIndexedDBService;
    jest.mock('../components/ProjectDashboard/projectUtils', () => ({
      ...jest.requireActual('../components/ProjectDashboard/projectUtils'),
      getIndexedDBService: jest.fn(() => mockIdb)
    }));

    const result = await fetchProjects('http://localhost:8000');

    expect(result).toEqual({
      projects: mockProjects,
      source: 'indexeddb',
      error: expect.stringContaining('Network error')
    });

    // Restore original implementation
    jest.requireMock('../components/ProjectDashboard/projectUtils').getIndexedDBService = originalGetIndexedDBService;
  });
});
