"""
AILang Adapter Version

This file contains version information for the AILang adapter.
"""

__version__ = "0.1.0"
__ailang_compatibility__ = "0.1.0"  # AILang version this adapter is compatible with

# Version history
VERSION_HISTORY = [
    {
        "version": "0.1.0",
        "date": "2025-08-05",
        "changes": [
            "Initial implementation of AILang adapter",
            "Support for agent, consensus, and task definitions",
            "Environment variable resolution",
            "Task template validation",
            "Integration with agent orchestrator"
        ]
    }
]

def get_version_info():
    """
    Get version information as a dictionary
    
    Returns:
        Dict with version information
    """
    return {
        "version": __version__,
        "ailang_compatibility": __ailang_compatibility__,
        "history": VERSION_HISTORY
    }
