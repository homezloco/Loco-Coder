"""
Project Management Module
------------------------
Manages project creation, configuration, and deployment with multi-tenant isolation
and comprehensive fallback mechanisms.
"""

import os
import json
import uuid
import logging
import datetime
from typing import Dict, List, Optional, Any, Union
from pathlib import Path

# Try to import database module with fallback
try:
    from database import get_db_session, Base, engine
    database_available = True
except ImportError:
    logging.warning("Main database module not available, using local fallback")
    database_available = False
    
    # Local fallback for database types
    try:
        from sqlalchemy.ext.declarative import declarative_base
        Base = declarative_base()
    except ImportError:
        class Base:
            __tablename__ = ""
            metadata = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import user management with fallback
try:
    from user_management import User, get_current_active_user, get_current_admin_user
except ImportError:
    logger.warning("User management module not available, using local fallback")
    from typing import Dict
    
    class User:
        """Minimal User model fallback"""
        id: str
        username: str
        organization_id: Optional[str]
        is_admin: bool

# Import Pydantic and FastAPI with fallbacks
try:
    from pydantic import BaseModel, Field, validator
    from fastapi import Depends, HTTPException, status
    pydantic_available = True
except ImportError:
    pydantic_available = False
    logger.warning("Pydantic/FastAPI not available, using dict-based models")
    
    # Simple BaseModel fallback
    class BaseModel:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

# Try to import SQLAlchemy components
try:
    import sqlalchemy as sa
    from sqlalchemy.orm import relationship
    sqlalchemy_available = True
except ImportError:
    sqlalchemy_available = False

# Constants
DEFAULT_PROJECT_LIMITS = {
    "max_services": 10,
    "max_storage_mb": 100,
    "max_requests_per_day": 1000,
    "max_deploy_frequency": 20  # deploys per day
}

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
        config: Dict[str, Any] = {}
        
        @classmethod
        def from_orm(cls, obj):
            if hasattr(obj, '__dict__'):
                data = {**obj.__dict__}
                # Handle SQLAlchemy specific attributes
                if '_sa_instance_state' in data:
                    del data['_sa_instance_state']
                return cls(**data)
            return obj
        
        class Config:
            orm_mode = True
            
    class ServiceBase(BaseModel):
        """Base service model"""
        name: str
        description: Optional[str] = None
        service_type: str
        config: Dict[str, Any] = {}
        
        @validator("service_type")
        def validate_service_type(cls, v):
            if v not in SERVICE_TYPES:
                raise ValueError(f"Service type must be one of: {', '.join(SERVICE_TYPES)}")
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
            if hasattr(obj, '__dict__'):
                data = {**obj.__dict__}
                # Handle SQLAlchemy specific attributes
                if '_sa_instance_state' in data:
                    del data['_sa_instance_state']
                return cls(**data)
            return obj
        
        class Config:
            from_attributes = True  # This replaces orm_mode in Pydantic v2
else:
    # Simple dict-based models as fallback
    ProjectBase = dict
    ProjectCreate = dict
    ProjectUpdate = dict
    Project = dict
    ServiceBase = dict
    ServiceCreate = dict
    Service = dict

