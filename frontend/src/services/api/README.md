# API Services

This directory contains the modular API services for the application. The API has been restructured to use a class-based service pattern for better organization, maintainability, and testability.

## Structure

```
services/api/
├── services/               # Service implementations
│   ├── auth/               # Authentication service
│   │   └── AuthService.js  # Auth service implementation
│   ├── projects/           # Projects service
│   │   └── ProjectService.js
│   ├── files/              # File operations service
│   │   └── FileService.js
│   └── templates/          # Templates service
│       └── TemplateService.js
├── utils/                  # Shared utilities
│   ├── fetch.js            # Enhanced fetch with retry/timeout
│   ├── cache.js            # Caching utilities
│   ├── errors.js           # Error handling utilities
│   ├── token.js            # Token management utilities
│   └── url.js              # URL and request utilities
├── config.js               # API configuration
├── new-api.js              # New modular API client
└── api.js                  # Legacy API client (deprecated)
```

## Migration Guide

### From Legacy to New API

The legacy `api.js` has been refactored into modular services and utilities. Here's how to migrate:

1. **Update Imports**
   - Replace `import api from './api'` with specific service imports:
   
   ```javascript
   // Old way
   import api from './api';
   
   // New way
   import { authService } from './services/auth/AuthService';
   import { projectService } from './services/projects/ProjectService';
   import { fileService } from './services/files/FileService';
   import { templateService } from './services/templates/TemplateService';
   ```

2. **Authentication**
   ```javascript
   // Old way
   const token = await api.getAuthToken();
   await api.login(username, password);
   await api.logout();
   
   // New way
   const token = await authService.getAuthToken();
   await authService.login(username, password);
   await authService.logout();
   ```

3. **Projects**
   ```javascript
   // Old way
   const projects = await api.getProjects();
   const project = await api.getProject(projectId);
   
   // New way
   const projects = await projectService.getProjects();
   const project = await projectService.getProject(projectId);
   ```

4. **Files**
   ```javascript
   // Old way
   const files = await api.getProjectFiles(projectId);
   const content = await api.readFile(projectId, filePath);
   
   // New way
   const files = await fileService.getProjectFiles(projectId);
   const content = await fileService.readFile(projectId, filePath);
   ```

5. **Templates**
   ```javascript
   // Old way
   const templates = await api.getTemplates();
   
   // New way
   const templates = await templateService.getTemplates();
   ```

### New Features

1. **Token Management**
   - Centralized token handling in `utils/token.js`
   - Automatic token refresh
   - Multiple storage backends (localStorage, sessionStorage)

2. **Enhanced Fetch**
   - Built-in retry logic
   - Timeout handling
   - Request deduplication
   - Automatic error handling

3. **Error Handling**
   - Standardized error classes
   - Detailed error information
   - Automatic error logging

## Utility Modules

### Token Management (`utils/token.js`)

Handles JWT token storage, validation, and refresh:

```javascript
import { 
  getAuthToken, 
  storeToken, 
  clearAuthData, 
  initAuthToken 
} from './utils/token';

// Initialize token on app startup
await initAuthToken();

// Get current token
const token = getAuthToken();

// Store new token
storeToken(token, refreshToken, expiresIn);

// Clear all auth data
clearAuthData();
```

### URL and Request Utilities (`utils/url.js`)

Provides URL management and request helpers:

```javascript
import { 
  getCurrentBaseUrl,
  tryNextFallbackUrl,
  createFormData,
  debounce
} from './utils/url';

// Get current API base URL
const baseUrl = getCurrentBaseUrl();

// Try next fallback URL
const hasNext = tryNextFallbackUrl();

// Create form data
const formData = createFormData({
  file: fileObject,
  metadata: { name: 'test' }
});

// Debounce function calls
debounce('search', () => {
  // Your search logic
}, 300);
```

## Services

### AuthService

Handles authentication, token management, and user sessions.

```javascript
import { authService } from './services/auth/AuthService';

// Example usage
const token = await authService.getAuthToken();
const isAuthenticated = await authService.isAuthenticated();
authService.onAuthStateChanged(({ isAuthenticated }) => {
  console.log('Auth state changed:', isAuthenticated);
});
```

### ProjectService

Manages project-related operations.

```javascript
import { projectService } from './services/projects/ProjectService';

// Example usage
const projects = await projectService.getProjects();
const project = await projectService.getProject('project-123');
const newProject = await projectService.createProject({ name: 'New Project' });
```

### FileService

Handles file operations.

```javascript
import { fileService } from './services/files/FileService';

// Example usage
const files = await fileService.getProjectFiles('project-123');
const content = await fileService.readFile('project-123', 'path/to/file.txt');
await fileService.writeFile('project-123', 'path/to/file.txt', 'Hello, world!');
```

### TemplateService

Manages code templates.

```javascript
import { templateService } from './services/templates/TemplateService';

// Example usage
const templates = await templateService.getTemplates();
const template = await templateService.getTemplate('react-ts');
```

## Migration

To migrate from the old API structure to the new modular services:

1. Update imports to use the new service modules
2. Replace direct API method calls with service method calls
3. Update any tests to work with the new structure

Run the migration script to update imports automatically:

```bash
node scripts/update-api-imports.js
```

## Best Practices

1. **Use named imports** for better tree-shaking and code clarity
2. **Handle errors** using try/catch blocks around async operations
3. **Use dependency injection** in tests to mock services
4. **Keep services focused** - each service should have a single responsibility
5. **Use caching** for expensive operations when appropriate

## Testing

Each service includes its own test file with unit tests. Run the tests with:

```bash
npm test
```

## Contributing

When adding new API endpoints or modifying existing ones:

1. Add/update the corresponding service method
2. Update the TypeScript types if applicable
3. Add/update tests
4. Update the documentation in this file

## License

[MIT](LICENSE)
