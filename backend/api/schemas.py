"""
API schemas for the WindSurf AI Coding Platform.
These schemas are defined using Pydantic for request/response validation.
"""
from pydantic import BaseModel, Field, EmailStr, validator, root_validator, AnyHttpUrl
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import re
import uuid

# Helper function to generate UUIDs
def generate_uuid():
    return str(uuid.uuid4())

# Base models with common fields
class BaseSchema(BaseModel):
    """Base schema with common metadata."""
    class Config:
        orm_mode = True
        validate_assignment = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
        }

# User schemas
class UserBase(BaseSchema):
    """Base schema for User data."""
    username: str = Field(..., min_length=3, max_length=50, description="User's login name")
    email: EmailStr = Field(..., description="User's email address")
    is_active: bool = Field(True, description="Whether the user account is active")
    is_admin: bool = Field(False, description="Whether the user has admin privileges")

class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, description="User's password")
    
    @validator('password')
    def password_strength(cls, v):
        """Validate password strength."""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[^A-Za-z0-9]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class UserUpdate(BaseSchema):
    """Schema for updating a user."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    
    @validator('password')
    def password_strength(cls, v):
        """Validate password strength if provided."""
        if v is None:
            return v
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[^A-Za-z0-9]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class UserInDB(UserBase):
    """Schema for User data as stored in the database."""
    id: str = Field(..., description="Unique identifier")
    password_hash: str = Field(..., description="Hashed password")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    organization_id: Optional[str] = Field(None, description="ID of the organization the user belongs to")

class User(UserBase):
    """Schema for User data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    created_at: datetime
    updated_at: datetime
    organization_id: Optional[str] = None

# Organization schemas
class OrganizationBase(BaseSchema):
    """Base schema for Organization data."""
    name: str = Field(..., min_length=2, max_length=100, description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")

class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization."""
    pass

class OrganizationUpdate(BaseSchema):
    """Schema for updating an organization."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None

class Organization(OrganizationBase):
    """Schema for Organization data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    created_at: datetime
    updated_at: datetime

# Project schemas
class ProjectBase(BaseSchema):
    """Base schema for Project data."""
    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    project_type: str = Field(..., description="Type of project (web, mobile, etc.)")

class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Project settings")

class ProjectUpdate(BaseSchema):
    """Schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    project_type: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class Project(ProjectBase):
    """Schema for Project data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    owner_id: str = Field(..., description="ID of the user who owns the project")
    organization_id: Optional[str] = Field(None, description="ID of the organization the project belongs to")
    created_at: datetime
    updated_at: datetime
    settings: Dict[str, Any] = Field(default_factory=dict)

# File schemas
class FileBase(BaseSchema):
    """Base schema for File data."""
    path: str = Field(..., min_length=1, max_length=255, description="Path of the file within the project")
    content: Optional[str] = Field(None, description="Content of the file")
    file_type: Optional[str] = Field(None, description="Type of the file (determined by extension)")

class FileCreate(FileBase):
    """Schema for creating a new file."""
    project_id: str = Field(..., description="ID of the project the file belongs to")

class FileUpdate(BaseSchema):
    """Schema for updating a file."""
    path: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    file_type: Optional[str] = None

class File(FileBase):
    """Schema for File data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    project_id: str = Field(..., description="ID of the project the file belongs to")
    created_at: datetime
    updated_at: datetime

# ProjectVersion schemas
class ProjectVersionBase(BaseSchema):
    """Base schema for ProjectVersion data."""
    version_number: str = Field(..., description="Version number")
    description: Optional[str] = Field(None, description="Description of the version")

class ProjectVersionCreate(ProjectVersionBase):
    """Schema for creating a new project version."""
    project_id: str = Field(..., description="ID of the project")

class ProjectVersion(ProjectVersionBase):
    """Schema for ProjectVersion data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    project_id: str = Field(..., description="ID of the project")
    created_by_id: Optional[str] = Field(None, description="ID of the user who created the version")
    created_at: datetime

# FileVersion schemas
class FileVersionBase(BaseSchema):
    """Base schema for FileVersion data."""
    content: str = Field(..., description="Content of the file at this version")

class FileVersionCreate(FileVersionBase):
    """Schema for creating a new file version."""
    file_id: str = Field(..., description="ID of the file")
    project_version_id: str = Field(..., description="ID of the project version")

class FileVersion(FileVersionBase):
    """Schema for FileVersion data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    file_id: str = Field(..., description="ID of the file")
    project_version_id: str = Field(..., description="ID of the project version")
    created_at: datetime

# ApiKey schemas
class ApiKeyBase(BaseSchema):
    """Base schema for ApiKey data."""
    name: str = Field(..., min_length=1, max_length=100, description="Name of the key")
    expires_at: Optional[datetime] = Field(None, description="When the key expires")

class ApiKeyCreate(ApiKeyBase):
    """Schema for creating a new API key."""
    user_id: str = Field(..., description="ID of the user the key belongs to")

class ApiKeyResponse(ApiKeyBase):
    """Schema for API key response with the actual key value."""
    id: str = Field(..., description="Unique identifier")
    key: str = Field(..., description="The API key value (only shown once)")
    user_id: str = Field(..., description="ID of the user the key belongs to")
    created_at: datetime
    last_used_at: Optional[datetime] = None

class ApiKey(ApiKeyBase):
    """Schema for ApiKey data returned to clients (without the key value)."""
    id: str = Field(..., description="Unique identifier")
    user_id: str = Field(..., description="ID of the user the key belongs to")
    created_at: datetime
    last_used_at: Optional[datetime] = None

# CodeExecution schemas
class CodeExecutionBase(BaseSchema):
    """Base schema for CodeExecution data."""
    language: str = Field(..., description="Programming language")
    code: str = Field(..., description="Code to execute")

class CodeExecutionCreate(CodeExecutionBase):
    """Schema for creating a new code execution."""
    project_id: str = Field(..., description="ID of the project")

class CodeExecutionUpdate(BaseSchema):
    """Schema for updating a code execution."""
    result: Optional[str] = Field(None, description="Result of the execution")
    status: Optional[str] = Field(None, description="Status of the execution (success, error)")
    completed_at: Optional[datetime] = None

class CodeExecution(CodeExecutionBase):
    """Schema for CodeExecution data returned to clients."""
    id: str = Field(..., description="Unique identifier")
    project_id: str = Field(..., description="ID of the project")
    user_id: Optional[str] = Field(None, description="ID of the user who initiated the execution")
    result: Optional[str] = None
    status: str = Field(..., description="Status of the execution (success, error)")
    created_at: datetime
    completed_at: Optional[datetime] = None

# Authentication schemas
class Token(BaseSchema):
    """Schema for authentication token."""
    access_token: str
    token_type: str
    expires_at: datetime
    user: User

class TokenData(BaseSchema):
    """Schema for token data."""
    username: Optional[str] = None
    user_id: Optional[str] = None
    exp: Optional[datetime] = None

class LoginRequest(BaseSchema):
    """Schema for login request."""
    username: str
    password: str

# Error response schemas
class HTTPError(BaseSchema):
    """Schema for HTTP error responses."""
    detail: str
    status_code: int
    error_code: Optional[str] = None
    path: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Health check schemas
class HealthCheck(BaseSchema):
    """Schema for health check response."""
    status: str = Field(..., description="Overall system status")
    components: Dict[str, Dict[str, Any]] = Field(..., description="Status of individual components")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = Field(..., description="API version")

# Pagination schemas
class PaginatedResponse(BaseSchema):
    """Schema for paginated responses."""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