# Database models
if database_available and sqlalchemy_available:
    class ProjectModel(Base):
        """SQLAlchemy Project model"""
        __tablename__ = "projects"
        
        id = sa.Column(sa.String(36), primary_key=True, index=True)
        name = sa.Column(sa.String(100), index=True)
        description = sa.Column(sa.Text, nullable=True)
        project_type = sa.Column(sa.String(20))
        owner_id = sa.Column(sa.String(36), index=True)
        organization_id = sa.Column(sa.String(36), sa.ForeignKey("organizations.id"), nullable=True, index=True)
        created_at = sa.Column(sa.DateTime, default=datetime.datetime.utcnow)
        updated_at = sa.Column(sa.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
        is_active = sa.Column(sa.Boolean, default=True)
        config = sa.Column(sa.JSON, default={})
        
        # Relationships
        services = relationship("ServiceModel", back_populates="project", cascade="all, delete-orphan")
        
    class ServiceModel(Base):
        """SQLAlchemy Service model"""
        __tablename__ = "services"
        
        id = sa.Column(sa.String(36), primary_key=True, index=True)
        project_id = sa.Column(sa.String(36), sa.ForeignKey("projects.id"), index=True)
        name = sa.Column(sa.String(100), index=True)
        description = sa.Column(sa.Text, nullable=True)
        service_type = sa.Column(sa.String(20))
        created_at = sa.Column(sa.DateTime, default=datetime.datetime.utcnow)
        updated_at = sa.Column(sa.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
        config = sa.Column(sa.JSON, default={})
        status = sa.Column(sa.String(20), default="inactive")
        
        # Relationships
        project = relationship("ProjectModel", back_populates="services")

class ProjectManager:
    """
    Project management service with comprehensive fallbacks
    
    Primary: SQL Database
    Fallback 1: JSON file-based storage
    Fallback 2: In-memory storage (ephemeral)
    """
    
    def __init__(self, db_session=None):
        """Initialize project manager with available storage"""
        self.db_session = db_session
        self.storage_mode = "database" if database_available and db_session else "file"
        
        # Set up file storage if needed
        if self.storage_mode == "file":
            self.data_dir = Path("./data/projects")
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.projects_file = self.data_dir / "projects.json"
            self.services_file = self.data_dir / "services.json"
            
            # Initialize files if they don't exist
            if not self.projects_file.exists():
                with open(self.projects_file, "w") as f:
                    json.dump([], f)
            
            if not self.services_file.exists():
                with open(self.services_file, "w") as f:
                    json.dump([], f)
        
        # In-memory fallback
        self.memory_projects = {}
        self.memory_services = {}
        
        logger.info(f"ProjectManager initialized with {self.storage_mode} storage mode")
    
    async def create_project(self, project_data: Union[ProjectCreate, dict], owner_id: str) -> Union[Project, dict]:
        """
        Create a new project with comprehensive error handling and fallbacks
        
        Args:
            project_data: Project data as either a Pydantic model or dict
            owner_id: ID of the user creating the project
            
        Returns:
            Union[Project, dict]: The created project data
            
        Raises:
            ValueError: If project data is invalid
            Exception: If all storage methods fail
        """
        try:
            # Generate project ID and timestamp
            project_id = str(uuid.uuid4())
            now = datetime.datetime.utcnow()
            
            # Convert to dict if needed and validate required fields
            if not isinstance(project_data, dict):
                project_data = project_data.dict()
                
            # Validate required fields
            required_fields = ["name", "project_type"]
            for field in required_fields:
                if field not in project_data or not project_data[field]:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate project type
            valid_project_types = ["web", "api", "mobile", "desktop", "ml", "data", "iot", "other"]
            if project_data["project_type"] not in valid_project_types:
                raise ValueError(f"Invalid project type. Must be one of: {', '.join(valid_project_types)}")
            
            # Prepare project data
            project_dict = {
                "id": project_id,
                "name": project_data["name"],
                "description": project_data.get("description"),
                "project_type": project_data["project_type"],
                "owner_id": owner_id,
                "organization_id": project_data.get("organization_id"),
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "is_active": True,
                "config": project_data.get("config", {})
            }
            
            # Try database storage first
            if self.storage_mode == "database" and database_available and sqlalchemy_available:
                try:
                    db_project = ProjectModel(**{
                        k: v for k, v in project_dict.items() 
                        if k != 'config' and not k.endswith('_at')
                    })
                    db_project.created_at = now
                    db_project.updated_at = now
                    db_project.config = project_dict["config"]
                    
                    self.db_session.add(db_project)
                    self.db_session.commit()
                    self.db_session.refresh(db_project)
                    
                    logger.info(f"Successfully created project {project_id} in database")
                    
                    # Convert to Pydantic model or dict
                    if pydantic_available:
                        return Project.from_orm(db_project)
                    return db_project.__dict__
                        
                except Exception as db_error:
                    logger.error(f"Database project creation failed: {db_error}")
                    # Rollback any failed transaction
                    if self.db_session:
                        self.db_session.rollback()
                    # Fall through to file storage
            
            # File-based storage fallback
            if self.storage_mode == "file" or not self.storage_mode == "database":
                try:
                    # Read existing projects
                    projects = []
                    if self.projects_file.exists():
                        with open(self.projects_file, 'r') as f:
                            try:
                                projects = json.load(f)
                                if not isinstance(projects, list):
                                    projects = []
                            except json.JSONDecodeError:
                                logger.warning("Corrupted projects file, starting fresh")
                                projects = []
                    
                    # Add new project
                    projects.append(project_dict)
                    
                    # Write back to file
                    with open(self.projects_file, 'w') as f:
                        json.dump(projects, f, indent=2, default=str)
                    
                    logger.info(f"Successfully created project {project_id} in file storage")
                    return project_dict
                    
                except Exception as file_error:
                    logger.error(f"File storage project creation failed: {file_error}")
                    # Fall through to memory storage
            
            # In-memory storage as last resort
            try:
                self.memory_projects[project_id] = project_dict
                logger.warning(f"Using in-memory storage for project {project_id} - data will be lost on restart")
                return project_dict
                
            except Exception as mem_error:
                logger.error(f"In-memory project creation failed: {mem_error}")
                raise Exception("All storage methods failed for project creation")
                
        except ValueError as ve:
            logger.error(f"Validation error creating project: {ve}")
            raise
            
        except Exception as e:
            logger.error(f"Unexpected error creating project: {e}", exc_info=True)
            raise
            
        # File-based storage fallback
        if self.storage_mode == "file":
            try:
                try:
                    with open(self.projects_file, "r") as f:
                        projects = json.load(f)
                except (FileNotFoundError, json.JSONDecodeError):
                    logger.error("Failed to read projects file, creating new one")
                    projects = []
                
                projects.append(project_record)
                
                with open(self.projects_file, "w") as f:
                    json.dump(projects, f, indent=2)
                
                if pydantic_available:
                    return Project(**project_record)
                return project_record
                    
            except Exception as e:
                logger.error(f"File-based project creation failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        project_record = {
            "id": project_id,
            "name": project_data["name"],
            "description": project_data.get("description"),
            "project_type": project_data["project_type"],
            "owner_id": owner_id,
            "organization_id": project_data.get("organization_id"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "is_active": True,
            "config": {}
        }
        
        self.memory_projects[project_id] = project_record
        
        if pydantic_available:
            return Project(**project_record)
        else:
            return project_record
    
    async def get_projects_for_user(self, user_id: str, organization_id: Optional[str] = None) -> List[Union[Project, dict]]:
        """Get all projects for a user, optionally filtered by organization"""
        projects = []
        
        if self.storage_mode == "database" and database_available and sqlalchemy_available:
            try:
                query = self.db_session.query(ProjectModel).filter(
                    (ProjectModel.owner_id == user_id) | 
                    (ProjectModel.organization_id == organization_id if organization_id else False)
                )
                
                db_projects = query.all()
                
                for db_project in db_projects:
                    if pydantic_available:
                        projects.append(Project(
                            id=db_project.id,
                            name=db_project.name,
                            description=db_project.description,
                            project_type=db_project.project_type,
                            owner_id=db_project.owner_id,
                            organization_id=db_project.organization_id,
                            created_at=db_project.created_at,
                            updated_at=db_project.updated_at,
                            is_active=db_project.is_active,
                            config=db_project.config
                        ))
                    else:
                        projects.append({
                            "id": db_project.id,
                            "name": db_project.name,
                            "description": db_project.description,
                            "project_type": db_project.project_type,
                            "owner_id": db_project.owner_id,
                            "organization_id": db_project.organization_id,
                            "created_at": db_project.created_at,
                            "updated_at": db_project.updated_at,
                            "is_active": db_project.is_active,
                            "config": db_project.config
                        })
                
                return projects
                
            except Exception as e:
                logger.error(f"Database project retrieval failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        # File-based storage
        if self.storage_mode == "file":
            try:
                with open(self.projects_file, "r") as f:
                    all_projects = json.load(f)
                
                for project in all_projects:
                    if (project["owner_id"] == user_id or 
                        (organization_id and project.get("organization_id") == organization_id)):
                        if pydantic_available:
                            # Convert string dates to datetime objects
                            project["created_at"] = datetime.datetime.fromisoformat(project["created_at"])
                            project["updated_at"] = datetime.datetime.fromisoformat(project["updated_at"])
                            projects.append(Project(**project))
                        else:
                            projects.append(project)
                
                return projects
                
            except Exception as e:
                logger.error(f"File-based project retrieval failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage
        for project_id, project in self.memory_projects.items():
            if (project["owner_id"] == user_id or 
                (organization_id and project.get("organization_id") == organization_id)):
                if pydantic_available:
                    # Convert string dates to datetime objects if needed
                    if isinstance(project["created_at"], str):
                        project["created_at"] = datetime.datetime.fromisoformat(project["created_at"])
                    if isinstance(project["updated_at"], str):
                        project["updated_at"] = datetime.datetime.fromisoformat(project["updated_at"])
                    
                    projects.append(Project(**project))
                else:
                    projects.append(project)
        
        return projects
    
    async def create_service(self, service_data: Union[ServiceCreate, dict]) -> Union[Service, dict]:
        """Create a new service for a project"""
        service_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow()
        
        # Convert to dict if needed
        if not isinstance(service_data, dict):
            service_data = service_data.dict()
        
        project_id = service_data.get("project_id")
        if not project_id:
            raise ValueError("Project ID is required")
        
        # Verify project exists
        project = await self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        if self.storage_mode == "database" and database_available and sqlalchemy_available:
            try:
                db_service = ServiceModel(
                    id=service_id,
                    project_id=project_id,
                    name=service_data["name"],
                    description=service_data.get("description"),
                    service_type=service_data["service_type"],
                    created_at=now,
                    updated_at=now,
                    config=service_data.get("config", {}),
                    status="inactive"
                )
                
                self.db_session.add(db_service)
                self.db_session.commit()
                self.db_session.refresh(db_service)
                
                # Convert to Pydantic model or dict
                if pydantic_available:
                    return Service(
                        id=db_service.id,
                        project_id=db_service.project_id,
                        name=db_service.name,
                        description=db_service.description,
                        service_type=db_service.service_type,
                        created_at=db_service.created_at,
                        updated_at=db_service.updated_at,
                        config=db_service.config,
                        status=db_service.status
                    )
                else:
                    return {
                        "id": db_service.id,
                        "project_id": db_service.project_id,
                        "name": db_service.name,
                        "description": db_service.description,
                        "service_type": db_service.service_type,
                        "created_at": db_service.created_at,
                        "updated_at": db_service.updated_at,
                        "config": db_service.config,
                        "status": db_service.status
                    }
                    
            except Exception as e:
                logger.error(f"Database service creation failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        # File-based storage
        if self.storage_mode == "file":
            try:
                service_record = {
                    "id": service_id,
                    "project_id": project_id,
                    "name": service_data["name"],
                    "description": service_data.get("description"),
                    "service_type": service_data["service_type"],
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                    "config": service_data.get("config", {}),
                    "status": "inactive"
                }
                
                services = []
                try:
                    with open(self.services_file, "r") as f:
                        services = json.load(f)
                except Exception:
                    logger.error("Failed to read services file, creating new one")
                
                services.append(service_record)
                
                with open(self.services_file, "w") as f:
                    json.dump(services, f, indent=2)
                
                if pydantic_available:
                    return Service(**service_record)
                else:
                    return service_record
                    
            except Exception as e:
                logger.error(f"File-based service creation failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        service_record = {
            "id": service_id,
            "project_id": project_id,
            "name": service_data["name"],
            "description": service_data.get("description"),
            "service_type": service_data["service_type"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "config": service_data.get("config", {}),
            "status": "inactive"
        }
        
        self.memory_services[service_id] = service_record
        
        if pydantic_available:
            return Service(**service_record)
        else:
            return service_record
    
    async def get_project(self, project_id: str) -> Optional[Union[Project, dict]]:
        """Get a project by ID"""
        if self.storage_mode == "database" and database_available and sqlalchemy_available:
            try:
                db_project = self.db_session.query(ProjectModel).filter(ProjectModel.id == project_id).first()
                
                if not db_project:
                    return None
                
                if pydantic_available:
                    return Project(
                        id=db_project.id,
                        name=db_project.name,
                        description=db_project.description,
                        project_type=db_project.project_type,
                        owner_id=db_project.owner_id,
                        organization_id=db_project.organization_id,
                        created_at=db_project.created_at,
                        updated_at=db_project.updated_at,
                        is_active=db_project.is_active,
                        config=db_project.config
                    )
                else:
                    return {
                        "id": db_project.id,
                        "name": db_project.name,
                        "description": db_project.description,
                        "project_type": db_project.project_type,
                        "owner_id": db_project.owner_id,
                        "organization_id": db_project.organization_id,
                        "created_at": db_project.created_at,
                        "updated_at": db_project.updated_at,
                        "is_active": db_project.is_active,
                        "config": db_project.config
                    }
            
            except Exception as e:
                logger.error(f"Database project retrieval failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        # File storage
        if self.storage_mode == "file":
            try:
                with open(self.projects_file, "r") as f:
                    projects = json.load(f)
                
                project = next((p for p in projects if p["id"] == project_id), None)
                
                if not project:
                    return None
                
                if pydantic_available:
                    # Convert string dates to datetime objects
                    project["created_at"] = datetime.datetime.fromisoformat(project["created_at"])
                    project["updated_at"] = datetime.datetime.fromisoformat(project["updated_at"])
                    return Project(**project)
                else:
                    return project
                    
            except Exception as e:
                logger.error(f"File-based project retrieval failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage
        project = self.memory_projects.get(project_id)
        if not project:
            return None
        
        if pydantic_available:
            # Convert string dates to datetime objects if needed
            if isinstance(project["created_at"], str):
                project["created_at"] = datetime.datetime.fromisoformat(project["created_at"])
            if isinstance(project["updated_at"], str):
                project["updated_at"] = datetime.datetime.fromisoformat(project["updated_at"])
                
            return Project(**project)
        else:
            return project
    
    async def get_services_for_project(self, project_id: str) -> List[Union[Service, dict]]:
        """Get all services for a project"""
        services = []
        
        if self.storage_mode == "database" and database_available and sqlalchemy_available:
            try:
                db_services = self.db_session.query(ServiceModel).filter(
                    ServiceModel.project_id == project_id
                ).all()
                
                for db_service in db_services:
                    if pydantic_available:
                        services.append(Service(
                            id=db_service.id,
                            project_id=db_service.project_id,
                            name=db_service.name,
                            description=db_service.description,
                            service_type=db_service.service_type,
                            created_at=db_service.created_at,
                            updated_at=db_service.updated_at,
                            config=db_service.config,
                            status=db_service.status
                        ))
                    else:
                        services.append({
                            "id": db_service.id,
                            "project_id": db_service.project_id,
                            "name": db_service.name,
                            "description": db_service.description,
                            "service_type": db_service.service_type,
                            "created_at": db_service.created_at,
                            "updated_at": db_service.updated_at,
                            "config": db_service.config,
                            "status": db_service.status
                        })
                
                return services
                
            except Exception as e:
                logger.error(f"Database service retrieval failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        # File storage
        if self.storage_mode == "file":
            try:
                with open(self.services_file, "r") as f:
                    all_services = json.load(f)
                
                for service in all_services:
                    if service["project_id"] == project_id:
                        if pydantic_available:
                            # Convert string dates to datetime objects
                            service["created_at"] = datetime.datetime.fromisoformat(service["created_at"])
                            service["updated_at"] = datetime.datetime.fromisoformat(service["updated_at"])
                            services.append(Service(**service))
                        else:
                            services.append(service)
                
                return services
                
            except Exception as e:
                logger.error(f"File-based service retrieval failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage
        for service_id, service in self.memory_services.items():
            if service["project_id"] == project_id:
                if pydantic_available:
                    # Convert string dates to datetime objects if needed
                    if isinstance(service["created_at"], str):
                        service["created_at"] = datetime.datetime.fromisoformat(service["created_at"])
                    if isinstance(service["updated_at"], str):
                        service["updated_at"] = datetime.datetime.fromisoformat(service["updated_at"])
                    
                    services.append(Service(**service))
                else:
                    services.append(service)
        
        return services
    
    async def can_access_project(self, project_id: str, user_id: str, organization_id: Optional[str] = None) -> bool:
        """Check if a user has access to a project"""
        project = await self.get_project(project_id)
        if not project:
            return False
        
        # Get project owner ID and organization ID
        project_owner_id = project.owner_id if hasattr(project, 'owner_id') else project.get('owner_id')
        project_org_id = project.organization_id if hasattr(project, 'organization_id') else project.get('organization_id')
        
        # User is owner or in the same organization
        return (project_owner_id == user_id or 
                (organization_id and project_org_id and organization_id == project_org_id))

# Create singleton instance
project_manager = ProjectManager()

# Dependency for API routes
async def get_project_manager():
    # In a real application, you would inject dependencies like the database session
    return project_manager

# Access control dependencies
async def validate_project_access(
    project_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Union[Project, dict]:
    """Validate user has access to a project"""
    project = await project_manager.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get project owner ID and organization ID from either Pydantic model or dict
    project_owner_id = project.owner_id if hasattr(project, 'owner_id') else project.get('owner_id')
    project_org_id = project.organization_id if hasattr(project, 'organization_id') else project.get('organization_id')
    
    user_org_id = current_user.organization_id if hasattr(current_user, 'organization_id') else current_user.get('organization_id')
    
    # Check if user has access
    if (current_user.id == project_owner_id or 
        current_user.is_admin or 
        (user_org_id and project_org_id and user_org_id == project_org_id)):
        return project
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this project"
    )
