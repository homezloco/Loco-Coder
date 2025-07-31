// /project-root/frontend/src/FileBrowser.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './FileBrowser.css'; // We'll create this file for styling

const FileBrowser = ({ 
  files = [], 
  onLoad = () => {}, 
  onSave = () => {}, 
  currentFile = null, 
  projectRoot = '/' 
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  
  // Convert flat file list to hierarchical tree structure
  const buildFileTree = useCallback((fileList) => {
    if (!Array.isArray(fileList)) return { folders: {}, files: [] };
    
    const tree = { folders: {}, files: [] };
    
    fileList.forEach(file => {
      // Handle both string paths and object file structures
      const filePath = typeof file === 'string' ? file : file.path;
      const fileObj = typeof file === 'string' ? { path: file, name: file.split('/').pop() } : file;
      
      const pathParts = filePath.split('/');
      
      // If there's only one part, it's a file in the root directory
      if (pathParts.length === 1) {
        tree.files.push(fileObj);
      } else {
        // We have a file in a subdirectory
        let currentLevel = tree.folders;
        
        // Create folder structure up to the file's parent folder
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folder = pathParts[i];
          if (!currentLevel[folder]) {
            currentLevel[folder] = { folders: {}, files: [] };
          }
          currentLevel = currentLevel[folder].folders;
        }
        
        // Add the file to its parent folder
        const fileName = pathParts[pathParts.length - 1];
        const parentFolder = pathParts[pathParts.length - 2];
        if (parentFolder) {
          if (!tree.folders[parentFolder]) {
            tree.folders[parentFolder] = { folders: {}, files: [] };
          }
          tree.folders[parentFolder].files.push({
            ...fileObj,
            name: fileName
          });
        }
      }
    });
    
    return tree;
  }, []);
  
  // Build and memoize the file tree to prevent unnecessary recalculations
  const fileTree = useMemo(() => buildFileTree(files), [files, buildFileTree]);
  
  // Apply search filter to the file tree
  const getFilteredTree = React.useCallback(() => {
    if (!searchTerm.trim()) return fileTree;
    
    const searchLower = searchTerm.toLowerCase();
    const filterTree = (tree) => {
      const result = { folders: {}, files: [] };
      
      // Filter files
      if (tree.files && Array.isArray(tree.files)) {
        result.files = tree.files.filter(file => 
          file.name && file.name.toLowerCase().includes(searchLower)
        );
      }
      
      // Filter folders recursively
      if (tree.folders && typeof tree.folders === 'object') {
        Object.entries(tree.folders).forEach(([folderName, folderData]) => {
          const filteredFolder = filterTree(folderData);
          if ((filteredFolder.files && filteredFolder.files.length > 0) || 
              (filteredFolder.folders && Object.keys(filteredFolder.folders).length > 0)) {
            result.folders[folderName] = filteredFolder;
          }
        });
      }
      
      return result;
    };
    
    return filterTree(fileTree);
  }, [fileTree, searchTerm]);
  
  // Memoize the filtered tree with proper dependency on fileTree
  const filteredTree = useMemo(() => {
    return searchTerm.trim() ? getFilteredTree() : fileTree;
  }, [searchTerm, getFilteredTree, fileTree]);
  
  // Handle creating a new file
  const handleCreateFile = () => {
    if (!newFileName) return;
    
    onSave(newFileName, '# New file\n# Created: ' + new Date().toLocaleString());
    setNewFileName('');
    setIsCreating(false);
  };
  
  // Toggle folder expansion with useCallback to prevent unnecessary re-renders
  const toggleFolder = useCallback((folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  }, []);
  
  // Filter files and folders based on search term
  const filterTreeBySearch = (tree, searchTerm, currentPath = '') => {
    if (!searchTerm) return tree;
    
    const result = { folders: {}, files: [] };
    
    // Filter files at this level
    result.files = tree.files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Filter and process folders
    Object.keys(tree.folders).forEach(folderName => {
      const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      const filteredSubtree = filterTreeBySearch(tree.folders[folderName], searchTerm, folderPath);
      
      // Include folder if it contains matching files or subfolders with matches
      if (filteredSubtree.files.length > 0 || Object.keys(filteredSubtree.folders).length > 0) {
        result.folders[folderName] = filteredSubtree;
      }
    });
    
    return result;
  };
  
  // Render a folder and its contents recursively
  const renderFolder = (folderName, folderData, path = '', level = 0) => {
    const folderPath = path ? `${path}/${folderName}` : folderName;
    const isExpanded = expandedFolders[folderPath];
    
    return (
      <div key={folderPath} className="folder" style={{ paddingLeft: `${level * 16}px` }}>
        <div 
          className={`folder-header ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={() => toggleFolder(folderPath)}
        >
          <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
          <span className="folder-name">{folderName}</span>
        </div>
        
        {isExpanded && (
          <div className="folder-contents">
            {/* Render subfolders */}
            {Object.entries(folderData.folders).map(([subFolderName, subFolderData]) => 
              renderFolder(subFolderName, subFolderData, folderPath, level + 1)
            )}
            
            {/* Render files in this folder */}
            {folderData.files.map(file => (
              <div 
                key={`${folderPath}/${file.name}`} 
                className={`file ${currentFile === file.path ? 'active' : ''}`}
                onClick={() => onLoad(file.path)}
                style={{ paddingLeft: `${(level + 1) * 16}px` }}
              >
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // Display project root info if available
  const rootInfo = projectRoot ? (
    <div className="project-root">
      <span className="root-icon">📁</span>
      <span className="root-path">{projectRoot}</span>
    </div>
  ) : null;
  
  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <h4>Files</h4>
        <div className="file-browser-actions">
          <button 
            className="new-file-btn" 
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? 'Cancel' : 'New File'}
          </button>
          <button className="open-folder-btn" onClick={() => window.dispatchEvent(new CustomEvent('open-folder-dialog'))}>Open Folder</button>
        </div>
      </div>
      
      {rootInfo}
      
      {isCreating && (
        <div className="new-file-form">
          <input
            type="text"
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            placeholder="filename.py"
          />
          <button onClick={handleCreateFile}>Create</button>
        </div>
      )}

      <div className="file-tree">
        {/* Root level files */}
        {Array.isArray(filteredTree?.files) && filteredTree.files.map(file => (
          <div
            key={file.path}
            className={`file ${currentFile === file.path ? 'active' : ''}`}
            onClick={() => onLoad(file.path)}
          >
            <span className="file-icon">📄</span>
            <span className="file-name">{file.name}</span>
          </div>
        ))}
        
        {/* Root level folders */}
        {filteredTree.folders && Object.entries(filteredTree.folders).map(([folderName, folderData]) => 
          renderFolder(folderName, folderData, 0)
        )}
        
        {/* Empty state */}
        {(!filteredTree?.files?.length && (!filteredTree?.folders || Object.keys(filteredTree.folders).length === 0)) && (
          <div className="no-files">
            {searchTerm ? 'No matching files found' : 'No files yet. Open a project folder to see files.'}
          </div>
        )}
      </div>
    </div>
  );
};

FileBrowser.propTypes = {
  files: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.arrayOf(PropTypes.shape({
      path: PropTypes.string.isRequired,
      name: PropTypes.string
    }))
  ]),
  onLoad: PropTypes.func,
  onSave: PropTypes.func,
  currentFile: PropTypes.string,
  projectRoot: PropTypes.string
};

export default FileBrowser;
