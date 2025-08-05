# Entity Relationship Diagram

## Overview

This document provides the Entity Relationship Diagram for the WindSurf AI Coding Platform database.

```mermaid
erDiagram
    User {
        string id PK
        string username
        string email
        string password_hash
        boolean is_active
        boolean is_admin
        datetime created_at
        datetime updated_at
        string organization_id FK
    }
    
    Organization {
        string id PK
        string name
        string description
        datetime created_at
        datetime updated_at
    }
    
    Project {
        string id PK
        string name
        string description
        string project_type
        string owner_id FK
        string organization_id FK
        datetime created_at
        datetime updated_at
        json settings
    }
    
    ProjectCollaborator {
        string project_id FK
        string user_id FK
        string role
        datetime added_at
    }
    
    File {
        string id PK
        string project_id FK
        string path
        text content
        string file_type
        datetime created_at
        datetime updated_at
    }
    
    ProjectVersion {
        string id PK
        string project_id FK
        string version_number
        string created_by FK
        datetime created_at
        string description
    }
    
    FileVersion {
        string id PK
        string file_id FK
        string project_version_id FK
        text content
        datetime created_at
    }
    
    ApiKey {
        string id PK
        string user_id FK
        string key_hash
        string name
        datetime created_at
        datetime expires_at
        datetime last_used_at
    }
    
    CodeExecution {
        string id PK
        string project_id FK
        string user_id FK
        string language
        text code
        text result
        string status
        datetime created_at
        datetime completed_at
    }
    
    User ||--o{ Project : "owns"
    User ||--o{ ApiKey : "has"
    User }|--|| Organization : "belongs to"
    
    Organization ||--o{ Project : "has"
    Organization ||--o{ User : "has"
    
    Project ||--o{ File : "contains"
    Project ||--o{ ProjectVersion : "has"
    Project }|--|| User : "owned by"
    Project }o--o{ User : "collaborated on by"
    
    ProjectCollaborator }|--|| Project : "references"
    ProjectCollaborator }|--|| User : "references"
    
    File ||--o{ FileVersion : "has"
    File }|--|| Project : "belongs to"
    
    ProjectVersion ||--o{ FileVersion : "contains"
    ProjectVersion }|--|| Project : "belongs to"
    ProjectVersion }|--|| User : "created by"
    
    FileVersion }|--|| File : "version of"
    FileVersion }|--|| ProjectVersion : "part of"
    
    CodeExecution }|--|| Project : "executed in"
    CodeExecution }|--|| User : "executed by"
```

## Relationships

### User
- A User can own many Projects
- A User can have many ApiKeys
- A User can collaborate on many Projects
- A User belongs to one Organization

### Organization
- An Organization can have many Users
- An Organization can have many Projects

### Project
- A Project is owned by one User
- A Project can have many Files
- A Project can have many ProjectVersions
- A Project can have many Collaborators (Users)
- A Project belongs to one Organization

### File
- A File belongs to one Project
- A File can have many FileVersions

### ProjectVersion
- A ProjectVersion belongs to one Project
- A ProjectVersion is created by one User
- A ProjectVersion can have many FileVersions

### FileVersion
- A FileVersion belongs to one File
- A FileVersion belongs to one ProjectVersion

### ApiKey
- An ApiKey belongs to one User

### CodeExecution
- A CodeExecution belongs to one Project
- A CodeExecution is executed by one User
