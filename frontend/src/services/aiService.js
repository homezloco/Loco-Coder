import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

/**
 * Generate a creative project name based on the project description
 * @param {string} description - Project description
 * @returns {Promise<string>} - Generated project name
 */
export const generateProjectName = async (description) => {
  try {
    const { aiService } = useApi();
    
    const response = await aiService.chat(
      `Generate a creative, unique, and memorable project name based on this description. ` +
      `The name should be 2-4 words, title-cased, and relevant to the project. ` +
      `Return ONLY the name, no quotes or other text.\n\n` +
      `Project description: "${description}"`
    );
    
    // Extract just the name from the response
    let name = response.choices[0].message.content.trim();
    
    // Clean up the response
    name = name.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    name = name.split('\n')[0]; // Take only the first line
    
    // Ensure the name is title-cased and has no extra spaces
    name = name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
    
    // If the name is too short or too long, generate a fallback
    if (name.length < 2 || name.length > 50) {
      return `Project-${uuidv4().substring(0, 8)}`;
    }
    
    return name;
  } catch (error) {
    logger.ns('api:ai').error('Error generating project name', { error });
    // Fallback to a simple generated name
    return `Project-${uuidv4().substring(0, 8)}`;
  }
};

/**
 * Generate a comprehensive project plan based on user's idea and template
 * @param {string} projectIdea - User's project idea description
 * @param {string} templateId - Selected template ID
 * @returns {Promise<Object>} - Generated project plan
 */
