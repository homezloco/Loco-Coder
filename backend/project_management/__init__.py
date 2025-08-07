"""
Project Management Package
------------------------
Modularized project management functionality with proper fallbacks.
"""

import logging
import importlib
from typing import List, Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models directly since they don't have circular dependencies
from .models import (
    Project, ProjectCreate, ProjectUpdate, Service,
    CodeGenerationRequest, CodeGenerationResponse,
    CodeDownloadRequest, CodeDownloadResponse
)

# Import manager directly since it doesn't have circular dependencies
from .manager import ProjectManager, project_manager

# Export all components
__all__ = [
    'Project', 'ProjectCreate', 'ProjectUpdate', 'Service',
    'CodeGenerationRequest', 'CodeGenerationResponse',
    'CodeDownloadRequest', 'CodeDownloadResponse',
    'ProjectManager', 'project_manager'
]
