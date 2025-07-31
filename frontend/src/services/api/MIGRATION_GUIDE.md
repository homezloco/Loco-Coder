# Migration Guide: API Module Restructuring

This document guides you through migrating from the old `api.js` to the new modular API structure.

## Overview of Changes

The API has been restructured into separate modules for better maintainability and organization. The main changes are:

1. **Modular Structure**: Split into `auth`, `projects`, `files`, and `templates` modules.
2. **Better Error Handling**: Consistent error handling with custom error classes.
3. **Improved Caching**: Enhanced caching with TTL and cleanup.
4. **Type Safety**: Better JSDoc comments for improved IDE support.
5. **Fallback Mechanisms**: Robust fallbacks for offline/error scenarios.

## Migration Steps

### 1. Update Imports

**Before:**
```javascript
import api from './services/api';
```

**After:**
```javascript
import api from './services/api';
// OR import specific modules
import { auth, projects, files, templates } from './services/api';
```

### 2. Authentication

**Before:**
```javascript
api.login(username, password);
api.logout();
const token = api.getAuthToken();
```

**After:**
```javascript
// Using default export
api.auth.login(username, password);
api.auth.logout();
const token = api.getAuthToken(); // Still works for backward compatibility

// Or using named imports
import { auth } from './services/api';
auth.login(username, password);
```

### 3. Projects

**Before:**
```javascript
api.getProjects();
api.getProject(id);
api.createProject(data);
api.updateProject(id, updates);
api.deleteProject(id);
```

**After:**
```javascript
// Using default export
api.projects.getProjects();
api.projects.getProject(id);
api.projects.createProject(data);
api.projects.updateProject(id, updates);
api.projects.deleteProject(id);

// Or using named imports
import { projects } from './services/api';
projects.getProjects();
```

### 4. Files

**Before:**
```javascript
api.readFile(projectId, filePath);
api.writeFile(projectId, filePath, content);
```

**After:**
```javascript
// Using default export
api.files.readFile(projectId, filePath);
api.files.writeFile(projectId, filePath, content);
api.files.deleteFile(projectId, filePath);
api.files.moveFile(projectId, oldPath, newPath);
api.files.createDirectory(projectId, dirPath);

// Or using named imports
import { files } from './services/api';
files.readFile(projectId, filePath);
```

### 5. Templates

**Before:**
```javascript
api.getTemplates();
```

**After:**
```javascript
// Using default export
api.templates.getTemplates();
api.templates.getTemplate(templateId);
api.templates.createProjectFromTemplate(templateId, projectData);

// Or using named imports
import { templates } from './services/api';
templates.getTemplates();
```

### 6. Error Handling

**Before:**
```javascript
try {
  await api.someMethod();
} catch (error) {
  console.error('Error:', error);
}
```

**After:**
```javascript
import { BadRequestError, NotFoundError } from './services/api/utils/errors';

try {
  await api.someMethod();
} catch (error) {
  if (error instanceof BadRequestError) {
    console.error('Validation error:', error.details);
  } else if (error instanceof NotFoundError) {
    console.error('Not found:', error.message);
  } else {
    console.error('Error:', error);
  }
}
```

## New Features

### Authentication State Subscription

```javascript
const unsubscribe = api.onAuthStateChanged(({ isAuthenticated, user }) => {
  console.log('Auth state changed:', { isAuthenticated, user });
});

// Later, to unsubscribe
unsubscribe();
```

### Caching

```javascript
// Get with caching (5 minutes TTL)
const projects = await api.projects.getProjects();

// Force refresh
const freshProjects = await api.projects.getProjects({ forceRefresh: true });
```

### File Operations

```javascript
// Read file
const content = await api.files.readFile(projectId, 'path/to/file.txt');

// Write file
await api.files.writeFile(projectId, 'path/to/file.txt', 'Hello, World!');

// Create directory
await api.files.createDirectory(projectId, 'path/to/new/directory');

// Move/rename file
await api.files.moveFile(projectId, 'old/path.txt', 'new/path.txt');

// Delete file
await api.files.deleteFile(projectId, 'path/to/delete.txt');
```

## Backward Compatibility

Most of the original API methods are still available on the default export for backward compatibility, but it's recommended to update to the new module structure for better maintainability.

## TypeScript Support

If you're using TypeScript, you can take advantage of the included type definitions for better IDE support and type safety.

## Testing

After migration, thoroughly test all API interactions, especially:
1. Authentication flows (login/logout)
2. Project CRUD operations
3. File operations
4. Error handling
5. Offline/fallback behavior

## Troubleshooting

If you encounter any issues:
1. Check the browser console for error messages
2. Verify that all imports are correct
3. Ensure the API server is running and accessible
4. Check network requests in the browser's developer tools
5. Look for any deprecation warnings in the console
