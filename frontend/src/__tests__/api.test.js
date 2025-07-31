import * as api from '../services/api/auth';

describe('API Service', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  global.localStorage = localStorageMock;

  // Mock fetch
  global.fetch = jest.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset auth token
    api.setAuthToken(null);
  });

  describe('getAuthToken', () => {
    it('should return token from memory if available', async () => {
      // Set token in memory
      const testToken = 'test-token-123';
      api.setAuthToken(testToken);
      
      const token = await api.getAuthToken();
      expect(token).toBe(testToken);
    });

    it('should return token from localStorage if not in memory', async () => {
      const testToken = 'test-token-456';
      localStorageMock.getItem.mockImplementation((key) => 
        key === 'token' ? testToken : null
      );
      
      const token = await api.getAuthToken();
      expect(token).toBe(testToken);
      expect(authToken).toBe(testToken); // Should be cached in memory
    });

    it('should return empty string if no token is available', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const token = await api.getAuthToken();
      expect(token).toBe('');
    });
  });

  describe('createProject', () => {
    it('should throw an error if not authenticated', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      await expect(api.createProject({ name: 'Test Project' }))
        .rejects
        .toThrow('Authentication required');
    });

    it('should create a project with valid token', async () => {
      const testToken = 'test-token-789';
      const testProject = { 
        name: 'Test Project',
        description: 'Test Description',
        template: 'web'
      };
      
      // Mock successful response
      const mockResponse = {
        id: '123',
        ...testProject,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      // Set auth token
      api.setAuthToken(testToken);
      
      const result = await api.createProject(testProject);
      
      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/projects',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            name: testProject.name,
            description: testProject.description,
            project_type: testProject.template,
            config: {},
            tags: [],
            created_at: expect.any(String),
            updated_at: expect.any(String)
          }),
          credentials: 'include'
        })
      );
      
      // Verify the returned data
      expect(result).toEqual(mockResponse);
    });
  });
});
