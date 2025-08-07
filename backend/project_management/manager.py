"""
Project Manager Module
---------------------
Core project management functionality with database, file, and memory fallbacks.
"""

import os
import json
import uuid
import logging
import datetime
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import io
import zipfile

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import database module with fallback
try:
    from database import get_db_session, Base, engine
    database_available = True
except ImportError:
    logging.warning("Main database module not available, using local fallback")
    database_available = False

# Import models
try:
    from .models import (
        Project, ProjectCreate, ProjectUpdate, Service, ServiceCreate,
        pydantic_available, PROJECT_TYPES, SERVICE_TYPES, CodeDownloadRequest, CodeDownloadResponse
    )
except ImportError:
    # Fallback for direct imports
    try:
        from project_management.models import (
            Project, ProjectCreate, ProjectUpdate, Service, ServiceCreate,
            pydantic_available, PROJECT_TYPES, SERVICE_TYPES, CodeDownloadRequest, CodeDownloadResponse
        )
    except ImportError:
        logger.error("Failed to import project management models")
        # Define minimal fallbacks
        pydantic_available = False
        PROJECT_TYPES = ["web", "api", "mobile", "desktop", "ml", "data", "iot", "other"]
        SERVICE_TYPES = ["backend", "frontend", "database", "cache", "queue", "storage", "ai", "other"]

# Constants
DEFAULT_PROJECT_LIMITS = {
    "max_services": 10,
    "max_storage_mb": 100,
    "max_requests_per_day": 1000,
    "max_deploy_frequency": 20  # deploys per day
}

