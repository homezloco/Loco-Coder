import React, { useState, useEffect, useContext, useRef } from 'react';
import { FaCode, FaDownload, FaCopy, FaCog, FaExclamationTriangle, FaEye, FaChevronDown, FaChevronRight, FaFolder, FaFileCode, FaSync } from 'react-icons/fa';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import { ProjectContext } from '../../contexts/ProjectContext';
import { PreferencesContext } from '../../contexts/PreferencesContext';
import ProjectFlowNav from '../navigation/ProjectFlowNav';
import './ImplementationEditor.css';
import { API_BASE_URL } from '../../config';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from '../../utils/toast';

/**
 * ImplementationEditor component for generating and displaying implementation code
 * based on the previous steps (ERD, API Design, and Test)
 */
const ImplementationEditor = ({ 
  projectData, 
  updateProjectData, 
  darkMode,
  erdData,
  apiDesignData,
  testData
}) => {
  const [generatedCode, setGeneratedCode] = useState({});
  const [selectedFile, setSelectedFile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [techStack, setTechStack] = useState(preferences?.codeGeneration?.techStack || 'python-fastapi'); // Use saved preference or default
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('structure');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [fileStructure, setFileStructure] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [codeSnippets, setCodeSnippets] = useState([]);
  
  // Refs for code preview modal
  const previewModalRef = useRef(null);
  
  // Get theme context
  const { darkMode: contextDarkMode } = useContext(ThemeContext);
  
  // Get preferences context for persistent settings
  const { preferences, updateCodeGenerationPreferences, updateAdvancedOptions: updatePreferenceOptions } = useContext(PreferencesContext);
  
  // Available technology stacks
  const techStacks = [
    { id: 'python-fastapi', name: 'Python/FastAPI' },
    { id: 'node-express', name: 'Node.js/Express' },
    { id: 'django', name: 'Python/Django' },
    { id: 'spring-boot', name: 'Java/Spring Boot' }
  ];
  
  // Advanced code generation options - use preferences if available
  const [advancedOptions, setAdvancedOptions] = useState(
    preferences?.codeGeneration?.advancedOptions || {
      includeDocumentation: true,
      includeTests: true,
      includeDocker: true,
      optimizeForPerformance: false,
      includeExamples: true
    }
  );

  useEffect(() => {
    // Load implementation data from project if available
    if (projectData && projectData.implementation) {
      setGeneratedCode(projectData.implementation.generatedCode || {});
      setTechStack(projectData.implementation.techStack || 'python-fastapi');
    }
  }, [projectData]);

  // Save implementation data when it changes
  useEffect(() => {
    if (Object.keys(generatedCode).length > 0) {
      updateProjectData({
        implementation: {
          generatedCode,
          techStack
        }
      });
    }
  }, [generatedCode, techStack, updateProjectData]);

  // Generate code based on ERD, API Design, and Test data
  const generateCode = async () => {
    setLoading(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStage('Initializing code generation');
    
    // Simulate progress updates for better UX
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        // Don't go beyond 90% - the final 10% will be set when complete
        const newProgress = prev + (Math.random() * 5);
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 800);
    
    try {
      // Prepare the data for code generation with advanced options
      const codeGenerationData = {
        techStack,
        erd: erdData,
        apiDesign: apiDesignData,
        tests: testData,
        options: advancedOptions
      };
      
      // Update generation stage
      setGenerationStage('Analyzing project requirements');
      await new Promise(r => setTimeout(r, 1000)); // Simulate analysis time
      
      // First try to use the API for code generation
      try {
        setGenerationStage('Connecting to CodeCraft AI service');
        
        const response = await axios.post('/api/v1/projects/generate-code', { code_request: codeGenerationData }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 120000, // 120 seconds timeout for code generation
          onUploadProgress: progressEvent => {
            // Track upload progress
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        });
        
        setGenerationStage('Processing generated code');
        
        if (response.data && response.data.code) {
          // Process the code into a file structure for better navigation
          const fileTree = processCodeIntoFileStructure(response.data.code);
          setFileStructure(fileTree);
          
          // Extract code snippets for dashboard preview
          const snippets = extractCodeSnippets(response.data.code);
          setCodeSnippets(snippets);
          
          setGeneratedCode(response.data.code);
          setSelectedFile(Object.keys(response.data.code)[0] || '');
          
          // Set progress to 100% and show success message
          setGenerationProgress(100);
          setGenerationStage('Code generation complete');
          toast.success('Code successfully generated!');
          
          clearInterval(progressInterval);
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('API code generation failed, falling back to local generation:', apiError);
        setGenerationStage('API unavailable, using local fallback');
        // Continue to fallback implementation
      }
      
      // Fallback: Generate code locally based on tech stack and previous steps
      setGenerationStage('Generating code locally');
      const fallbackCode = generateLocalCode(techStack, erdData, apiDesignData, testData);
      
      // Process the code into a file structure for better navigation
      const fileTree = processCodeIntoFileStructure(fallbackCode);
      setFileStructure(fileTree);
      
      // Extract code snippets for dashboard preview
      const snippets = extractCodeSnippets(fallbackCode);
      setCodeSnippets(snippets);
      
      setGeneratedCode(fallbackCode);
      setSelectedFile(Object.keys(fallbackCode)[0] || '');
      
      // Set progress to 100% and show success message
      setGenerationProgress(100);
      setGenerationStage('Code generation complete (local fallback)');
      toast.success('Code generated using local fallback!');
    } catch (error) {
      console.error('Error generating code:', error);
      
      // Determine error type and provide helpful recovery suggestions
      let errorMessage = 'Failed to generate code.';
      let details = {
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
        suggestions: [
          'Try again in a few moments',
          'Check your network connection',
          'Verify that your project data is complete'
        ]
      };
      
      // Network error
      if (error.message && error.message.includes('Network Error')) {
        details.type = 'network';
        details.message = 'Network connection issue detected';
        details.suggestions = [
          'Check your internet connection',
          'Verify the API server is running',
          'Try again when connection is restored'
        ];
      }
      // API error with response
      else if (error.response) {
        details.type = 'api';
        details.message = `Server error: ${error.response.status} ${error.response.statusText}`;
        
        // Handle specific status codes
        if (error.response.status === 400) {
          details.suggestions = [
            'Check that your project data is valid',
            'Ensure all required fields are completed',
            'Try simplifying your project requirements'
          ];
        } else if (error.response.status === 401 || error.response.status === 403) {
          details.suggestions = [
            'Your session may have expired',
            'Try logging in again',
            'Verify you have permission to perform this action'
          ];
        } else if (error.response.status >= 500) {
          details.suggestions = [
            'The server encountered an error',
            'Wait a few minutes and try again',
            'Contact support if the problem persists'
          ];
        }
      }
      // Data validation error
      else if (error.message && error.message.includes('validation')) {
        details.type = 'validation';
        details.message = 'Your project data contains validation errors';
        details.suggestions = [
          'Review your ERD for inconsistencies',
          'Check API endpoints for missing parameters',
          'Ensure test data matches your API design'
        ];
      }
      
      setError(errorMessage);
      setErrorDetails(details);
      setLoading(false);
      setGenerationProgress(0);
      setGenerationStage('');
      clearInterval(progressInterval);
      
      // Show toast notification with error
      toast.error(`Code generation failed: ${details.message}`);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };
  
  // Process code into a file structure for better navigation
  const processCodeIntoFileStructure = (codeFiles) => {
    const fileTree = [];
    const folderMap = {};
    
    // First pass: create folders
    Object.keys(codeFiles).forEach(filePath => {
      const parts = filePath.split('/');
      let currentPath = '';
      
      // Process all directories in the path
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!folderMap[currentPath]) {
          const folder = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: []
          };
          
          folderMap[currentPath] = folder;
          
          // Add to parent or root
          if (parentPath) {
            folderMap[parentPath].children.push(folder);
          } else {
            fileTree.push(folder);
          }
        }
      }
    });
    
    // Second pass: add files to folders
    Object.keys(codeFiles).forEach(filePath => {
      const parts = filePath.split('/');
      const fileName = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      
      const file = {
        name: fileName,
        path: filePath,
        type: 'file',
        content: codeFiles[filePath]
      };
      
      if (parentPath && folderMap[parentPath]) {
        folderMap[parentPath].children.push(file);
      } else {
        fileTree.push(file);
      }
    });
    
    return fileTree;
  };
  
  // Extract code snippets for dashboard preview
  const extractCodeSnippets = (codeFiles) => {
    const snippets = [];
    
    Object.keys(codeFiles).forEach(filePath => {
      const content = codeFiles[filePath];
      const fileExtension = filePath.split('.').pop().toLowerCase();
      
      // Extract interesting parts based on file type
      if (['py', 'js', 'jsx', 'ts', 'tsx', 'java'].includes(fileExtension)) {
        // Look for classes, functions, or methods
        const lines = content.split('\n');
        let currentSnippet = '';
        let inInterestingBlock = false;
        let blockName = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Detect function/class definitions
          if (line.match(/\b(function|class|def|const|let|var|async)\b/) && 
              line.match(/[\w_]+\s*[\(\{=]/) && 
              !line.match(/^\s*import\b/)) {
            
            // If we were already in a block, save it first
            if (inInterestingBlock && currentSnippet) {
              snippets.push({
                file: filePath,
                name: blockName,
                code: currentSnippet,
                lineNumber: i - currentSnippet.split('\n').length
              });
            }
            
            // Start new block
            inInterestingBlock = true;
            currentSnippet = line;
            
            // Extract name of function/class
            const match = line.match(/\b(function|class|def|const|let|var|async)\s+([\w_]+)/);
            blockName = match ? match[2] : 'Code block';
            
            // Limit number of snippets
            if (snippets.length >= 5) break;
          } else if (inInterestingBlock) {
            currentSnippet += '\n' + line;
            
            // End block after reasonable number of lines or when block ends
            if (currentSnippet.split('\n').length > 15 || 
                (line.match(/^\s*}\s*$/) || line.match(/^\s*\)\s*:?\s*$/))) {
              snippets.push({
                file: filePath,
                name: blockName,
                code: currentSnippet,
                lineNumber: i - currentSnippet.split('\n').length
              });
              inInterestingBlock = false;
              currentSnippet = '';
              
              // Limit number of snippets
              if (snippets.length >= 5) break;
            }
          }
        }
        
        // Add final snippet if we're still in a block
        if (inInterestingBlock && currentSnippet) {
          snippets.push({
            file: filePath,
            name: blockName,
            code: currentSnippet,
            lineNumber: lines.length - currentSnippet.split('\n').length
          });
        }
      }
    });
    
    return snippets;
  };

  // Fallback local code generation based on tech stack and previous steps
  const generateLocalCode = (stack, erd, api, tests) => {
    // This is a simplified example - in a real app, this would be much more sophisticated
    const code = {};
    
    if (stack === 'python-fastapi') {
      code['main.py'] = `from fastapi import FastAPI\nfrom routers import users, items\n\napp = FastAPI()\n\napp.include_router(users.router)\napp.include_router(items.router)\n\n@app.get("/")\ndef read_root():\n    return {"message": "Welcome to the API"}`;
      code['routers/users.py'] = `from fastapi import APIRouter, Depends, HTTPException\nfrom typing import List\nfrom models import User, UserCreate\nfrom services import user_service\n\nrouter = APIRouter(prefix="/users", tags=["users"])\n\n@router.get("/", response_model=List[User])\nasync def get_users():\n    return await user_service.get_all()\n\n@router.post("/", response_model=User)\nasync def create_user(user: UserCreate):\n    return await user_service.create(user)`;
      code['models.py'] = `from pydantic import BaseModel\nfrom typing import Optional\n\nclass UserBase(BaseModel):\n    name: str\n    email: str\n\nclass UserCreate(UserBase):\n    password: str\n\nclass User(UserBase):\n    id: int\n    \n    class Config:\n        from_attributes = True`;
    } else if (stack === 'node-express') {
      code['app.js'] = `const express = require('express');\nconst app = express();\nconst userRoutes = require('./routes/users');\n\napp.use(express.json());\napp.use('/api/users', userRoutes);\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Welcome to the API' });\n});\n\nconst PORT = process.env.PORT || 3000;\napp.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`;
      code['routes/users.js'] = `const express = require('express');\nconst router = express.Router();\nconst userController = require('../controllers/userController');\n\nrouter.get('/', userController.getAllUsers);\nrouter.post('/', userController.createUser);\n\nmodule.exports = router;`;
    } else if (stack === 'django') {
      code['views.py'] = `from django.http import JsonResponse\nfrom django.views import View\nfrom .models import User\nfrom .serializers import UserSerializer\n\nclass UserListView(View):\n    def get(self, request):\n        users = User.objects.all()\n        serializer = UserSerializer(users, many=True)\n        return JsonResponse(serializer.data, safe=False)\n        \n    def post(self, request):\n        serializer = UserSerializer(data=request.POST)\n        if serializer.is_valid():\n            serializer.save()\n            return JsonResponse(serializer.data, status=201)\n        return JsonResponse(serializer.errors, status=400)`;
      code['models.py'] = `from django.db import models\n\nclass User(models.Model):\n    name = models.CharField(max_length=100)\n    email = models.EmailField(unique=True)\n    created_at = models.DateTimeField(auto_now_add=True)\n    \n    def __str__(self):\n        return self.name`;
    } else if (stack === 'spring-boot') {
      code['UserController.java'] = `package com.example.demo.controller;\n\nimport com.example.demo.model.User;\nimport com.example.demo.service.UserService;\nimport org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.web.bind.annotation.*;\n\nimport java.util.List;\n\n@RestController\n@RequestMapping("/api/users")\npublic class UserController {\n\n    @Autowired\n    private UserService userService;\n\n    @GetMapping\n    public List<User> getAllUsers() {\n        return userService.findAll();\n    }\n\n    @PostMapping\n    public User createUser(@RequestBody User user) {\n        return userService.save(user);\n    }\n}`;
      code['User.java'] = `package com.example.demo.model;\n\nimport javax.persistence.*;\n\n@Entity\npublic class User {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    \n    private String name;\n    private String email;\n    \n    // Getters and setters\n    public Long getId() { return id; }\n    public void setId(Long id) { this.id = id; }\n    \n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n    \n    public String getEmail() { return email; }\n    public void setEmail(String email) { this.email = email; }\n}`;
    }
    
    return code;
  };

  // Preview code before download
  const previewCode = () => {
    // Extract code snippets for preview if not already done
    if (codeSnippets.length === 0 && Object.keys(generatedCode).length > 0) {
      const snippets = extractCodeSnippets(generatedCode);
      setCodeSnippets(snippets);
    }
    setShowPreview(true);
  };
  
  // Handle tech stack change
  const handleTechStackChange = (e) => {
    const newTechStack = e.target.value;
    setTechStack(newTechStack);
    
    // Persist to preferences context
    updateCodeGenerationPreferences({ techStack: newTechStack });
  };
  
  // Handle advanced option changes
  const handleAdvancedOptionChange = (option, value) => {
    const updatedOptions = {
      ...advancedOptions,
      [option]: value
    };
    
    // Update local state
    setAdvancedOptions(updatedOptions);
    
    // Persist to preferences context
    updatePreferenceOptions(updatedOptions);
  };
  
  // Close code preview modal
  const closePreview = () => {
    setShowPreview(false);
  };
  
  // Download generated code as a ZIP file
  const downloadCode = async () => {
    if (Object.keys(generatedCode).length === 0) return;
    
    setLoading(true);
    setError(null);
    setDownloadProgress(0);
    
    // Show toast notification
    const toastId = toast.info('Preparing code for download...', { autoClose: false });
    
    try {
      // Prepare the data for code download
      const downloadData = {
        techStack,
        code: generatedCode
      };
      
      // First try to use the API for code download
      try {
        // Update progress
        setDownloadProgress(10);
        toast.update(toastId, { render: 'Connecting to CodeCraft AI service...' });
        
        const response = await axios.post('/api/v1/projects/download-code', { download_request: downloadData }, {
          headers: {
            'Content-Type': 'application/json'
          },
          responseType: 'blob',
          onDownloadProgress: progressEvent => {
            // Track download progress
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(10 + (percentCompleted * 0.8)); // Scale to 10-90%
            toast.update(toastId, { render: `Downloading code: ${Math.round(10 + (percentCompleted * 0.8))}%` });
          }
        });
        
        // Update progress
        setDownloadProgress(90);
        toast.update(toastId, { render: 'Finalizing download...' });
        
        // Create a download link for the ZIP file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${techStack}-implementation.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Complete progress
        setDownloadProgress(100);
        toast.update(toastId, { 
          render: 'Download complete!', 
          type: toast.TYPE.SUCCESS,
          autoClose: 3000
        });
        
        setLoading(false);
        return;
      } catch (apiError) {
        console.warn('API code download failed, falling back to client-side ZIP generation:', apiError);
        toast.update(toastId, { render: 'API unavailable, using local fallback...' });
        // Continue to fallback implementation
      }
      
      // Fallback: Generate ZIP file client-side
      await generateZipClientSide(toastId);
      
      // Complete progress
      setDownloadProgress(100);
      toast.update(toastId, { 
        render: 'Download complete (local fallback)!', 
        type: toast.TYPE.SUCCESS,
        autoClose: 3000
      });
    } catch (error) {
      console.error('Error downloading code:', error);
      setError(`Failed to download code: ${error.message || 'Unknown error'}. Please try again.`);
      toast.update(toastId, { 
        render: 'Download failed. Please try again.', 
        type: toast.TYPE.ERROR,
        autoClose: 5000
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Client-side fallback for generating and downloading ZIP
  const generateZipClientSide = async (toastId) => {
    // Create a new JSZip instance
    const zip = new JSZip();
    
    // Update progress
    setDownloadProgress(20);
    if (toastId) toast.update(toastId, { render: 'Creating project structure...' });
    
    // Add README with project info
    zip.file('README.md', `# ${techStack} Implementation\n\nGenerated by CodeCraft AI\n\n## Project Overview\n\nThis project was generated using the ${techStack} technology stack.\n\n## Files\n${Object.keys(generatedCode).map(file => `- ${file}`).join('\n')}\n\n## Getting Started\n\n1. Extract the ZIP file\n2. Follow the setup instructions in the appropriate README files\n3. Run the application according to the tech stack requirements`);
    
    // Update progress
    setDownloadProgress(40);
    if (toastId) toast.update(toastId, { render: 'Adding project files...' });
    
    // Create appropriate folder structure based on tech stack
    const folderStructure = {};
    const totalFiles = Object.keys(generatedCode).length;
    let filesProcessed = 0;
    
    // Add all generated code files to the ZIP
    for (const [filename, content] of Object.entries(generatedCode)) {
      // Determine appropriate folder based on file extension or naming convention
      let folder = '';
      
      if (filename.endsWith('.html')) folder = 'public/';
      else if (filename.endsWith('.css')) folder = 'public/css/';
      else if (filename.endsWith('.js') && !filename.includes('server')) folder = 'public/js/';
      else if (filename.includes('server') || filename.endsWith('.py')) folder = 'server/';
      else if (filename.endsWith('.json')) folder = '/';
      else if (filename.endsWith('.md')) folder = 'docs/';
      else folder = 'src/';
      
      // Add file to the appropriate folder
      zip.file(folder + filename, content);
      
      // Update progress periodically
      filesProcessed++;
      if (filesProcessed % Math.max(1, Math.floor(totalFiles / 10)) === 0) {
        const progressPercent = 40 + Math.floor((filesProcessed / totalFiles) * 30);
        setDownloadProgress(progressPercent);
        if (toastId) toast.update(toastId, { render: `Processing files: ${filesProcessed}/${totalFiles}` });
      }
    }
    
    // Update progress
    setDownloadProgress(70);
    if (toastId) toast.update(toastId, { render: 'Generating ZIP file...' });
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      onUpdate: metadata => {
        const progressPercent = 70 + Math.floor(metadata.percent * 0.2);
        setDownloadProgress(progressPercent);
        if (toastId && metadata.percent % 10 === 0) {
          toast.update(toastId, { render: `Compressing files: ${Math.floor(metadata.percent)}%` });
        }
      }
    });
    
    // Update progress
    setDownloadProgress(90);
    if (toastId) toast.update(toastId, { render: 'Finalizing download...' });
    
    // Download the ZIP file
    saveAs(zipBlob, `${techStack}-implementation.zip`);
  };

  // Copy selected file to clipboard
  const copyToClipboard = () => {
    if (selectedFile && generatedCode[selectedFile]) {
      navigator.clipboard.writeText(generatedCode[selectedFile])
        .then(() => toast.success('Code copied to clipboard!'))
        .catch(err => {
          console.error('Failed to copy code:', err);
          toast.error('Failed to copy code to clipboard');
        });
    }
  };
  
  // Render file tree recursively
  const renderFileTree = (items, isPreview = false) => {
    return (
      <ul className={`file-tree-list ${isPreview ? 'preview-list' : ''}`}>
        {items.map((item, index) => {
          if (item.type === 'folder') {
            const isExpanded = expandedFolders[item.path] !== false; // Default to expanded
            
            return (
              <li key={`${item.path}-${index}`} className="folder-item">
                <div 
                  className="folder-header"
                  onClick={() => {
                    if (!isPreview) {
                      setExpandedFolders(prev => ({
                        ...prev,
                        [item.path]: !isExpanded
                      }));
                    }
                  }}
                >
                  {isExpanded ? 
                    <FaChevronDown className="folder-icon-toggle" /> : 
                    <FaChevronRight className="folder-icon-toggle" />
                  }
                  <FaFolder className="folder-icon" />
                  <span className="folder-name">{item.name}</span>
                </div>
                {isExpanded && item.children && item.children.length > 0 && (
                  renderFileTree(item.children, isPreview)
                )}
              </li>
            );
          } else {
            return (
              <li 
                key={`${item.path}-${index}`} 
                className={`file-item ${selectedFile === item.path ? 'selected' : ''}`}
                onClick={() => {
                  if (!isPreview) {
                    setSelectedFile(item.path);
                  }
                }}
              >
                <FaFileCode className="file-icon" />
                <span className="file-name">{item.name}</span>
              </li>
            );
          }
        })}
      </ul>
    );
  };

  return (
    <div className={`implementation-editor ${darkMode ? 'dark-mode' : ''}`}>
      <div className="implementation-editor-container">
        {/* Project Flow Navigation */}
        <ProjectFlowNav 
          currentStage="implementation" 
          projectId={projectData?.id || 'new'}
          onNavigate={(stage) => {
            // Handle navigation between project stages
            if (stage === 'dashboard') {
              // Navigate to dashboard
              window.location.href = '/';
            } else if (projectData?.id) {
              // Navigate to specific project stage
              window.location.href = `/project/${projectData.id}/${stage}`;
            }
          }}
        />
        
        <h2>Implementation</h2>
        
        <div className="implementation-toolbar">
          <button 
            className="generate-button" 
            onClick={generateCode} 
            disabled={loading}
          >
            <FaCode /> {loading ? 'Generating...' : 'Generate Code'}
          </button>
          
          <button 
            className="preview-button" 
            onClick={previewCode}
            disabled={Object.keys(generatedCode).length === 0 || loading}
          >
            <FaEye /> Preview Code
          </button>
          
          <button 
            className="download-button" 
            onClick={downloadCode}
            disabled={Object.keys(generatedCode).length === 0 || loading}
          >
            <FaDownload /> Download ZIP
          </button>
          
          <button 
            className="copy-button" 
            onClick={copyToClipboard}
            disabled={!selectedFile || Object.keys(generatedCode).length === 0 || loading}
          >
            <FaCopy /> Copy to Clipboard
          </button>
        
          <button 
            className="settings-button" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <FaCog /> Settings
          </button>
      </div>
      
      {showSettings && (
        <div className="settings-panel">
          <h3>Technology Stack</h3>
          <div className="tech-stack-options">
            {techStacks.map(stack => (
              <label key={stack.id} className="tech-stack-option">
                <input
                  type="radio"
                  name="techStack"
                  value={stack.id}
                  checked={techStack === stack.id}
                  onChange={() => setTechStack(stack.id)}
                />
                {stack.name}
              </label>
            ))}
          </div>
          
          <div className="advanced-options-toggle" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}>
            <h3>
              Advanced Options
              {showAdvancedOptions ? <FaChevronDown className="toggle-icon" /> : <FaChevronRight className="toggle-icon" />}
            </h3>
          </div>
          
          {showAdvancedOptions && (
            <div className="advanced-options">
              <div className="option-row">
                <label className="advanced-option">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeDocumentation}
                    onChange={() => handleAdvancedOptionChange('includeDocumentation', !advancedOptions.includeDocumentation)}
                  />
                  Include Documentation
                </label>
                <span className="option-description">Generate detailed documentation for code</span>
              </div>
              
              <div className="option-row">
                <label className="option-label">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeTests}
                    onChange={() => handleAdvancedOptionChange('includeTests', !advancedOptions.includeTests)}
                  />
                  Include Tests
                </label>
                <span className="option-description">Generate unit and integration tests</span>
              </div>
              
              <div className="option-row">
                <label className="option-label">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeDocker}
                    onChange={() => handleAdvancedOptionChange('includeDocker', !advancedOptions.includeDocker)}
                  />
                  Include Docker Setup
                </label>
                <span className="option-description">Generate Dockerfile and docker-compose.yml</span>
              </div>
              
              <div className="option-row">
                <label className="option-label">
                  <input
                    type="checkbox"
                    checked={advancedOptions.optimizeForPerformance}
                    onChange={() => handleAdvancedOptionChange('optimizeForPerformance', !advancedOptions.optimizeForPerformance)}
                  />
                  Optimize for Performance
                </label>
                <span className="option-description">Generate code optimized for performance</span>
              </div>
              
              <div className="option-row">
                <label className="option-label">
                  <input
                    type="checkbox"
                    checked={advancedOptions.includeExamples}
                    onChange={() => handleAdvancedOptionChange('includeExamples', !advancedOptions.includeExamples)}
                  />
                  Include Examples
                </label>
                <span className="option-description">Generate example usage code</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {loading && (
        <div className="generation-progress">
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
          <div className="progress-stage">
            <FaSync className={`progress-icon ${loading ? 'spinning' : ''}`} />
            <span>{generationStage || 'Processing...'}</span>
            <span className="progress-percentage">{Math.round(generationProgress)}%</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className={`error-container ${darkMode ? 'dark-mode' : ''}`}>
          <div className="error-header">
            <FaExclamationTriangle className="error-icon" /> 
            <h3>{error}</h3>
          </div>
          {errorDetails && (
            <div className="error-details">
              <p className="error-message">{errorDetails.message}</p>
              
              <div className="error-recovery">
                <h4>Suggested Actions:</h4>
                <ul className="recovery-suggestions">
                  {errorDetails.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
              
              <div className="error-actions">
                <button 
                  className="error-action-button primary" 
                  onClick={() => {
                    setError(null);
                    setErrorDetails(null);
                  }}
                >
                  Dismiss
                </button>
                <button 
                  className="error-action-button" 
                  onClick={() => generateCode()}
                >
                  <FaSync /> Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="implementation-content">
        {Object.keys(generatedCode).length === 0 ? (
          <div className="empty-state">
            <FaCode size={48} />
            <h3>No Code Generated Yet</h3>
            <p>Click the Generate Code button to create implementation code based on your ERD, API Design, and Tests.</p>
          </div>
        ) : (
          <>
            <div className="file-explorer">
              <h3>Project Files</h3>
              <div className="file-search">
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  onChange={(e) => {
                    // Filter files based on search input (to be implemented)
                  }}
                />
              </div>
              <div className="file-tree">
                {fileStructure.length > 0 ? (
                  renderFileTree(fileStructure)
                ) : (
                  <ul className="file-list">
                    {Object.keys(generatedCode).map(filename => (
                      <li 
                        key={filename}
                        className={selectedFile === filename ? 'selected' : ''}
                        onClick={() => setSelectedFile(filename)}
                      >
                        <FaFileCode className="file-icon" /> {filename}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            <div className="code-viewer">
              <div className="code-header">
                <span className="file-path">{selectedFile}</span>
                <div className="code-actions">
                  <button 
                    className="code-action-button" 
                    onClick={copyToClipboard} 
                    title="Copy to clipboard"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
              <pre className="code-content">
                {selectedFile && generatedCode[selectedFile]}
              </pre>
            </div>
          </>
        )}
      </div>
      
      {/* Code Preview Modal */}
      {showPreview && (
        <div className="code-preview-modal" ref={previewModalRef}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Code Preview</h2>
              <button className="close-button" onClick={closePreview}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="preview-tabs">
                <div className="tab-header">
                  <button 
                    className={`tab-button ${activePreviewTab === 'structure' ? 'active' : ''}`}
                    onClick={() => setActivePreviewTab('structure')}
                  >
                    File Structure
                  </button>
                  <button 
                    className={`tab-button ${activePreviewTab === 'snippets' ? 'active' : ''}`}
                    onClick={() => setActivePreviewTab('snippets')}
                  >
                    Code Snippets
                  </button>
                  <button 
                    className={`tab-button ${activePreviewTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActivePreviewTab('info')}
                  >
                    Download Info
                  </button>
                </div>
                <div className="tab-content">
                  <div className={`tab-pane ${activePreviewTab === 'structure' ? 'active' : ''}`}>
                    <h3>Project Structure</h3>
                    <div className="preview-file-tree">
                      {fileStructure.length > 0 ? (
                        renderFileTree(fileStructure, true)
                      ) : (
                        <ul className="file-list">
                          {Object.keys(generatedCode).map(filename => (
                            <li key={filename}>
                              <FaFileCode className="file-icon" /> {filename}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  <div className={`tab-pane ${activePreviewTab === 'snippets' ? 'active' : ''}`}>
                    <h3>Code Snippets</h3>
                    <div className="code-snippets-container">
                      {codeSnippets.length > 0 ? (
                        codeSnippets.map((snippet, index) => (
                          <div className="code-snippet" key={index}>
                            <div className="snippet-header">
                              <h4>{snippet.title}</h4>
                              <span className="snippet-path">{snippet.file}</span>
                            </div>
                            <pre className="snippet-code">
                              {snippet.code}
                            </pre>
                          </div>
                        ))
                      ) : (
                        <p className="no-snippets">No code snippets available. Generate code first.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className={`tab-pane ${activePreviewTab === 'info' ? 'active' : ''}`}>
                    <h3>Download Information</h3>
                    <div className="download-info">
                      <div className="info-item">
                        <strong>Technology Stack:</strong> {techStacks.find(stack => stack.id === techStack)?.name || techStack}
                      </div>
                      <div className="info-item">
                        <strong>Total Files:</strong> {Object.keys(generatedCode).length}
                      </div>
                      <div className="info-item">
                        <strong>Advanced Options:</strong>
                        <ul className="options-list">
                          {advancedOptions.includeDocumentation && <li>Documentation Included</li>}
                          {advancedOptions.includeTests && <li>Tests Included</li>}
                          {advancedOptions.includeDocker && <li>Docker Setup Included</li>}
                          {advancedOptions.optimizeForPerformance && <li>Performance Optimized</li>}
                          {advancedOptions.includeExamples && <li>Examples Included</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="preview-actions">
                <button className="preview-action-button" onClick={downloadCode}>
                  <FaDownload /> Download Now
                </button>
                <button className="preview-action-button secondary" onClick={closePreview}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImplementationEditor;
