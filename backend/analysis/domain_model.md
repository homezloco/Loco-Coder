# Domain Model

## Core Entities

### User
- **Description**: Represents a user of the WindSurf platform
- **Attributes**:
  - `id`: Unique identifier
  - `username`: User's login name
  - `email`: User's email address
  - `password_hash`: Hashed password
  - `is_active`: Whether the user account is active
  - `is_admin`: Whether the user has admin privileges
  - `created_at`: When the user account was created
  - `updated_at`: When the user account was last updated
- **Relationships**:
  - Has many Projects (as owner)
  - Belongs to many Projects (as collaborator)
  - Has many ApiKeys

### Project
- **Description**: Represents a coding project
- **Attributes**:
  - `id`: Unique identifier
  - `name`: Project name
  - `description`: Project description
  - `project_type`: Type of project (web, mobile, etc.)
  - `owner_id`: ID of the user who owns the project
  - `created_at`: When the project was created
  - `updated_at`: When the project was last updated
  - `settings`: JSON object with project settings
- **Relationships**:
  - Belongs to User (as owner)
  - Has many Users (as collaborators)
  - Has many Files
  - Has many ProjectVersions

### File
- **Description**: Represents a file in a project
- **Attributes**:
  - `id`: Unique identifier
  - `project_id`: ID of the project the file belongs to
  - `path`: Path of the file within the project
  - `content`: Content of the file
  - `file_type`: Type of the file (determined by extension)
  - `created_at`: When the file was created
  - `updated_at`: When the file was last updated
- **Relationships**:
  - Belongs to Project
  - Has many FileVersions

### ProjectVersion
- **Description**: Represents a version of a project
- **Attributes**:
  - `id`: Unique identifier
  - `project_id`: ID of the project
  - `version_number`: Version number
  - `created_at`: When the version was created
  - `created_by`: ID of the user who created the version
  - `description`: Description of the version
- **Relationships**:
  - Belongs to Project
  - Has many FileVersions

### FileVersion
- **Description**: Represents a version of a file
- **Attributes**:
  - `id`: Unique identifier
  - `file_id`: ID of the file
  - `project_version_id`: ID of the project version
  - `content`: Content of the file at this version
  - `created_at`: When the file version was created
- **Relationships**:
  - Belongs to File
  - Belongs to ProjectVersion

### ApiKey
- **Description**: Represents an API key for authentication
- **Attributes**:
  - `id`: Unique identifier
  - `user_id`: ID of the user the key belongs to
  - `key`: The API key value (hashed)
  - `name`: Name of the key
  - `created_at`: When the key was created
  - `expires_at`: When the key expires
  - `last_used_at`: When the key was last used
- **Relationships**:
  - Belongs to User

### CodeExecution
- **Description**: Represents a code execution session
- **Attributes**:
  - `id`: Unique identifier
  - `project_id`: ID of the project
  - `user_id`: ID of the user who initiated the execution
  - `language`: Programming language
  - `code`: Code that was executed
  - `result`: Result of the execution
  - `status`: Status of the execution (success, error)
  - `created_at`: When the execution was initiated
  - `completed_at`: When the execution was completed
- **Relationships**:
  - Belongs to Project
  - Belongs to User

## Domain Events

### UserRegistered
- Triggered when a new user registers
- Handlers: Send welcome email, create default project

### ProjectCreated
- Triggered when a new project is created
- Handlers: Initialize project structure, create default files

### CodeExecuted
- Triggered when code is executed
- Handlers: Log execution, update statistics

### FileModified
- Triggered when a file is modified
- Handlers: Create file version, trigger project build if configured

## Bounded Contexts

### User Management
- Responsible for user registration, authentication, and profile management
- Entities: User, ApiKey

### Project Management
- Responsible for project creation, configuration, and collaboration
- Entities: Project, ProjectVersion

### File Management
- Responsible for file operations and versioning
- Entities: File, FileVersion

### Code Execution
- Responsible for executing code and providing feedback
- Entities: CodeExecution

### AI Integration
- Responsible for integrating with AI services for code generation
- Uses: Ollama client, fallback mechanisms