export const generateProjectPlan = async (projectIdea, templateId) => {
  try {
    const { aiService } = useApi();
    
    // Fallback mechanism in case AI service is unavailable
    if (!aiService || aiService.isFallback) {
      logger.ns('api:ai').warn('AI service not available for project plan generation, using fallback');
      return generateFallbackProjectPlan(projectIdea, templateId);
    }
    
    // Create a prompt based on the template and project idea
    let templateContext = '';
    switch (templateId) {
      case 'web':
        templateContext = 'a web application with frontend and backend components';
        break;
      case 'api':
        templateContext = 'a RESTful or GraphQL API server';
        break;
      case 'library':
        templateContext = 'a reusable code library or package';
        break;
      case 'cli':
        templateContext = 'a command-line interface tool';
        break;
      default:
        templateContext = 'a software project';
    }
    
    // Generate the project plan using AI with enhanced AutoBE principles
    const response = await aiService.chat(
      `You are an expert software architect specializing in ${templateContext}. ` +
      `I need you to create a comprehensive project plan based on the following idea:\n\n` +
      `"${projectIdea}"\n\n` +
      `Follow the AutoBE waterfall development model: Requirements → ERD → API Design → Test → Implementation.\n\n` +
      `Please provide a JSON response with the following structure:\n` +
      `{\n` +
      `  "projectName": "A creative and relevant name for the project",\n` +
      `  "projectDescription": "A concise 2-3 sentence description of the project",\n` +
      `  "framework": "Recommended framework and technologies (prefer Python/FastAPI for backend, React for frontend)",\n` +
      `  "architecture": {\n` +
      `    "overview": "High-level architecture description",\n` +
      `    "patterns": ["List of architectural patterns used"],\n` +
      `    "components": {\n` +
      `      "frontend": { "description": "Frontend architecture details" },\n` +
      `      "backend": { "description": "Backend architecture details" },\n` +
      `      "database": { "description": "Database architecture with fallback options" },\n` +
      `      "authentication": { "description": "Authentication system with fallback options" },\n` +
      `      "api": { "description": "API design with validation" }\n` +
      `    }\n` +
      `  },\n` +
      `  "requirements": {\n` +
      `    "functional": ["List of functional requirements"],\n` +
      `    "nonFunctional": ["List of non-functional requirements"]\n` +
      `  },\n` +
      `  "dataModel": {\n` +
      `    "entities": ["List of main data entities"],\n` +
      `    "relationships": ["Description of key relationships"]\n` +
      `  },\n` +
      `  "apiEndpoints": [\n` +
      `    { "path": "/example", "method": "GET", "description": "Example endpoint", "validation": "Validation rules" }\n` +
      `  ],\n` +
      `  "testStrategy": {\n` +
      `    "unitTests": "Approach to unit testing",\n` +
      `    "integrationTests": "Approach to integration testing",\n` +
      `    "e2eTests": "Approach to end-to-end testing"\n` +
      `  },\n` +
      `  "structure": { /* Nested object representing the project file/folder structure */ },\n` +
      `  "dependencies": { /* Object with categories of dependencies needed */ },\n` +
      `  "documentation": {\n` +
      `    "setup": "Setup instructions",\n` +
      `    "api": "API documentation approach",\n` +
      `    "architecture": "Architecture documentation"\n` +
      `  },\n` +
      `  "tags": ["list", "of", "relevant", "technology", "tags"]\n` +
      `}\n\n` +
      `Ensure the architecture follows AutoBE principles with:\n` +
      `1. Clear separation of concerns (routes, services, models)\n` +
      `2. Validation using Pydantic schemas for backend\n` +
      `3. Comprehensive testing strategy for all components\n` +
      `4. Fallback mechanisms for all external dependencies\n` +
      `5. Automatic documentation generation\n` +
      `6. Modular structure (files should not exceed 1000 lines)\n` +
      `7. Type checking and schema validation\n` +
      `8. Error-free code generation approach\n\n` +
      `For Python backends, use FastAPI with SQLAlchemy and Pydantic.\n` +
      `For frontend, prefer React with modern state management.\n` +
      `Include fallback strategies for APIs, databases, authentication, and other critical components.`
    );
    
    // Parse the response
    let planData;
    try {
      // Extract JSON from the response
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      planData = JSON.parse(jsonStr.replace(/```json|```/g, '').trim());
      
      // Validate the required fields
      if (!planData.projectName || !planData.projectDescription || !planData.framework) {
        throw new Error('Missing required fields in project plan');
      }
      
      // Ensure all required sections exist
      planData.architecture = planData.architecture || { overview: 'Modern layered architecture' };
      planData.requirements = planData.requirements || { functional: [], nonFunctional: [] };
      planData.dataModel = planData.dataModel || { entities: [], relationships: [] };
      planData.apiEndpoints = planData.apiEndpoints || [];
      planData.testStrategy = planData.testStrategy || {};
      planData.structure = planData.structure || {};
      planData.dependencies = planData.dependencies || {};
      planData.documentation = planData.documentation || {};
      planData.tags = planData.tags || [];
      
    } catch (parseError) {
      logger.ns('api:ai').error('Error parsing AI response', { error: parseError });
      throw new Error('Failed to parse AI-generated project plan');
    }
    
    // Generate a project logo based on the name and description
    try {
      const logo = await generateProjectLogo(planData.projectName, planData.projectDescription, aiService);
      planData.logo = logo;
    } catch (logoError) {
      logger.ns('api:ai').warn('Error generating logo', { error: logoError });
      // Use fallback logo
      planData.logo = {
        type: 'svg',
        content: generateFallbackSvg(planData.projectName),
        isFallback: true
      };
    }
    
    return planData;
  } catch (error) {
    logger.ns('api:ai').error('Error generating project plan', { error });
    // Use fallback plan
    return generateFallbackProjectPlan(projectIdea, templateId);
  }
};

/**
 * Generate a fallback project plan when AI service is unavailable
 * @param {string} projectIdea - User's project idea description
 * @param {string} templateId - Selected template ID
 * @returns {Object} - Fallback project plan
 */
