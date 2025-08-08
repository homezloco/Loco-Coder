import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TemplateSelector.css';
import logger from './utils/logger';
const uiTemplateLog = logger.ns('ui:template');

/**
 * Template selector component for creating new projects from templates
 * Includes fallback mechanisms for API failures
 */
const TemplateSelector = ({ apiUrl, onProjectCreate, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Default templates as fallback if API fails
  const defaultTemplates = [
    // Python templates
    {
      id: 'python_basic',
      name: 'Python Basic',
      description: 'Basic Python script template',
      language: 'python'
    },
    {
      id: 'python_api',
      name: 'Python FastAPI',
      description: 'FastAPI REST API template with error handling',
      language: 'python'
    },
    
    // JavaScript templates
    {
      id: 'javascript_basic',
      name: 'JavaScript Basic',
      description: 'Basic JavaScript template',
      language: 'javascript'
    },
    
    // Go templates
    {
      id: 'go_basic',
      name: 'Go Basic',
      description: 'Simple Go application structure with modules',
      language: 'go'
    },
    {
      id: 'go_api',
      name: 'Go REST API',
      description: 'REST API using Go standard library with middleware and error handling',
      language: 'go'
    },
    
    // Rust templates
    {
      id: 'rust_basic',
      name: 'Rust Basic',
      description: 'Simple Rust application with Cargo setup',
      language: 'rust'
    },
    {
      id: 'rust_lib',
      name: 'Rust Library',
      description: 'Rust library project with tests and documentation',
      language: 'rust'
    },
    
    // Swift templates
    {
      id: 'swift_ios',
      name: 'Swift iOS App',
      description: 'Basic iOS app with SwiftUI and MVVM architecture',
      language: 'swift'
    },
    {
      id: 'swift_lib',
      name: 'Swift Package',
      description: 'Swift Package Library with unit tests',
      language: 'swift'
    },
    
    // Kotlin templates
    {
      id: 'kotlin_android',
      name: 'Kotlin Android App',
      description: 'Android app using Kotlin with Jetpack Compose',
      language: 'kotlin'
    },
    {
      id: 'kotlin_lib',
      name: 'Kotlin Library',
      description: 'Kotlin multiplatform library project',
      language: 'kotlin'
    },
    
    // Dart templates
    {
      id: 'flutter_app',
      name: 'Flutter App',
      description: 'Flutter mobile app with basic widgets and navigation',
      language: 'dart'
    },
    {
      id: 'dart_cli',
      name: 'Dart CLI App',
      description: 'Command line application in Dart',
      language: 'dart'
    },
    
    // React Native templates
    {
      id: 'react_native_app',
      name: 'React Native App',
      description: 'React Native mobile app with navigation and state management',
      language: 'react-native'
    },
    
    // C# templates
    {
      id: 'csharp_maui',
      name: 'C# MAUI App',
      description: '.NET MAUI cross-platform mobile app',
      language: 'csharp'
    },
    {
      id: 'csharp_xamarin',
      name: 'C# Xamarin App',
      description: 'Xamarin.Forms mobile app with MVVM pattern',
      language: 'csharp'
    },
    
    // Web templates
    {
      id: 'typescript_app',
      name: 'TypeScript App',
      description: 'TypeScript application with webpack configuration',
      language: 'typescript'
    },
    {
      id: 'html_css_js',
      name: 'HTML/CSS/JS Website',
      description: 'Simple website with HTML, CSS, and JavaScript',
      language: 'html'
    }
  ];

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);


  // Load templates from API with fallback mechanism
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/templates`, {
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data && response.data.success) {
        // Transform templates object to array
        const templateArray = Object.entries(response.data.templates).map(([id, template]) => ({
          id,
          ...template
        }));
        setTemplates(templateArray);
      } else {
        uiTemplateLog.warn('Invalid template response, using fallback templates');
        setTemplates(defaultTemplates);
        setError('Could not load templates from server, using fallback templates');
      }
    } catch (err) {
      uiTemplateLog.error('Failed to load templates:', err);
      setTemplates(defaultTemplates);
      setError('Failed to load templates from server, using fallback templates');
    } finally {
      setLoading(false);
    }
  };

  // Create project from template
  const createProject = async () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }
    
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      const response = await axios.post(`${apiUrl}/create_project`, {
        template_id: selectedTemplate.id,
        project_name: projectName.trim()
      });
      
      if (response.data && response.data.success) {
        // Notify parent of successful project creation
        onProjectCreate({
          name: projectName.trim(),
          path: response.data.project_dir,
          files: response.data.files,
          mainFile: response.data.files[0] || 'main.py'
        });
      } else {
        setError(response.data?.message || 'Failed to create project');
      }
    } catch (err) {
      uiTemplateLog.error('Error creating project:', err);
      setError('Could not create project. Please try again.');
      
      // Fallback: Create project client-side
      if (window.confirm('Server error. Would you like to create a basic project locally instead?')) {
        handleFallbackProjectCreation();
      }
    } finally {
      setCreating(false);
    }
  };
  
  // Fallback: Create a basic project client-side
  const handleFallbackProjectCreation = () => {
    const template = selectedTemplate || defaultTemplates[0];
    let mainFile = '';
    let additionalFiles = [];
    
    // Determine main file based on language
    switch(template.language) {
      case 'python':
        mainFile = 'main.py';
        break;
      case 'javascript':
        mainFile = 'index.js';
        break;
      case 'typescript':
        mainFile = 'index.ts';
        additionalFiles = ['tsconfig.json'];
        break;
      case 'go':
        mainFile = 'main.go';
        additionalFiles = ['go.mod'];
        break;
      case 'rust':
        mainFile = 'src/main.rs';
        additionalFiles = ['Cargo.toml'];
        break;
      case 'swift':
        mainFile = 'Sources/App/main.swift';
        additionalFiles = ['Package.swift'];
        break;
      case 'kotlin':
        mainFile = 'src/main/kotlin/Main.kt';
        additionalFiles = ['build.gradle.kts'];
        break;
      case 'dart':
        mainFile = 'lib/main.dart';
        additionalFiles = ['pubspec.yaml'];
        break;
      case 'react-native':
        mainFile = 'App.js';
        additionalFiles = ['package.json', 'index.js'];
        break;
      case 'csharp':
        mainFile = 'Program.cs';
        additionalFiles = ['Project.csproj'];
        break;
      case 'html':
        mainFile = 'index.html';
        additionalFiles = ['style.css', 'script.js'];
        break;
      case 'css':
        mainFile = 'style.css';
        additionalFiles = ['index.html'];
        break;
      case 'cpp':
        mainFile = 'main.cpp';
        additionalFiles = ['CMakeLists.txt'];
        break;
      default:
        mainFile = 'index.js';
    }
    
    // Generate simple template content based on language
    let content = '';
    let additionalContents = {};
    
    switch(template.language) {
      case 'python':
        content = `# ${projectName}\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`;
        break;
      
      case 'javascript':
        content = `// ${projectName}\n\nconsole.log("Hello, World!");\n\nfunction main() {\n  return "Hello, World!";\n}\n\nmodule.exports = { main };\n`;
        break;
      
      case 'typescript':
        content = `// ${projectName}\n\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("World"));\n`;
        additionalContents['tsconfig.json'] = `{\n  "compilerOptions": {\n    "target": "es2016",\n    "module": "commonjs",\n    "esModuleInterop": true,\n    "forceConsistentCasingInFileNames": true,\n    "strict": true,\n    "skipLibCheck": true\n  }\n}`;
        break;
      
      case 'go':
        content = `package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n`;
        additionalContents['go.mod'] = `module ${projectName.toLowerCase().replace(/\s+/g, '-')}\n\ngo 1.19\n`;
        break;
      
      case 'rust':
        content = `fn main() {\n    println!("Hello, World!");\n}\n`;
        additionalContents['Cargo.toml'] = `[package]\nname = "${projectName.toLowerCase().replace(/\s+/g, '-')}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n`;
        break;
      
      case 'swift':
        content = `import Foundation\n\nprint("Hello, World!")\n`;
        additionalContents['Package.swift'] = `// swift-tools-version:5.5\nimport PackageDescription\n\nlet package = Package(\n    name: "${projectName.replace(/\s+/g, '')}",\n    platforms: [.macOS(.v12), .iOS(.v15)],\n    products: [\n        .executable(name: "${projectName.replace(/\s+/g, '')}", targets: ["App"])\n    ],\n    dependencies: [],\n    targets: [\n        .executableTarget(name: "App", dependencies: [])\n    ]\n)\n`;
        break;
      
      case 'kotlin':
        content = `fun main() {\n    println("Hello, World!")\n}\n`;
        additionalContents['build.gradle.kts'] = `plugins {\n    kotlin("jvm") version "1.7.10"\n    application\n}\n\ngroup = "com.example"\nversion = "1.0-SNAPSHOT"\n\nrepositories {\n    mavenCentral()\n}\n\ndependencies {\n    testImplementation(kotlin("test"))\n}\n\napplication {\n    mainClass.set("MainKt")\n}\n`;
        break;
      
      case 'dart':
        content = `void main() {\n  print("Hello, World!");\n}\n`;
        additionalContents['pubspec.yaml'] = `name: ${projectName.toLowerCase().replace(/\s+/g, '_')}\ndescription: A new Dart project\nversion: 1.0.0\n\nenvironment:\n  sdk: '>=2.18.0 <3.0.0'\n\ndependencies:\n  path: ^1.8.0\n`;
        break;
      
      case 'react-native':
        content = `import React from 'react';\nimport { View, Text, StyleSheet } from 'react-native';\n\nconst App = () => {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.text}>Hello, World!</Text>\n    </View>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    backgroundColor: '#F5FCFF',\n  },\n  text: {\n    fontSize: 20,\n    textAlign: 'center',\n    margin: 10,\n  },\n});\n\nexport default App;\n`;
        additionalContents['package.json'] = `{\n  "name": "${projectName.toLowerCase().replace(/\s+/g, '-')}",\n  "version": "0.1.0",\n  "private": true,\n  "dependencies": {\n    "react": "18.2.0",\n    "react-native": "0.71.0"\n  }\n}`;
        additionalContents['index.js'] = `import { AppRegistry } from 'react-native';\nimport App from './App';\nimport { name as appName } from './package.json';\n\nAppRegistry.registerComponent(appName, () => App);\n`;
        break;
      
      case 'csharp':
        content = `using System;\n\nnamespace ${projectName.replace(/\s+/g, '')}\n{\n    public class Program\n    {\n        public static void Main(string[] args)\n        {\n            Console.WriteLine("Hello, World!");\n        }\n    }\n}\n`;
        additionalContents['Project.csproj'] = `<Project Sdk="Microsoft.NET.Sdk">\n\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net6.0</TargetFramework>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <Nullable>enable</Nullable>\n  </PropertyGroup>\n\n</Project>\n`;
        break;
      
      case 'html':
        content = `<!DOCTYPE html>\n<html>\n<head>\n  <title>${projectName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n`;
        additionalContents['style.css'] = `/* Styles for ${projectName} */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n  background-color: #f5f5f5;\n}\n\nh1 {\n  color: #333;\n}\n`;
        additionalContents['script.js'] = `// JavaScript for ${projectName}\nconsole.log('Hello from JavaScript!');\n\ndocument.addEventListener('DOMContentLoaded', function() {\n  console.log('DOM fully loaded');\n});\n`;
        break;
      
      case 'cpp':
        content = `#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}\n`;
        additionalContents['CMakeLists.txt'] = `cmake_minimum_required(VERSION 3.10)\nproject(${projectName.replace(/\s+/g, '_')})\n\nset(CMAKE_CXX_STANDARD 17)\n\nadd_executable(${projectName.replace(/\s+/g, '_')} main.cpp)\n`;
        break;
      
      default:
        content = `// ${projectName}\n\nconsole.log("Hello, World!");\n`;
    }
    
    // Create local project with fallback mechanisms
    onProjectCreate({
      name: projectName.trim(),
      path: null, // No path for client-side project
      files: [mainFile, ...additionalFiles],
      mainFile: mainFile,
      content: content, // Main file content
      additionalContents: additionalContents, // Additional file contents
      isLocalFallback: true
    });
  };

  // Select template and pre-fill project name
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Suggest project name if none entered
    if (!projectName.trim()) {
      const suggestedName = `${template.language}_project_${Math.floor(Math.random() * 1000)}`;
      setProjectName(suggestedName);
    }
  };
  
  // Handle input changes with validation
  const handleProjectNameChange = (e) => {
    const value = e.target.value;
    // Only allow alphanumeric, underscore and hyphen
    const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '_');
    setProjectName(sanitized);
  };

  // Group templates by language
  const groupedTemplates = templates.reduce((groups, template) => {
    const language = template.language || 'other';
    if (!groups[language]) {
      groups[language] = [];
    }
    groups[language].push(template);
    return groups;
  }, {});

  return (
    <div className="template-selector">
      <div className="template-selector-header">
        <h2>Create New Project</h2>
        <button className="close-button" onClick={onClose}>&times;</button>
      </div>
      
      {loading ? (
        <div className="template-loading">Loading templates...</div>
      ) : (
        <>
          {error && (
            <div className="template-error">
              <span>{error}</span>
              {error.includes('fallback') && (
                <button onClick={loadTemplates}>Try Again</button>
              )}
            </div>
          )}
          
          <div className="template-input">
            <label htmlFor="project-name">Project Name:</label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={handleProjectNameChange}
              placeholder="Enter project name"
              disabled={creating}
            />
          </div>
          
          <div className="template-list">
            {Object.entries(groupedTemplates).map(([language, langTemplates]) => (
              <div key={language} className="template-language-group">
                <h3>{language.charAt(0).toUpperCase() + language.slice(1)}</h3>
                <div className="template-cards">
                  {langTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="template-actions">
            <button 
              className="cancel-button" 
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              className="create-button" 
              onClick={createProject}
              disabled={!selectedTemplate || !projectName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateSelector;
