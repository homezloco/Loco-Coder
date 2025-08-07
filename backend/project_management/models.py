"""
Project Management Models
------------------------
Pydantic models for project management with fallbacks for environments
without Pydantic.
"""

import datetime
from typing import Dict, List, Optional, Any, Union

# Import Pydantic with fallbacks
try:
    from pydantic import BaseModel, Field, validator
    pydantic_available = True
except ImportError:
    pydantic_available = False
    import logging
    logging.warning("Pydantic not available, using dict-based models")
    
    # Simple BaseModel fallback
    class BaseModel:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

# Constants
PROJECT_TYPES = ["web", "api", "mobile", "desktop", "ml", "data", "iot", "other"]
SERVICE_TYPES = ["backend", "frontend", "database", "cache", "queue", "storage", "ai", "other"]

# Pydantic models
if pydantic_available:
    class ProjectBase(BaseModel):
        """Base project model"""
        name: str
        description: Optional[str] = None
        project_type: str
        
        @validator('project_type')
        def validate_project_type(cls, v):
            valid_types = ['web', 'api', 'mobile', 'desktop', 'cli', 'library', 'other']
            if v not in valid_types:
                raise ValueError(f'Project type must be one of {valid_types}')
            return v
            
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
            
    class ProjectCreate(ProjectBase):
        """Model for creating a project"""
        organization_id: Optional[str] = None
        
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
    
    class ProjectUpdate(BaseModel):
        """Model for updating a project"""
        name: Optional[str] = None
        description: Optional[str] = None
        is_active: Optional[bool] = None
        config: Optional[Dict[str, Any]] = None
        
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
        
    class Project(BaseModel):
        """Full project model for responses"""
        id: str
        name: str
        description: Optional[str] = None
        project_type: str
        owner_id: str
        organization_id: Optional[str] = None
        created_at: datetime.datetime
        updated_at: datetime.datetime
        is_active: bool = True
        config: Dict[str, Any] = Field(default_factory=dict)
        
        @classmethod
        def from_orm(cls, obj):
            """Convert from ORM object to Pydantic model"""
            if isinstance(obj, dict):
                return cls(**obj)
            
            # Convert datetime strings to datetime objects if needed
            if isinstance(obj.created_at, str):
                obj.created_at = datetime.datetime.fromisoformat(obj.created_at)
            if isinstance(obj.updated_at, str):
                obj.updated_at = datetime.datetime.fromisoformat(obj.updated_at)
                
            return cls.model_validate(obj) if hasattr(cls, 'model_validate') else cls.from_orm(obj)
        
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
            
    class ServiceBase(BaseModel):
        """Base service model"""
        name: str
        description: Optional[str] = None
        service_type: str
        config: Dict[str, Any] = Field(default_factory=dict)
        
        @validator('service_type')
        def validate_service_type(cls, v):
            if v not in SERVICE_TYPES:
                raise ValueError(f'Service type must be one of {SERVICE_TYPES}')
            return v
            
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
            
    class ServiceCreate(ServiceBase):
        """Model for creating a service"""
        project_id: str
        
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
            
    class Service(ServiceBase):
        """Full service model for responses"""
        id: str
        project_id: str
        created_at: datetime.datetime
        updated_at: datetime.datetime
        status: str = "inactive"
        
        @classmethod
        def from_orm(cls, obj):
            """Convert from ORM object to Pydantic model"""
            if isinstance(obj, dict):
                return cls(**obj)
                
            # Convert datetime strings to datetime objects if needed
            if isinstance(obj.created_at, str):
                obj.created_at = datetime.datetime.fromisoformat(obj.created_at)
            if isinstance(obj.updated_at, str):
                obj.updated_at = datetime.datetime.fromisoformat(obj.updated_at)
                
            return cls.model_validate(obj) if hasattr(cls, 'model_validate') else cls.from_orm(obj)
            
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
            
    # New models for code generation
    class CodeGenerationRequest(BaseModel):
        """Request model for code generation"""
        project_id: str
        erd_data: Dict[str, Any]
        api_design: Dict[str, Any]
        test_data: Optional[Dict[str, Any]] = None
        target_language: str = "python"
        target_framework: str = "fastapi"
        include_tests: bool = True
        include_documentation: bool = True
        
        class Config:
            from_attributes = True
            
    class CodeGenerationResponse(BaseModel):
        """Response model for code generation"""
        project_id: str
        generated_code: Dict[str, Any]
        message: str
        success: bool
        timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)
        
        class Config:
            from_attributes = True
            
    class CodeDownloadRequest(BaseModel):
        """Request model for downloading generated code as a ZIP file"""
        project_id: str
        code: Dict[str, str]  # Dictionary of filename to code content
        techStack: str
        
        class Config:
            from_attributes = True
            
    class CodeDownloadResponse(BaseModel):
        """Response model for downloading generated code as a ZIP file"""
        project_id: str
        zip_file: bytes
        message: str
        success: bool
        timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)
        
        class Config:
            from_attributes = True
            
