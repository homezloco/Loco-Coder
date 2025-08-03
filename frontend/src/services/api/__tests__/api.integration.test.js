import api from '../new-api';
import { fetchWithTimeout } from '../utils/fetch';
import { getAuthToken, clearAuthData } from '../utils/token';

// Mock the fetch utilities
jest.mock('../utils/fetch');
jest.mock('../utils/token');

describe('API Client Integration', () => {
  const mockToken = 'test-token';
  const mockRefreshToken = 'test-refresh-token';
  const mockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    clone: function() { return this; }
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup auth token
    getAuthToken.mockReturnValue(mockToken);
    
    // Default mock for fetchWithTimeout
    fetchWithTimeout.mockResolvedValue(mockResponse({}));
  });

  describe('Authentication', () => {
    it('should handle successful login', async () => {
      const userData = { id: 1, username: 'testuser' };
      const responseData = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        user: userData,
        expiresIn: 3600
      };
      
      fetchWithTimeout.mockResolvedValueOnce(mockResponse(responseData));
      
      const result = await api.login('testuser', 'password');
      
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          skipAuth: true
        })
      );
      
      expect(result).toEqual(responseData);
    });

    it('should handle logout', async () => {
      await api.logout();
      
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`
          })
        })
      );
      
      expect(clearAuthData).toHaveBeenCalled();
    });
  });

  describe('Project Operations', () => {
    it('should fetch projects', async () => {
      const projects = [{ id: 1, name: 'Test Project' }];
      fetchWithTimeout.mockResolvedValueOnce(mockResponse(projects));
      
      const result = await api.getProjects();
      
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/projects'),
        expect.objectContaining({
          method: 'GET'
        })
      );
      
      expect(result).toEqual(projects);
    });

    it('should create a project', async () => {
      const projectData = { name: 'New Project' };
      const createdProject = { id: 2, ...projectData };
      
      fetchWithTimeout.mockResolvedValueOnce(mockResponse(createdProject, 201));
      
      const result = await api.createProject(projectData);
      
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/projects'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(projectData)
        })
      );
      
      expect(result).toEqual(createdProject);
    });
  });

  describe('File Operations', () => {
    it('should get project files', async () => {
      const files = [{ path: 'test.txt', content: 'test' }];
      const projectId = '123';
      
      fetchWithTimeout.mockResolvedValueOnce(mockResponse(files));
      
      const result = await api.getProjectFiles(projectId);
      
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining(`/projects/${projectId}/files`),
        expect.objectContaining({
          method: 'GET'
        })
      );
      
      expect(result).toEqual(files);
    });

    it('should handle file upload', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const projectId = '123';
      const filePath = 'uploads/test.txt';
      
      fetchWithTimeout.mockResolvedValueOnce(mockResponse({ path: filePath }));
      
      const result = await api.uploadFile(projectId, file);
      
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining(`/projects/${projectId}/files`),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
      
      expect(result).toEqual({ path: filePath });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const errorResponse = {
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid input' })
      };
      
      fetchWithTimeout.mockResolvedValueOnce({
        ...errorResponse,
        ok: false,
        clone: () => errorResponse
      });
      
      await expect(api.getProjects())
        .rejects
        .toMatchObject({
          status: 400,
          message: 'Bad Request'
        });
    });

    it('should handle network errors', async () => {
      fetchWithTimeout.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(api.getProjects())
        .rejects
        .toThrow('Network error');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when expired', async () => {
      // First call fails with 401
      fetchWithTimeout
        .mockRejectedValueOnce({
          status: 401,
          statusText: 'Unauthorized'
        })
        // Token refresh succeeds
        .mockResolvedValueOnce(mockResponse({
          token: 'new-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600
        }))
        // Retried request succeeds
        .mockResolvedValueOnce(mockResponse([{ id: 1, name: 'Project' }]));
      
      // Mock token refresh
      getAuthToken
        .mockReturnValueOnce('expired-token') // Initial token
        .mockReturnValueOnce('expired-token') // Check in fetchWithTimeout
        .mockReturnValue('new-token');        // After refresh
      
      const result = await api.getProjects();
      
      // Should have made 3 calls: initial, refresh, retry
      expect(fetchWithTimeout).toHaveBeenCalledTimes(3);
      
      // Should have stored new token
      expect(api.setAuthToken).toHaveBeenCalledWith(
        'new-token',
        'new-refresh-token',
        3600
      );
      
      // Should return the successful response
      expect(result).toEqual([{ id: 1, name: 'Project' }]);
    });
  });
});
