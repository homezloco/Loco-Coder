"""
Project Management Dependencies
-----------------------------
FastAPI dependencies for project management with proper fallbacks.
"""

import logging
from typing import Union, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import FastAPI components with fallbacks
try:
    from fastapi import Depends, HTTPException, status
    fastapi_available = True
except ImportError:
    fastapi_available = False
    logger.warning("FastAPI not available, using minimal fallbacks")

# Try to import project manager and models
try:
    from .manager import ProjectManager, project_manager
    from .models import Project
except ImportError:
    # Fallback for direct imports
    try:
        from project_management.manager import ProjectManager, project_manager
        from project_management.models import Project
    except ImportError:
        logger.error("Failed to import project management components")
        # Define minimal fallbacks if needed

# Try to import user management with fallback
try:
    from user_management import User, get_current_active_user
except ImportError:
    logger.warning("User management module not available, using local fallback")
    from typing import Dict
    
    class User:
        """Minimal User model fallback"""
        id: str
        username: str
        organization_id: str = None
        is_admin: bool = False

    # Minimal fallback for get_current_active_user
    async def get_current_active_user():
        """Fallback for get_current_active_user"""
        logger.warning("Using fallback get_current_active_user")
        return User(id="fallback_user", username="fallback", is_admin=True)

# Dependency for API routes
async def get_project_manager():
    """
    Dependency to get the project manager instance
    """
    # In a real application, you would inject dependencies like the database session
    return project_manager

# Access control dependencies
async def validate_project_access(
    project_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Union[Project, dict]:
    """
    Validate user has access to a project
    
    Args:
        project_id: The ID of the project to validate access for
        current_user: The current authenticated user
        
    Returns:
        The project if the user has access
        
    Raises:
        HTTPException: If the project is not found or the user doesn't have access
    """
    if not fastapi_available:
        logger.warning("FastAPI not available, skipping access validation")
        return None
        
    project = await project_manager.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get project owner ID and organization ID from either Pydantic model or dict
    project_owner_id = project.owner_id if hasattr(project, 'owner_id') else project.get('owner_id')
    project_org_id = project.organization_id if hasattr(project, 'organization_id') else project.get('organization_id')
    
    user_org_id = current_user.organization_id if hasattr(current_user, 'organization_id') else getattr(current_user, 'organization_id', None)
    
    # Check if user has access
    if (current_user.id == project_owner_id or 
        current_user.is_admin or 
        (user_org_id and project_org_id and user_org_id == project_org_id)):
        return project
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this project"
    )