const generateFallbackProjectPlan = (projectIdea, templateId) => {
  // Extract keywords from the project idea
  const keywords = projectIdea.toLowerCase().split(/\W+/).filter(word => 
    word.length > 3 && 
    !['this', 'that', 'with', 'from', 'have', 'what', 'when', 'where', 'which', 'would', 'could', 'should'].includes(word)
  );
  
  // Generate a simple project name from keywords
  const projectName = keywords.length > 1 
    ? `${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)} ${keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1)}`
    : `Project-${uuidv4().substring(0, 8)}`;
  
  // Create a basic structure based on template
  let structure = {};
  let framework = '';
  let architecture = '';
  let dependencies = {};
  let tags = [];
  
  switch (templateId) {
    case 'web':
      structure = {
        'frontend': {
          'src': {
            'components': {},
            'pages': {},
            'utils': {},
            'App.js': null,
            'index.js': null
          },
          'public': {
            'index.html': null
          },
          'package.json': null
        },
        'backend': {
          'src': {
            'routes': {},
            'services': {},
            'models': {},
            'app.py': null
          },
          'requirements.txt': null
        },
        'README.md': null
      };
      framework = 'React for frontend, FastAPI for backend';
      architecture = 'Modern web application with React frontend and FastAPI backend. Frontend uses component-based architecture with state management. Backend follows RESTful API design with proper separation of routes, services, and models.';
      dependencies = {
        'frontend': ['react', 'react-dom', 'react-router-dom', 'axios'],
        'backend': ['fastapi', 'uvicorn', 'sqlalchemy', 'pydantic']
      };
      tags = ['react', 'fastapi', 'web'];
      break;
      
    case 'api':
      structure = {
        'src': {
          'routes': {},
          'services': {},
          'models': {},
          'schemas': {},
          'app.py': null,
          'config.py': null,
          'database.py': null
        },
        'tests': {},
        'requirements.txt': null,
        'README.md': null
      };
      framework = 'FastAPI with SQLAlchemy';
      architecture = 'RESTful API server built with FastAPI. Follows clean architecture with separation of routes, services, and models. Includes Pydantic schemas for validation and SQLAlchemy for database access.';
      dependencies = {
        'main': ['fastapi', 'uvicorn', 'sqlalchemy', 'pydantic', 'alembic'],
        'testing': ['pytest', 'httpx']
      };
      tags = ['api', 'fastapi', 'python'];
      break;
      
    case 'library':
      structure = {
        'src': {
          'lib': {},
          'utils': {},
          '__init__.py': null
        },
        'tests': {},
        'setup.py': null,
        'README.md': null
      };
      framework = 'Python package';
      architecture = 'Modular Python library with clean separation of concerns. Includes comprehensive testing and documentation.';
      dependencies = {
        'main': ['pytest'],
        'dev': ['black', 'isort', 'mypy']
      };
      tags = ['library', 'python', 'package'];
      break;
      
    case 'cli':
      structure = {
        'src': {
          'commands': {},
          'utils': {},
          'main.py': null
        },
        'tests': {},
        'setup.py': null,
        'README.md': null
      };
      framework = 'Python CLI with Click';
      architecture = 'Command-line interface tool built with Python. Uses Click for command parsing and includes comprehensive error handling and user feedback.';
      dependencies = {
        'main': ['click', 'colorama'],
        'dev': ['pytest']
      };
      tags = ['cli', 'python', 'tool'];
      break;
      
    default:
      structure = {
        'src': {},
        'tests': {},
        'README.md': null
      };
      framework = 'Python';
      architecture = 'Generic project structure with source code and tests directories.';
      dependencies = {
        'main': ['pytest']
      };
      tags = ['python'];
  }
  
  // Generate a logo
  const logoData = {
    type: 'svg',
    content: generateFallbackSvg(projectName),
    concept: 'Minimalist initial-based logo with gradient background',
    generatedAt: new Date().toISOString(),
    isFallback: true
  };
  
  return {
    projectName,
    projectDescription: `A ${templateId} project based on "${projectIdea.substring(0, 100)}${projectIdea.length > 100 ? '...' : ''}". Built with modern best practices and a focus on maintainability.`,
    framework,
    architecture,
    structure,
    dependencies,
    tags,
    logo: logoData,
    generatedAt: new Date().toISOString(),
    isFallback: true
  };
};

/**
 * Generate a project logo using AI
 * @param {string} projectName - Name of the project
 * @param {string} description - Project description
 * @param {Object} aiService - AI service instance
 * @returns {Promise<Object>} - Logo data (SVG or image URL)
 */
