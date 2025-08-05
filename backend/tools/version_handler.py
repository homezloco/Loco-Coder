"""
AILang Version Handler

This module provides utilities for retrieving and comparing version information
for the AILang adapter and AILang language.
"""

import json
import logging
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

# Default paths
DEFAULT_VERSION_PATH = os.environ.get(
    "AILANG_VERSION_PATH", 
    str(Path(__file__).parent.parent / "ailang_adapter" / "version.json")
)

# GitHub API URLs
GITHUB_API_URL = "https://api.github.com"
AILANG_REPO = "ailang-org/ailang"  # Replace with actual repo if different


class VersionHandler:
    """Handler for AILang version information and comparisons."""
    
    def __init__(self, version_path: str = DEFAULT_VERSION_PATH):
        """
        Initialize the version handler.
        
        Args:
            version_path: Path to the version.json file
        """
        self.version_path = Path(version_path)
        self._version_data = None
        self._github_token = os.environ.get("GITHUB_TOKEN")
    
    def get_version_data(self, refresh: bool = False) -> Dict[str, Any]:
        """
        Get version information from the version file.
        
        Args:
            refresh: Whether to refresh the cached data
            
        Returns:
            Dictionary containing version information
        """
        if self._version_data is None or refresh:
            try:
                if self.version_path.exists():
                    with open(self.version_path, "r") as f:
                        self._version_data = json.load(f)
                else:
                    logger.warning(f"Version file not found at {self.version_path}")
                    self._version_data = {
                        "version": "unknown",
                        "ailang_version": "unknown",
                        "last_update": "unknown",
                        "update_status": "unknown",
                    }
            except Exception as e:
                logger.error(f"Failed to read version file: {str(e)}")
                self._version_data = {
                    "version": "error",
                    "ailang_version": "error",
                    "last_update": "error",
                    "update_status": "error",
                }
        
        return self._version_data
    
    def get_latest_ailang_version(self) -> Optional[str]:
        """
        Get the latest AILang version from GitHub.
        
        Returns:
            Latest version string or None if unavailable
        """
        try:
            headers = {}
            if self._github_token:
                headers["Authorization"] = f"token {self._github_token}"
            
            response = requests.get(
                f"{GITHUB_API_URL}/repos/{AILANG_REPO}/releases/latest",
                headers=headers,
                timeout=10,
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("tag_name", "").lstrip("v")
            else:
                logger.warning(
                    f"Failed to get latest AILang version: HTTP {response.status_code}"
                )
                return None
        
        except Exception as e:
            logger.error(f"Error fetching latest AILang version: {str(e)}")
            return None
    
    def get_version_status(self) -> Dict[str, Any]:
        """
        Get comprehensive version status information.
        
        Returns:
            Dictionary with version status information
        """
        current_data = self.get_version_data()
        latest_ailang = self.get_latest_ailang_version()
        
        result = {
            "adapter_version": current_data.get("version", "unknown"),
            "adapter_last_update": current_data.get("last_update", "unknown"),
            "ailang_current_version": current_data.get("ailang_version", "unknown"),
            "ailang_latest_version": latest_ailang or "unknown",
            "update_available": False,
            "update_status": current_data.get("update_status", "unknown"),
        }
        
        # Check if update is available
        if (latest_ailang and 
            result["ailang_current_version"] != "unknown" and 
            result["ailang_current_version"] != latest_ailang):
            result["update_available"] = True
        
        # Calculate days since last update
        try:
            if result["adapter_last_update"] != "unknown":
                last_update = datetime.fromisoformat(result["adapter_last_update"].replace("Z", "+00:00"))
                days_since = (datetime.now().astimezone() - last_update).days
                result["days_since_update"] = days_since
        except Exception as e:
            logger.warning(f"Failed to calculate days since update: {str(e)}")
            result["days_since_update"] = "unknown"
        
        return result
    
    def compare_versions(self, version1: str, version2: str) -> int:
        """
        Compare two semantic version strings.
        
        Args:
            version1: First version string
            version2: Second version string
            
        Returns:
            -1 if version1 < version2, 0 if equal, 1 if version1 > version2
        """
        if version1 == "unknown" or version2 == "unknown":
            return 0
        
        # Remove 'v' prefix if present
        v1 = version1.lstrip("v")
        v2 = version2.lstrip("v")
        
        # Split into components
        v1_parts = [int(x) for x in re.findall(r'\d+', v1)]
        v2_parts = [int(x) for x in re.findall(r'\d+', v2)]
        
        # Pad with zeros if needed
        while len(v1_parts) < 3:
            v1_parts.append(0)
        while len(v2_parts) < 3:
            v2_parts.append(0)
        
        # Compare components
        for i in range(max(len(v1_parts), len(v2_parts))):
            v1_part = v1_parts[i] if i < len(v1_parts) else 0
            v2_part = v2_parts[i] if i < len(v2_parts) else 0
            
            if v1_part < v2_part:
                return -1
            elif v1_part > v2_part:
                return 1
        
        return 0
    
    def update_version_file(self, data: Dict[str, Any]) -> bool:
        """
        Update the version file with new data.
        
        Args:
            data: New version data to write
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure directory exists
            self.version_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Merge with existing data if available
            current_data = {}
            if self.version_path.exists():
                with open(self.version_path, "r") as f:
                    current_data = json.load(f)
            
            # Update with new data
            current_data.update(data)
            
            # Add timestamp if not provided
            if "last_update" not in data:
                current_data["last_update"] = datetime.now().isoformat()
            
            # Write to file
            with open(self.version_path, "w") as f:
                json.dump(current_data, f, indent=2)
            
            # Update cached data
            self._version_data = current_data
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to update version file: {str(e)}")
            return False


# Singleton instance for use across the application
version_handler = VersionHandler()


def get_version_info() -> Dict[str, Any]:
    """
    Get version information for API responses.
    
    Returns:
        Dictionary with version information
    """
    return version_handler.get_version_status()


def check_for_updates() -> Tuple[bool, Dict[str, Any]]:
    """
    Check if updates are available for AILang.
    
    Returns:
        Tuple of (update_available, version_info)
    """
    version_info = version_handler.get_version_status()
    return version_info.get("update_available", False), version_info
