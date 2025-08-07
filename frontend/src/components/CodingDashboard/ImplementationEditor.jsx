import React, { useState, useEffect } from 'react';
import { FaCode, FaDownload, FaCopy, FaCog } from 'react-icons/fa';
import axios from 'axios';
import './ImplementationEditor.css';

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
  const [techStack, setTechStack] = useState('python-fastapi'); // Default to Python/FastAPI
  const [showSettings, setShowSettings] = useState(false);
  
  // Available technology stacks
  const techStacks = [
    { id: 'python-fastapi', name: 'Python/FastAPI' },
    { id: 'node-express', name: 'Node.js/Express' },
    { id: 'django', name: 'Python/Django' },
    { id: 'spring-boot', name: 'Java/Spring Boot' }
  ];

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
    
    try {
      // Prepare the data for code generation
      const codeGenerationData = {
        techStack,
        erd: erdData,
        apiDesign: apiDesignData,
        tests: testData
      };
      
      // First try to use the AILang API for code generation
      try {
        const response = await axios.post('/api/v1/projects/generate-code', { code_request: codeGenerationData }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 seconds timeout for code generation
        });
        
        if (response.data && response.data.code) {
          setGeneratedCode(response.data.code);
          setSelectedFile(Object.keys(response.data.code)[0] || '');
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('AILang API code generation failed, falling back to local generation:', apiError);
        // Continue to fallback implementation
      }
      
      // Fallback: Generate code locally based on tech stack and previous steps
      const fallbackCode = generateLocalCode(techStack, erdData, apiDesignData, testData);
      setGeneratedCode(fallbackCode);
      setSelectedFile(Object.keys(fallbackCode)[0] || '');
    } catch (error) {
      console.error('Error generating code:', error);
      setError('Failed to generate code. Please try again or check your inputs.');
    } finally {
      setLoading(false);
    }
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

  // Download generated code as a ZIP file
  const downloadCode = async () => {
    try {
      // Try to use the backend API to generate a ZIP file
      const response = await axios.post('/api/v1/projects/download-code', {
        download_request: {
          code: generatedCode,
          techStack
        }
      }, {
        responseType: 'blob'
      });
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${techStack}-implementation.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading code:', error);
      alert('Failed to download code. Please try again later.');
      
      // Fallback: Alert the user that download functionality is not available
      alert('Download functionality is not fully implemented yet. Please copy the code manually.');
    }
  };

  // Copy selected file to clipboard
  const copyToClipboard = () => {
    if (selectedFile && generatedCode[selectedFile]) {
      navigator.clipboard.writeText(generatedCode[selectedFile])
        .then(() => alert('Code copied to clipboard!'))
        .catch(err => console.error('Failed to copy code:', err));
    }
  };

  return (
    <div className={`implementation-editor ${darkMode ? 'dark-mode' : ''}`}>
      <div className="implementation-toolbar">
        <button 
          className="generate-button" 
          onClick={generateCode} 
          disabled={loading}
        >
          <FaCode /> {loading ? 'Generating...' : 'Generate Code'}
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
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
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
              <ul>
                {Object.keys(generatedCode).map(filename => (
                  <li 
                    key={filename}
                    className={selectedFile === filename ? 'selected' : ''}
                    onClick={() => setSelectedFile(filename)}
                  >
                    {filename}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="code-viewer">
              <div className="code-header">
                {selectedFile}
              </div>
              <pre className="code-content">
                {selectedFile && generatedCode[selectedFile]}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImplementationEditor;