export const generateProjectLogo = async (projectName, description, aiService) => {
  // Early return with fallback if no AI service is provided
  if (!aiService) {
    logger.ns('api:ai').warn('AI service not provided for logo generation, using fallback');
    return {
      type: 'svg',
      content: generateFallbackSvg(projectName),
      concept: 'Minimalist initial-based logo with gradient background',
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }
  
  // Check if this is a fallback AI service implementation
  if (aiService.isFallback) {
    logger.ns('api:ai').info('Using fallback AI service for logo generation');
    return {
      type: 'svg',
      content: generateFallbackSvg(projectName),
      concept: 'Minimalist initial-based logo with gradient background',
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }
  
  try {    
    // First, generate a logo concept
    const conceptResponse = await aiService.chat(
      `Generate a simple, modern, and abstract logo concept for a project called "${projectName}". ` +
      `Project description: "${description}"\n\n` +
      `Provide a brief description of the logo design in one sentence, focusing on shapes, colors, and style. ` +
      `Example: "A minimalist circular logo with a gradient from blue to purple, featuring an abstract 'W' shape in the center."`
    );
    
    // Check if we got a fallback response
    if (conceptResponse.fallback) {
      return {
        type: 'svg',
        content: generateFallbackSvg(projectName),
        concept: 'Minimalist initial-based logo with gradient background',
        generatedAt: new Date().toISOString(),
        isFallback: true
      };
    }
    
    const logoConcept = conceptResponse.choices[0].message.content.trim();
    
    // Generate an SVG based on the concept
    const svgResponse = await aiService.chat(
      `Create an SVG logo based on this description: "${logoConcept}"\n\n` +
      `Return ONLY the SVG code, starting with <svg and ending with </svg>. ` +
      `The SVG should be 200x200 pixels with a viewBox="0 0 200 200". ` +
      `Use simple shapes and a clean, modern design.`
    );
    
    // Check if we got a fallback response
    if (svgResponse.fallback) {
      return {
        type: 'svg',
        content: generateFallbackSvg(projectName),
        concept: 'Minimalist initial-based logo with gradient background',
        generatedAt: new Date().toISOString(),
        isFallback: true
      };
    }
    
    let svg = svgResponse.choices[0].message.content.trim();
    
    // Ensure the SVG is valid and has proper dimensions
    if (!svg.startsWith('<svg')) {
      // Try to extract SVG from markdown code block if present
      const svgMatch = svg.match(/```(?:svg)?\n?([\s\S]*?)\n?```/);
      
      if (svgMatch) {
        svg = svgMatch[1];
      } else {
        throw new Error('Invalid SVG format');
      }
    }
    
    return {
      type: 'svg',
      content: svg,
      concept: logoConcept,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating project logo:', error);
    // Fallback to a simple generated SVG
    return {
      type: 'svg',
      content: generateFallbackSvg(projectName),
      concept: 'Minimalist initial-based logo with gradient background',
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }
};

/**
 * Generate a fallback SVG logo with project initials
 * @param {string} projectName - Name of the project
 * @returns {string} - SVG content as string
 */
export const generateFallbackSvg = (projectName) => {
  // Get initials from project name
  const initials = projectName
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
  
  // Generate a color based on the project name
  const hue = Array.from(projectName).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const color1 = `hsl(${hue}, 70%, 50%)`;
  const color2 = `hsl(${(hue + 30) % 360}, 70%, 50%)`;
  
  return `
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="40" fill="url(#gradient)" opacity="0.9"/>
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="80" 
            font-weight="bold"
            fill="white"
            text-anchor="middle"
            dominant-baseline="middle"
            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        ${initials}
      </text>
    </svg>
  `;
};

/**
 * Generate a color scheme based on project name
 * @param {string} projectName - Name of the project
 * @returns {Object} - Color scheme object
 */
export const generateColorScheme = (projectName) => {
  // Generate a consistent color based on the project name
  const hash = Array.from(projectName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  
  return {
    primary: `hsl(${hue}, 70%, 50%)`,
    secondary: `hsl(${(hue + 30) % 360}, 70%, 50%)`,
    accent: `hsl(${(hue + 180) % 360}, 70%, 50%)`,
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#ffffff',
    lightText: '#f5f5f5',
    darkText: '#333333'
  };
};
