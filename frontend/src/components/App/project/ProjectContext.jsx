import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  getProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  getProjectFiles,
  saveProjectFile
} from '../../../api/projects';
import { showToast } from '../../feedback/Toast';

export const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all projects
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getProjects();
      setProjects(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
      showToast('Failed to load projects', 'error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load a specific project's files
  const loadProjectFiles = useCallback(async (projectId) => {
    try {
      setIsLoading(true);
      const files = await getProjectFiles(projectId);
      setProjectFiles(files);
      setError(null);
      return files;
    } catch (err) {
      console.error('Failed to load project files:', err);
      setError('Failed to load project files');
      showToast('Failed to load project files', 'error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new project
  const addProject = useCallback(async (projectData) => {
    try {
      setIsLoading(true);
      const newProject = await createProject(projectData);
      setProjects(prev => [...prev, newProject]);
      setCurrentProject(newProject);
      showToast('Project created successfully', 'success');
      return newProject;
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('Failed to create project');
      showToast('Failed to create project', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update an existing project
  const updateExistingProject = useCallback(async (projectId, updates) => {
    try {
      setIsLoading(true);
      const updatedProject = await updateProject(projectId, updates);
      setProjects(prev => 
        prev.map(proj => proj.id === projectId ? updatedProject : proj)
      );
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProject);
      }
      showToast('Project updated successfully', 'success');
      return updatedProject;
    } catch (err) {
      console.error('Failed to update project:', err);
      setError('Failed to update project');
      showToast('Failed to update project', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  // Delete a project
  const removeProject = useCallback(async (projectId) => {
    try {
      setIsLoading(true);
      await deleteProject(projectId);
      setProjects(prev => prev.filter(proj => proj.id !== projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setProjectFiles([]);
      }
      showToast('Project deleted successfully', 'success');
      return true;
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project');
      showToast('Failed to delete project', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  // Save a file in the current project
  const saveFile = useCallback(async (fileData) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }
    
    try {
      setIsLoading(true);
      const savedFile = await saveProjectFile(currentProject.id, fileData);
      
      // Update project files
      setProjectFiles(prev => {
        const existingFileIndex = prev.findIndex(f => f.path === fileData.path);
        if (existingFileIndex >= 0) {
          const updated = [...prev];
          updated[existingFileIndex] = savedFile;
          return updated;
        }
        return [...prev, savedFile];
      });
      
      return savedFile;
    } catch (err) {
      console.error('Failed to save file:', err);
      setError('Failed to save file');
      showToast('Failed to save file', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  // Load initial data
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const value = {
    projects,
    currentProject,
    projectFiles,
    isLoading,
    error,
    loadProjects,
    loadProjectFiles,
    addProject,
    updateProject: updateExistingProject,
    deleteProject: removeProject,
    saveFile,
    setCurrentProject
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

ProjectProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;
