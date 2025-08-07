# Code Generation and Download Features

This document provides information about the code generation and download features implemented in the Coder platform.

## Overview

The platform now supports generating code based on ERD (Entity-Relationship Diagrams), API designs, and test data. The generated code can be downloaded as a ZIP file for easy integration into your development workflow.

## Backend Endpoints

### Generate Code

Generates code based on ERD, API design, and test data.

- **URL**: `/api/v1/projects/{project_id}/generate-code`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "project_id": "your-project-id",
    "techStack": "python-fastapi",
    "erd": {
      "entities": [...],
      "relationships": [...]
    },
    "apiDesign": {
      "endpoints": [...]
    },
    "tests": {
      "testCases": [...]
    }
  }
  ```
- **Response**:
  ```json
  {
    "project_id": "your-project-id",
    "code": {
      "main.py": "...",
      "models.py": "...",
      "routers/users.py": "..."
    },
    "message": "Code generated successfully",
    "success": true,
    "timestamp": "2025-08-06T21:15:00"
  }
  ```

### Download Code

Downloads generated code as a ZIP file.

- **URL**: `/api/v1/projects/{project_id}/download-code`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "project_id": "your-project-id",
    "code": {
      "main.py": "...",
      "models.py": "...",
      "routers/users.py": "..."
    },
    "techStack": "python-fastapi"
  }
  ```
- **Response**: Binary ZIP file with appropriate headers

## Frontend Integration

The `ImplementationEditor` component has been updated to integrate with these endpoints:

1. The component sends ERD, API design, and test data to the backend
2. It displays the generated code in a file explorer
3. It allows downloading the code as a ZIP file

## Testing

A test script is provided to verify the functionality:

```bash
# Run the test script
python tests/test_endpoints.py

# Custom options
python tests/test_endpoints.py --base-url http://localhost:8000 --project-id custom-project-123
```

## Supported Technology Stacks

- `python-fastapi`: Python with FastAPI framework
- `node-express`: Node.js with Express framework
- `django`: Python with Django framework
- `spring-boot`: Java with Spring Boot framework

## Fallback Mechanisms

The system includes multiple fallback mechanisms:

1. If the backend API call fails, the frontend falls back to local code generation
2. If OpenAI API is not available, the backend falls back to template-based code generation
3. Authentication fallbacks ensure the system works in development environments

## Security Considerations

- Authentication is required for all endpoints
- Project access is validated before code generation or download
- In production environments, strict authentication is enforced
- Development fallbacks are disabled in production

## Future Improvements

- Add more technology stacks
- Improve code quality with linting and formatting
- Support for custom templates
- Integration with version control systems