class ProjectManager:
    """
    Manages project lifecycle with multi-level fallbacks:
    1. Database (primary)
    2. File system (secondary)
    3. In-memory (tertiary/last resort)
    """
    
    def __init__(self, data_dir=None):
        """Initialize the project manager with fallback mechanisms"""
        self.storage_mode = "database" if database_available else "file"
        
        # Set up data directory for file-based storage
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = Path(os.environ.get("PROJECT_DATA_DIR", "data"))
        
        # Ensure data directory exists
        try:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.projects_file = self.data_dir / "projects.json"
            self.services_file = self.data_dir / "services.json"
        except Exception as e:
            logger.warning(f"Could not create data directory: {e}")
            self.storage_mode = "memory"
            
        # Initialize in-memory storage as last resort
        self.memory_projects = {}
        self.memory_services = {}
        
        logger.info(f"Project manager initialized with {self.storage_mode} storage mode")
    
    async def create_project(self, project_data: dict, owner_id: str) -> Union[Project, dict]:
        """
        Create a new project with fallback mechanisms
        """
        # Generate project ID and timestamps
        now = datetime.datetime.now()
        project_id = str(uuid.uuid4())
        
        # Prepare project data
        full_project_data = {
            "id": project_id,
            "name": project_data.get("name", "Untitled Project"),
            "description": project_data.get("description", ""),
            "project_type": project_data.get("project_type", "web"),
            "owner_id": owner_id,
            "organization_id": project_data.get("organization_id"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "is_active": True,
            "config": project_data.get("config", {})
        }
        
        # Database storage (primary)
        if self.storage_mode == "database" and database_available:
            try:
                # Implementation for database storage would go here
                # This is a placeholder for actual database implementation
                logger.info(f"Creating project in database: {project_id}")
                # Since database implementation is not available, fall back to file
                self.storage_mode = "file"
            except Exception as e:
                logger.error(f"Database project creation failed: {e}")
                self.storage_mode = "file"
        
        # File storage (secondary)
        if self.storage_mode == "file":
            try:
                # Ensure projects file exists
                if not self.projects_file.exists():
                    with open(self.projects_file, "w") as f:
                        json.dump([], f)
                
                # Read existing projects
                with open(self.projects_file, "r") as f:
                    try:
                        projects = json.load(f)
                    except json.JSONDecodeError:
                        projects = []
                
                # Add new project
                projects.append(full_project_data)
                
                # Write updated projects
                with open(self.projects_file, "w") as f:
                    json.dump(projects, f, indent=2)
                
                logger.info(f"Created project in file storage: {project_id}")
                
                if pydantic_available:
                    return Project(**full_project_data)
                else:
                    return full_project_data
            except Exception as e:
                logger.error(f"File-based project creation failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        self.memory_projects[project_id] = full_project_data
        logger.info(f"Created project in memory: {project_id}")
        
        if pydantic_available:
            return Project(**full_project_data)
        else:
            return full_project_data
    
    async def get_project(self, project_id: str) -> Union[Project, dict, None]:
        """
        Get a project by ID with fallback mechanisms
        """
        # Database storage (primary)
        if self.storage_mode == "database" and database_available:
            try:
                # Implementation for database storage would go here
                # This is a placeholder for actual database implementation
                logger.info(f"Fetching project from database: {project_id}")
                # Since database implementation is not available, fall back to file
                self.storage_mode = "file"
            except Exception as e:
                logger.error(f"Database project fetch failed: {e}")
                self.storage_mode = "file"
        
        # File storage (secondary)
        if self.storage_mode == "file":
            try:
                # Check if projects file exists
                if not self.projects_file.exists():
                    logger.warning("Projects file does not exist")
                    self.storage_mode = "memory"
                else:
                    # Read projects
                    with open(self.projects_file, "r") as f:
                        try:
                            projects = json.load(f)
                            
                            # Find project by ID
                            for project in projects:
                                if project["id"] == project_id:
                                    logger.info(f"Found project in file storage: {project_id}")
                                    
                                    if pydantic_available:
                                        return Project(**project)
                                    else:
                                        return project
                            
                            logger.warning(f"Project not found in file storage: {project_id}")
                            return None
                        except json.JSONDecodeError:
                            logger.error("Invalid JSON in projects file")
                            self.storage_mode = "memory"
            except Exception as e:
                logger.error(f"File-based project fetch failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        project = self.memory_projects.get(project_id)
        if project:
            logger.info(f"Found project in memory: {project_id}")
            if pydantic_available:
                return Project(**project)
            else:
                return project
        
        logger.warning(f"Project not found: {project_id}")
        return None
    
    async def get_projects_for_user(self, user_id: str, organization_id: Optional[str] = None) -> List[Union[Project, dict]]:
        """
        Get all projects for a user with fallback mechanisms
        """
        result = []
        
        # Database storage (primary)
        if self.storage_mode == "database" and database_available:
            try:
                # Implementation for database storage would go here
                # This is a placeholder for actual database implementation
                logger.info(f"Fetching projects for user from database: {user_id}")
                # Since database implementation is not available, fall back to file
                self.storage_mode = "file"
            except Exception as e:
                logger.error(f"Database projects fetch failed: {e}")
                self.storage_mode = "file"
        
        # File storage (secondary)
        if self.storage_mode == "file":
            try:
                # Check if projects file exists
                if not self.projects_file.exists():
                    logger.warning("Projects file does not exist")
                    self.storage_mode = "memory"
                else:
                    # Read projects
                    with open(self.projects_file, "r") as f:
                        try:
                            projects = json.load(f)
                            
                            # Filter projects by user ID and organization ID
                            for project in projects:
                                if (project["owner_id"] == user_id or 
                                    (organization_id and project.get("organization_id") == organization_id)):
                                    if pydantic_available:
                                        result.append(Project(**project))
                                    else:
                                        result.append(project)
                            
                            logger.info(f"Found {len(result)} projects for user in file storage")
                            return result
                        except json.JSONDecodeError:
                            logger.error("Invalid JSON in projects file")
                            self.storage_mode = "memory"
            except Exception as e:
                logger.error(f"File-based projects fetch failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        for project_id, project in self.memory_projects.items():
            if (project["owner_id"] == user_id or 
                (organization_id and project.get("organization_id") == organization_id)):
                if pydantic_available:
                    result.append(Project(**project))
                else:
                    result.append(project)
        
        logger.info(f"Found {len(result)} projects for user in memory storage")
        return result
    
    async def update_project(self, project_id: str, project_data: dict, user_id: str) -> Union[Project, dict]:
        """
        Update a project with fallback mechanisms
        """
        # Check if user can access the project
        if not await self.can_access_project(project_id, user_id):
            raise ValueError(f"User {user_id} does not have access to project {project_id}")
        
        now = datetime.datetime.now()
        
        # Database storage (primary)
        if self.storage_mode == "database" and database_available:
            try:
                # Implementation for database storage would go here
                # This is a placeholder for actual database implementation
                logger.info(f"Updating project in database: {project_id}")
                # Since database implementation is not available, fall back to file
                self.storage_mode = "file"
            except Exception as e:
                logger.error(f"Database project update failed: {e}")
                self.storage_mode = "file"
        
        # File storage (secondary)
        if self.storage_mode == "file":
            try:
                # Check if projects file exists
                if not self.projects_file.exists():
                    logger.warning("Projects file does not exist")
                    self.storage_mode = "memory"
                else:
                    # Read projects
                    with open(self.projects_file, "r") as f:
                        try:
                            projects = json.load(f)
                        except json.JSONDecodeError:
                            logger.error("Invalid JSON in projects file")
                            self.storage_mode = "memory"
                            raise ValueError(f"Project with ID {project_id} not found")
                    
                    # Find and update the project
                    project_found = False
                    for i, project in enumerate(projects):
                        if project["id"] == project_id:
                            # Update fields
                            if "name" in project_data:
                                project["name"] = project_data["name"]
                            if "description" in project_data:
                                project["description"] = project_data["description"]
                            if "is_active" in project_data:
                                project["is_active"] = project_data["is_active"]
                            if "config" in project_data:
                                project["config"] = project_data["config"]
                            
                            project["updated_at"] = now.isoformat()
                            projects[i] = project
                            project_found = True
                            break
                    
                    if not project_found:
                        raise ValueError(f"Project with ID {project_id} not found")
                    
                    # Save updated projects
                    with open(self.projects_file, "w") as f:
                        json.dump(projects, f, indent=2)
                    
                    if pydantic_available:
                        return Project(**project)
                    else:
                        return project
            except Exception as e:
                logger.error(f"File-based project update failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        if project_id not in self.memory_projects:
            raise ValueError(f"Project with ID {project_id} not found")
        
        project = self.memory_projects[project_id]
        
        # Update fields
        if "name" in project_data:
            project["name"] = project_data["name"]
        if "description" in project_data:
            project["description"] = project_data["description"]
        if "is_active" in project_data:
            project["is_active"] = project_data["is_active"]
        if "config" in project_data:
            project["config"] = project_data["config"]
        
        project["updated_at"] = now.isoformat()
        self.memory_projects[project_id] = project
        
        if pydantic_available:
            return Project(**project)
        else:
            return project
    
    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """
        Delete a project with fallback mechanisms
        """
        # Check if user can access the project
        if not await self.can_access_project(project_id, user_id):
            raise ValueError(f"User {user_id} does not have access to project {project_id}")
        
        # Database storage (primary)
        if self.storage_mode == "database" and database_available:
            try:
                # Implementation for database storage would go here
                # This is a placeholder for actual database implementation
                logger.info(f"Deleting project from database: {project_id}")
                # Since database implementation is not available, fall back to file
                self.storage_mode = "file"
            except Exception as e:
                logger.error(f"Database project deletion failed: {e}")
                self.storage_mode = "file"
        
        # File storage (secondary)
        if self.storage_mode == "file":
            try:
                # Check if projects file exists
                if not self.projects_file.exists():
                    logger.warning("Projects file does not exist")
                    self.storage_mode = "memory"
                else:
                    # Read projects
                    with open(self.projects_file, "r") as f:
                        try:
                            projects = json.load(f)
                        except json.JSONDecodeError:
                            logger.error("Invalid JSON in projects file")
                            self.storage_mode = "memory"
                            return False
                    
                    # Find and remove the project
                    project_found = False
                    for i, project in enumerate(projects):
                        if project["id"] == project_id:
                            projects.pop(i)
                            project_found = True
                            break
                    
                    if not project_found:
                        return False
                    
                    # Save updated projects
                    with open(self.projects_file, "w") as f:
                        json.dump(projects, f, indent=2)
                    
                    return True
            except Exception as e:
                logger.error(f"File-based project deletion failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage (last resort)
        if project_id in self.memory_projects:
            del self.memory_projects[project_id]
            return True
        
        return False
    
    async def can_access_project(self, project_id: str, user_id: str, organization_id: Optional[str] = None) -> bool:
        """
        Check if a user can access a project
        """
        project = await self.get_project(project_id)
        if not project:
            return False
        
        # Get project owner ID and organization ID
        project_owner_id = project.owner_id if hasattr(project, 'owner_id') else project.get('owner_id')
        project_org_id = project.organization_id if hasattr(project, 'organization_id') else project.get('organization_id')
        
        # Check if user is the owner or in the same organization
        return (user_id == project_owner_id or 
                (organization_id and project_org_id and organization_id == project_org_id))

    async def generate_code(self, code_gen_request, user_id: str):
        """
        Generate code based on ERD, API design, and test data
        
        Args:
            code_gen_request: The code generation request (CodeGenerationRequest or dict)
            user_id: The ID of the user making the request
            
        Returns:
            A response containing the generated code (CodeGenerationResponse or dict)
        """
        # Extract project ID from request
        if hasattr(code_gen_request, 'project_id'):
            project_id = code_gen_request.project_id
        else:
            project_id = code_gen_request.get('project_id')
            
        if not project_id:
            error_msg = "Project ID is required for code generation"
            logger.error(error_msg)
            return self._create_error_response(error_msg)
            
        # Check if user has access to the project
        if not await self.can_access_project(project_id, user_id):
            error_msg = f"User {user_id} does not have access to project {project_id}"
            logger.warning(error_msg)
            return self._create_error_response(error_msg)
            
        try:
            # Import code generator module
            try:
                from .code_generator import generate_code_for_project
            except ImportError:
                # Fallback for direct imports
                try:
                    from project_management.code_generator import generate_code_for_project
                except ImportError:
                    error_msg = "Code generator module not available"
                    logger.error(error_msg)
                    return self._create_error_response(error_msg)
            
            # Generate code using the code generator module
            return await generate_code_for_project(code_gen_request)
            
        except Exception as e:
            error_msg = f"Error generating code: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return self._create_error_response(error_msg, project_id)
            
    def _create_error_response(self, error_message: str, project_id: str = ""):
        """
        Create an error response for code generation
        
        Args:
            error_message: The error message to include in the response
            project_id: The project ID (optional)
            
        Returns:
            A CodeGenerationResponse or dict with error details
        """
        try:
            # Sanitize error message to prevent JSON serialization issues
            sanitized_message = str(error_message).replace('"', '').replace("'", "").strip()
            if not sanitized_message:
                sanitized_message = "Unknown error during code generation"
                
            logger.error(f"Creating error response for project {project_id}: {sanitized_message}")
            
            # Try to import models
            try:
                from .models import CodeGenerationResponse, pydantic_available
            except ImportError:
                # Fallback for direct imports
                try:
                    from project_management.models import CodeGenerationResponse, pydantic_available
                except ImportError:
                    logger.error("Failed to import project management models")
                    pydantic_available = False
            
            # Create a minimal error file
            error_file = {"error.txt": f"Error: {sanitized_message}"}
            
            # Ensure all required fields are present
            result = {
                "project_id": project_id,
                "generated_code": error_file,
                "code": error_file,  # Add code field for compatibility
                "message": sanitized_message,
                "success": False,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            if pydantic_available:
                try:
                    return CodeGenerationResponse(**result)
                except Exception as e:
                    logger.error(f"Error creating CodeGenerationResponse: {str(e)}")
                    return result
            else:
                return result
                
        except Exception as e:
            logger.error(f"Error creating error response: {str(e)}")
            # Last resort fallback with minimal fields
            return {
                "project_id": project_id,
                "generated_code": {"error.txt": "Error during code generation"},
                "code": {"error.txt": "Error during code generation"},
                "success": False,
                "message": "Error during code generation"
            }

    async def download_code(self, download_request: CodeDownloadRequest, user_id: str) -> CodeDownloadResponse:
        """
        Create a ZIP file from generated code
        
        Args:
            download_request: The code download request containing code files
            user_id: The ID of the user making the request
            
        Returns:
            CodeDownloadResponse with the ZIP file as bytes
        """
        try:
            # Validate project access
            if not await self.can_access_project(
                project_id=download_request.project_id,
                user_id=user_id
            ):
                return CodeDownloadResponse(
                    project_id=download_request.project_id,
                    zip_file=b'',
                    message="Not authorized to access this project",
                    success=False
                )
            
            # Create an in-memory ZIP file
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add each code file to the ZIP
                for filename, content in download_request.code.items():
                    # Ensure directories exist in the ZIP
                    if '/' in filename:
                        # Create directory structure
                        directory = os.path.dirname(filename)
                        try:
                            # Add directory entries (with trailing slash)
                            for path_part in self._get_directory_paths(directory):
                                if path_part + '/' not in zip_file.namelist():
                                    zip_file.writestr(path_part + '/', '')
                        except Exception as e:
                            logger.warning(f"Error creating directory structure in ZIP: {str(e)}")
                    
                    # Add the file to the ZIP
                    zip_file.writestr(filename, content)
                
                # Add a README file with metadata
                readme_content = f"""# Generated Code for Project: {download_request.project_id}
Technology Stack: {download_request.techStack}
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Files
{self._format_file_list(download_request.code.keys())}
"""
                zip_file.writestr('README.md', readme_content)
            
            # Get the ZIP file bytes
            zip_buffer.seek(0)
            zip_bytes = zip_buffer.getvalue()
            
            return CodeDownloadResponse(
                project_id=download_request.project_id,
                zip_file=zip_bytes,
                message="Code downloaded successfully",
                success=True
            )
        except Exception as e:
            logger.error(f"Error creating ZIP file for project {download_request.project_id}: {str(e)}", exc_info=True)
            return CodeDownloadResponse(
                project_id=download_request.project_id,
                zip_file=b'',
                message=f"Failed to create ZIP file: {str(e)}",
                success=False
            )
    
    def _get_directory_paths(self, directory):
        """
        Get all directory paths for a nested directory structure
        
        Args:
            directory: The directory path (e.g., 'src/components')
            
        Returns:
            List of directory paths (e.g., ['src', 'src/components'])
        """
        parts = directory.split('/')
        paths = []
        current = ""
        
        for part in parts:
            if current:
                current = f"{current}/{part}"
            else:
                current = part
            paths.append(current)
            
        return paths
    
    def _format_file_list(self, filenames):
        """
        Format a list of filenames for the README
        
        Args:
            filenames: List of filenames
            
        Returns:
            Formatted markdown list of files
        """
        return '\n'.join([f"- `{filename}`" for filename in sorted(filenames)])

# Create singleton instance
project_manager = ProjectManager()
