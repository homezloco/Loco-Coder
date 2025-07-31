import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import api from '../index';

// Mock the fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Module', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockReset();
    
    // Set up Pinia for state management
    setActivePinia(createPinia());
    
    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth Module', () => {
    it('should handle successful login', async () => {
      const mockResponse = {
        user: { id: 1, email: 'test@example.com' },
        token: 'test-token',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.auth.login('test@example.com', 'password123');
      
      expect(result).toEqual(mockResponse);
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      await expect(api.auth.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Projects Module', () => {
    it('should fetch projects', async () => {
      const mockProjects = [{ id: 1, name: 'Test Project' }];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const projects = await api.projects.getProjects();
      expect(projects).toEqual(mockProjects);
    });

    it('should create a project', async () => {
      const newProject = { name: 'New Project' };
      const createdProject = { id: 1, ...newProject };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdProject,
      });

      const result = await api.projects.createProject(newProject);
      expect(result).toEqual(createdProject);
    });
  });

  describe('Files Module', () => {
    it('should read a file', async () => {
      const fileContent = 'Test file content';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => fileContent,
      });

      const content = await api.files.readFile(1, 'test.txt');
      expect(content).toBe(fileContent);
    });

    it('should write to a file', async () => {
      const filePath = 'test.txt';
      const content = 'New content';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(api.files.writeFile(1, filePath, content)).resolves.toEqual({ success: true });
    });
  });

  describe('Templates Module', () => {
    it('should fetch templates', async () => {
      const mockTemplates = [
        { id: 1, name: 'Template 1' },
        { id: 2, name: 'Template 2' },
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const templates = await api.templates.getTemplates();
      expect(templates).toEqual(mockTemplates);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(api.projects.getProjects()).rejects.toThrow('Network error');
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(api.projects.getProjects()).rejects.toThrow('Unauthorized');
      // Verify auth store was cleared on 401
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Token Management', () => {
    it('should set and get auth token', () => {
      api.setAuthToken('test-token', true);
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      
      // Mock localStorage.getItem
      Storage.prototype.getItem = vi.fn(() => 'test-token');
      
      const token = api.getAuthToken();
      expect(token).toBe('test-token');
    });

    it('should clear auth token', () => {
      api.clearAuthToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });
});
