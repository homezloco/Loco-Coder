"""
Routers package for the Coder AI Platform backend.

This package contains all API route definitions organized by feature.
"""

# Import routers here to make them available when importing the package
from . import projects
from . import auth

# Re-export for easier imports
__all__ = ["projects", "auth"]
__all__ = ['projects']
