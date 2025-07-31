"""
Project Management API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import logging
from datetime import datetime

# Import project management components
from project_management import ProjectManager, ProjectCreate, Project, ProjectUpdate
from user_management import get_current_active_user, User

# Initialize logger
logger = logging.getLogger(__name__)

# Create router without prefix since it's added in main.py
router = APIRouter(tags=["projects"])

# Initialize project manager
project_manager = ProjectManager()

@router.get("", response_model=List[Project])
@router.get("/", response_model=List[Project])  # Support both with and without trailing slash
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
):
    """
    List all projects for the current user
    """
    try:
        logger.info(f"Listing projects for user {current_user.id} with org {getattr(current_user, 'organization_id', 'None')}")
        
        # Get projects for the current user
        projects = await project_manager.get_projects_for_user(
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if hasattr(current_user, 'organization_id') and current_user.organization_id else None
        )
        
        logger.info(f"Found {len(projects)} projects")
        
        # If no projects found, create a default one for testing
        if not projects and skip == 0 and limit > 0:
            logger.info("No projects found, creating a default project")
            try:
                default_project = await project_manager.create_project(
                    project_data={
                        "name": "My First Project",
                        "description": "A sample project to get you started",
                        "project_type": "web"
                    },
                    owner_id=str(current_user.id)
                )
                projects = [default_project]
            except Exception as e:
                logger.error(f"Error creating default project: {str(e)}")
        
        # Apply pagination
        result = projects[skip:skip + limit]
        logger.info(f"Returning {len(result)} projects after pagination")
        return result
        
    except Exception as e:
        logger.error(f"Error listing projects: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )

@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new project
    """
    try:
        # Add owner and organization info
        project_data = project.dict()
        project_data["owner_id"] = str(current_user.id)
        if current_user.organization_id:
            project_data["organization_id"] = str(current_user.organization_id)
            
        # Create the project
        new_project = project_manager.create_project(
            project_data=project_data,
            owner_id=str(current_user.id)
        )
        return new_project
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )

@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific project by ID
    """
    try:
        # Get the project by ID
        project = await project_manager.get_project(project_id=project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
            
        # Check if user has access to the project
        if not await project_manager.can_access_project(
            project_id=project_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this project"
            )
            
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch project"
        )

@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a project
    """
    try:
        # Check if user has access to the project
        if not project_manager.can_access_project(
            project_id=project_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this project"
            )
            
        # Update the project
        updated_project = project_manager.update_project(
            project_id=project_id,
            project_data=project_update.dict(exclude_unset=True),
            user_id=str(current_user.id)
        )
        return updated_project
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a project
    """
    try:
        # Check if user has access to the project
        if not project_manager.can_access_project(
            project_id=project_id,
            user_id=str(current_user.id),
            organization_id=str(current_user.organization_id) if current_user.organization_id else None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this project"
            )
            
        # Delete the project
        success = project_manager.delete_project(
            project_id=project_id,
            user_id=str(current_user.id)
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project"
        )
