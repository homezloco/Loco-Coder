"""
Database models for the WindSurf AI Coding Platform.
These models are defined using SQLAlchemy ORM and correspond to the ERD.
"""
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, ForeignKey, 
    JSON, Table, UniqueConstraint, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

# Base class for all models
Base = declarative_base()

# Association table for many-to-many relationship between Project and User (collaborators)
project_collaborators = Table(
    'project_collaborators',
    Base.metadata,
    Column('project_id', String(36), ForeignKey('projects.id', ondelete='CASCADE')),
    Column('user_id', String(36), ForeignKey('users.id', ondelete='CASCADE')),
    Column('role', String(50), nullable=False, default='viewer'),
    Column('added_at', DateTime, default=datetime.utcnow),
    UniqueConstraint('project_id', 'user_id', name='uq_project_user')
)

class User(Base):
    """User model representing platform users."""
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    owned_projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    collaborated_projects = relationship("Project", secondary=project_collaborators, back_populates="collaborators")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="users")
    code_executions = relationship("CodeExecution", back_populates="user")
    project_versions = relationship("ProjectVersion", back_populates="created_by")
    
    def __repr__(self):
        return f"<User(id='{self.id}', username='{self.username}', email='{self.email}')>"

class Organization(Base):
    """Organization model for grouping users and projects."""
    __tablename__ = 'organizations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
    
    def __repr__(self):
        return f"<Organization(id='{self.id}', name='{self.name}')>"

class Project(Base):
    """Project model representing coding projects."""
    __tablename__ = 'projects'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    project_type = Column(String(50), nullable=False)
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    settings = Column(JSON, default=dict)
    
    # Relationships
    owner = relationship("User", back_populates="owned_projects")
    collaborators = relationship("User", secondary=project_collaborators, back_populates="collaborated_projects")
    files = relationship("File", back_populates="project", cascade="all, delete-orphan")
    versions = relationship("ProjectVersion", back_populates="project", cascade="all, delete-orphan")
    code_executions = relationship("CodeExecution", back_populates="project", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="projects")
    
    # Indexes
    __table_args__ = (
        Index('idx_project_owner', 'owner_id'),
        Index('idx_project_org', 'organization_id'),
    )
    
    def __repr__(self):
        return f"<Project(id='{self.id}', name='{self.name}', owner_id='{self.owner_id}')>"

class File(Base):
    """File model representing files in projects."""
    __tablename__ = 'files'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    path = Column(String(255), nullable=False)
    content = Column(Text)
    file_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="files")
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")
    
    # Unique constraint for path within a project
    __table_args__ = (
        UniqueConstraint('project_id', 'path', name='uq_project_file_path'),
        Index('idx_file_project', 'project_id'),
    )
    
    def __repr__(self):
        return f"<File(id='{self.id}', path='{self.path}', project_id='{self.project_id}')>"

class ProjectVersion(Base):
    """ProjectVersion model representing versions of projects."""
    __tablename__ = 'project_versions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(String(50), nullable=False)
    created_by_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    description = Column(Text)
    
    # Relationships
    project = relationship("Project", back_populates="versions")
    created_by = relationship("User", back_populates="project_versions")
    file_versions = relationship("FileVersion", back_populates="project_version", cascade="all, delete-orphan")
    
    # Unique constraint for version number within a project
    __table_args__ = (
        UniqueConstraint('project_id', 'version_number', name='uq_project_version_number'),
        Index('idx_project_version', 'project_id'),
    )
    
    def __repr__(self):
        return f"<ProjectVersion(id='{self.id}', project_id='{self.project_id}', version='{self.version_number}')>"

class FileVersion(Base):
    """FileVersion model representing versions of files."""
    __tablename__ = 'file_versions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    project_version_id = Column(String(36), ForeignKey('project_versions.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    file = relationship("File", back_populates="versions")
    project_version = relationship("ProjectVersion", back_populates="file_versions")
    
    # Indexes
    __table_args__ = (
        Index('idx_file_version', 'file_id'),
        Index('idx_project_version_file', 'project_version_id'),
    )
    
    def __repr__(self):
        return f"<FileVersion(id='{self.id}', file_id='{self.file_id}', project_version_id='{self.project_version_id}')>"

class ApiKey(Base):
    """ApiKey model representing API keys for authentication."""
    __tablename__ = 'api_keys'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    # Indexes
    __table_args__ = (
        Index('idx_api_key_user', 'user_id'),
    )
    
    def __repr__(self):
        return f"<ApiKey(id='{self.id}', name='{self.name}', user_id='{self.user_id}')>"

class CodeExecution(Base):
    """CodeExecution model representing code execution sessions."""
    __tablename__ = 'code_executions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    result = Column(Text)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="code_executions")
    user = relationship("User", back_populates="code_executions")
    
    # Indexes
    __table_args__ = (
        Index('idx_code_execution_project', 'project_id'),
        Index('idx_code_execution_user', 'user_id'),
    )
    
    def __repr__(self):
        return f"<CodeExecution(id='{self.id}', project_id='{self.project_id}', status='{self.status}')>"