else:
    # Fallback simple classes if Pydantic is not available
    class ProjectBase:
        """Base project model"""
        def __init__(self, name, description=None, project_type=None):
            self.name = name
            self.description = description
            self.project_type = project_type
            
    class ProjectCreate(ProjectBase):
        """Model for creating a project"""
        def __init__(self, name, description=None, project_type=None, organization_id=None):
            super().__init__(name, description, project_type)
            self.organization_id = organization_id
            
    class ProjectUpdate:
        """Model for updating a project"""
        def __init__(self, name=None, description=None, is_active=None, config=None):
            self.name = name
            self.description = description
            self.is_active = is_active
            self.config = config or {}
            
    class Project:
        """Full project model for responses"""
        def __init__(self, id, name, description=None, project_type=None, owner_id=None,
                    organization_id=None, created_at=None, updated_at=None, is_active=True, config=None):
            self.id = id
            self.name = name
            self.description = description
            self.project_type = project_type
            self.owner_id = owner_id
            self.organization_id = organization_id
            self.created_at = created_at or datetime.datetime.now()
            self.updated_at = updated_at or datetime.datetime.now()
            self.is_active = is_active
            self.config = config or {}
            
    class ServiceBase:
        """Base service model"""
        def __init__(self, name, description=None, service_type=None, config=None):
            self.name = name
            self.description = description
            self.service_type = service_type
            self.config = config or {}
            
    class ServiceCreate(ServiceBase):
        """Model for creating a service"""
        def __init__(self, name, description=None, service_type=None, config=None, project_id=None):
            super().__init__(name, description, service_type, config)
            self.project_id = project_id
            
    class Service(ServiceBase):
        """Full service model for responses"""
        def __init__(self, id, project_id, name, description=None, service_type=None,
                    created_at=None, updated_at=None, status="inactive", config=None):
            super().__init__(name, description, service_type, config)
            self.id = id
            self.project_id = project_id
            self.created_at = created_at or datetime.datetime.now()
            self.updated_at = updated_at or datetime.datetime.now()
            self.status = status
            
    # New models for code generation
    class CodeGenerationRequest:
        """Request model for code generation"""
        def __init__(self, project_id, erd_data, api_design, test_data=None,
                    target_language="python", target_framework="fastapi",
                    include_tests=True, include_documentation=True):
            self.project_id = project_id
            self.erd_data = erd_data
            self.api_design = api_design
            self.test_data = test_data or {}
            self.target_language = target_language
            self.target_framework = target_framework
            self.include_tests = include_tests
            self.include_documentation = include_documentation
            
    class CodeGenerationResponse:
        """Response model for code generation"""
        def __init__(self, project_id, generated_code, message, success, timestamp=None):
            self.project_id = project_id
            self.generated_code = generated_code
            self.message = message
            self.success = success
            self.timestamp = timestamp or datetime.datetime.now()

    class CodeDownloadRequest:
        """Request model for downloading generated code as a ZIP file"""
        def __init__(self, project_id, code, techStack):
            self.project_id = project_id
            self.code = code
            self.techStack = techStack
            
    class CodeDownloadResponse:
        """Response model for downloading generated code as a ZIP file"""
        def __init__(self, project_id, zip_file, message, success, timestamp=None):
            self.project_id = project_id
            self.zip_file = zip_file
            self.message = message
            self.success = success
            self.timestamp = timestamp or datetime.datetime.now()
