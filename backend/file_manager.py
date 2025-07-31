# /project-root/backend/file_manager.py

import os
import json
import shutil
import logging
import traceback
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

# Try to import our custom logger, fall back to standard logging
try:
    from logger import default_logger as logger
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger('file_manager')

PROJECT_DIR = os.getcwd()
FILES_DIR = os.path.join(PROJECT_DIR, 'projects')
BACKUP_DIR = os.path.join(PROJECT_DIR, 'backups')
TEMP_DIR = os.path.join(PROJECT_DIR, 'tmp')

# Create necessary directories if they don't exist
os.makedirs(FILES_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

class FileManager:
    """File Manager class with robust fallback mechanisms for file operations"""
    
    def __init__(self):
        self.project_dir = PROJECT_DIR
        self.files_dir = FILES_DIR
        self.backup_dir = BACKUP_DIR
        self.temp_dir = TEMP_DIR
        self.failed_operations = 0
        self.open_projects = {}
        
        # Create fallback directories
        for directory in [self.files_dir, self.backup_dir, self.temp_dir]:
            try:
                os.makedirs(directory, exist_ok=True)
            except Exception as e:
                logger.error(f"Error creating directory {directory}: {e}")
    
    def save_file(self, filename: str, content: str) -> Tuple[bool, str]:
        """Save a file with multiple fallback mechanisms"""
        try:
            path = save_file(filename, content)
            return True, path
        except Exception as e:
            logger.error(f"Primary save mechanism failed: {e}")
            self.failed_operations += 1
            
            # First fallback: Try saving to temp directory
            try:
                if '..' in filename or filename.startswith('/'):
                    raise ValueError("Invalid filename in fallback save")
                
                fallback_path = os.path.join(self.temp_dir, filename)
                os.makedirs(os.path.dirname(os.path.abspath(fallback_path)), exist_ok=True)
                
                with open(fallback_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                logger.info(f"Used fallback save mechanism: {fallback_path}")
                return True, fallback_path
            except Exception as e2:
                logger.error(f"Fallback save mechanism failed: {e2}")
                
                # Ultimate fallback: Save to memory and log
                try:
                    safe_filename = filename.replace('/', '_').replace('\\', '_')
                    memory_path = f"<memory>/{safe_filename}"
                    logger.warning(f"Emergency fallback: Content for {filename} held in memory")
                    # In a real system, this could be saved to a cache or database
                    return False, memory_path
                except:
                    logger.critical(f"All save mechanisms failed for {filename}")
                    return False, ""
    
    def load_files(self) -> List[str]:
        """Get a list of files with fallback mechanisms"""
        try:
            return load_files()
        except Exception as e:
            logger.error(f"Error loading files list: {e}")
            self.failed_operations += 1
            
            # Fallback: manual directory scan
            try:
                files = []
                for root, _, filenames in os.walk(self.files_dir):
                    for filename in filenames:
                        path = os.path.join(root, filename)
                        rel_path = os.path.relpath(path, self.files_dir)
                        files.append(rel_path)
                return files
            except Exception as e2:
                logger.error(f"Fallback file list mechanism failed: {e2}")
                return []
    
    def load_file(self, filename: str) -> Tuple[bool, str]:
        """Load a file with fallback mechanisms"""
        try:
            content = load_file(filename)
            return True, content
        except Exception as e:
            logger.error(f"Error loading file {filename}: {e}")
            self.failed_operations += 1
            
            # First fallback: Try loading from backup
            try:
                backup_path = os.path.join(self.backup_dir, 
                                         f"{filename}.{datetime.now().strftime('%Y%m%d')}.bak")
                if os.path.exists(backup_path):
                    with open(backup_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    logger.info(f"Loaded from backup: {backup_path}")
                    return True, content
            except Exception as e2:
                logger.error(f"Backup load failed for {filename}: {e2}")
            
            # Second fallback: Try loading from temp directory
            try:
                temp_path = os.path.join(self.temp_dir, filename)
                if os.path.exists(temp_path):
                    with open(temp_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    logger.info(f"Loaded from temp directory: {temp_path}")
                    return True, content
            except Exception as e3:
                logger.error(f"Temp directory load failed for {filename}: {e3}")
            
            return False, f"Failed to load {filename} from any location"
    
    def delete_file(self, filename: str) -> bool:
        """Delete a file with automatic backup"""
        try:
            return delete_file(filename)
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {e}")
            self.failed_operations += 1
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get status information about the file manager"""
        return {
            "healthy": self.failed_operations < 5,
            "failed_operations": self.failed_operations,
            "files_dir_accessible": os.access(self.files_dir, os.R_OK | os.W_OK),
            "backup_dir_accessible": os.access(self.backup_dir, os.R_OK | os.W_OK),
            "temp_dir_accessible": os.access(self.temp_dir, os.R_OK | os.W_OK)
        }

    def open_folder(self, folder_path: str) -> Dict[str, Any]:
        """
        Open a folder as the root project folder and scan all its contents
        
        Args:
            folder_path: The absolute path to the folder to open
            
        Returns:
            Dict with project info and file structure
        """
        try:
            # Validate folder exists
            if not os.path.isdir(folder_path):
                raise ValueError(f"Folder does not exist: {folder_path}")
                
            # Generate a project ID based on path hash
            import hashlib
            project_id = hashlib.md5(folder_path.encode()).hexdigest()[:12]
            
            # Store project info
            self.open_projects[project_id] = {
                "path": folder_path,
                "name": os.path.basename(folder_path),
                "opened_at": datetime.now().isoformat(),
                "files": []
            }
            
            # Scan all files in the folder recursively
            file_list = []
            try:
                for root, dirs, files in os.walk(folder_path):
                    # Skip hidden folders (starting with .)
                    dirs[:] = [d for d in dirs if not d.startswith('.')]
                    
                    for file in files:
                        # Skip hidden files
                        if file.startswith('.'):
                            continue
                            
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, folder_path)
                        
                        # Convert backslashes to forward slashes for consistent path handling
                        rel_path = rel_path.replace('\\', '/')
                        
                        # Get file stats
                        try:
                            stats = os.stat(file_path)
                            file_list.append({
                                "path": rel_path,
                                "name": file,
                                "size": stats.st_size,
                                "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                                "ext": os.path.splitext(file)[1][1:].lower() if '.' in file else "",
                            })
                        except Exception as e:
                            logger.warning(f"Error getting stats for {file_path}: {e}")
                            # Add with minimal info if we can't get stats
                            file_list.append({
                                "path": rel_path,
                                "name": file,
                                "size": 0,
                                "ext": os.path.splitext(file)[1][1:].lower() if '.' in file else "",
                            })
            except Exception as e:
                logger.error(f"Error scanning folder {folder_path}: {e}")
                return {
                    "success": False,
                    "error": f"Error scanning folder: {str(e)}",
                    "project_id": project_id
                }
                
            # Update project info with file list
            self.open_projects[project_id]["files"] = file_list
            
            return {
                "success": True,
                "project_id": project_id,
                "name": os.path.basename(folder_path),
                "path": folder_path,
                "files": file_list
            }
        except Exception as e:
            logger.error(f"Error opening folder {folder_path}: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": f"Error opening folder: {str(e)}"
            }
    
    def get_project_files(self, project_id: str) -> Dict[str, Any]:
        """
        Get the file list for a previously opened project
        
        Args:
            project_id: The ID of the project to get files for
            
        Returns:
            Dict with project info and file structure
        """
        if project_id not in self.open_projects:
            return {
                "success": False,
                "error": f"Project not found: {project_id}"
            }
            
        return {
            "success": True,
            "project_id": project_id,
            "name": self.open_projects[project_id]["name"],
            "path": self.open_projects[project_id]["path"],
            "files": self.open_projects[project_id]["files"]
        }
        
    def read_project_file(self, project_id: str, file_path: str) -> Dict[str, Any]:
        """
        Read a file from an opened project
        
        Args:
            project_id: The ID of the project
            file_path: The relative path to the file within the project
            
        Returns:
            Dict with file content and metadata
        """
        if project_id not in self.open_projects:
            return {
                "success": False,
                "error": f"Project not found: {project_id}"
            }
            
        try:
            # Get absolute path
            project_root = self.open_projects[project_id]["path"]
            absolute_path = os.path.join(project_root, file_path.replace('/', os.sep))
            
            # Validate file exists and is within project
            if not os.path.isfile(absolute_path) or not os.path.abspath(absolute_path).startswith(os.path.abspath(project_root)):
                return {
                    "success": False,
                    "error": f"File not found or access denied: {file_path}"
                }
            
            # Read file content
            with open(absolute_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                
            # Get file stats
            stats = os.stat(absolute_path)
                
            return {
                "success": True,
                "content": content,
                "path": file_path,
                "name": os.path.basename(file_path),
                "size": stats.st_size,
                "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                "project_id": project_id
            }
        except Exception as e:
            logger.error(f"Error reading project file {file_path}: {e}")
            return {
                "success": False,
                "error": f"Error reading file: {str(e)}"
            }
            
    def write_project_file(self, project_id: str, file_path: str, content: str) -> Dict[str, Any]:
        """
        Write content to a file in an opened project
        
        Args:
            project_id: The ID of the project
            file_path: The relative path to the file within the project
            content: The content to write
            
        Returns:
            Dict with success status and file info
        """
        if project_id not in self.open_projects:
            return {
                "success": False,
                "error": f"Project not found: {project_id}"
            }
            
        try:
            # Get absolute path
            project_root = self.open_projects[project_id]["path"]
            absolute_path = os.path.join(project_root, file_path.replace('/', os.sep))
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
            
            # Validate path is within project
            if not os.path.abspath(absolute_path).startswith(os.path.abspath(project_root)):
                return {
                    "success": False,
                    "error": f"Access denied: Cannot write outside project directory"
                }
            
            # Write file content
            with open(absolute_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            # Get file stats
            stats = os.stat(absolute_path)
            
            # Update file list if this is a new file
            file_info = {
                "path": file_path,
                "name": os.path.basename(file_path),
                "size": stats.st_size,
                "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                "ext": os.path.splitext(file_path)[1][1:].lower() if '.' in file_path else "",
            }
            
            # Check if file exists in the list and update it, or add if new
            file_exists = False
            for i, f in enumerate(self.open_projects[project_id]["files"]):
                if f["path"] == file_path:
                    self.open_projects[project_id]["files"][i] = file_info
                    file_exists = True
                    break
                    
            if not file_exists:
                self.open_projects[project_id]["files"].append(file_info)
                
            return {
                "success": True,
                "file": file_info,
                "project_id": project_id
            }
        except Exception as e:
            logger.error(f"Error writing project file {file_path}: {e}")
            return {
                "success": False,
                "error": f"Error writing file: {str(e)}"
            }

# Create singleton instance
file_manager = FileManager()

def save_file(filename: str, content: str) -> str:
    """
    Save a file with content and create automatic backup
    
    Args:
        filename: The name of the file
        content: The content to write to the file
    
    Returns:
        str: Path to the saved file
    """
    # Ensure no directory traversal attacks
    if '..' in filename or filename.startswith('/'):
        raise ValueError("Invalid filename. Must be relative to project directory.")
    
    path = os.path.join(FILES_DIR, filename)
    
    # Create parent directories if they don't exist
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    
    # Create a backup if file exists
    if os.path.exists(path):
        _create_backup(filename)
    
    # Write the new content
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return path

def load_files() -> List[str]:
    """
    Get a list of all files in the projects directory
    
    Returns:
        List[str]: List of filenames
    """
    try:
        result = []
        for root, _, files in os.walk(FILES_DIR):
            for file in files:
                # Get path relative to FILES_DIR
                rel_path = os.path.relpath(os.path.join(root, file), FILES_DIR)
                result.append(rel_path)
        return result
    except Exception as e:
        print(f"Error listing files: {e}")
        # Fallback to empty list
        return []

def load_file(filename: str) -> str:
    """
    Load a file's content
    
    Args:
        filename: The name of the file to load
        
    Returns:
        str: Content of the file
        
    Raises:
        FileNotFoundError: If the file doesn't exist
    """
    # Ensure no directory traversal attacks
    if '..' in filename or filename.startswith('/'):
        raise ValueError("Invalid filename. Must be relative to project directory.")
    
    path = os.path.join(FILES_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {filename}")
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        # Fallback for binary files
        return "[Binary file content not displayed]"

def _create_backup(filename: str) -> str:
    """
    Create a backup of the specified file
    
    Args:
        filename: The name of the file to backup
        
    Returns:
        str: Path to the backup file
    """
    source_path = os.path.join(FILES_DIR, filename)
    if not os.path.exists(source_path):
        return None
    
    # Create timestamp for the backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{filename}.{timestamp}.bak"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    # Create parent directories in backup location if needed
    os.makedirs(os.path.dirname(os.path.abspath(backup_path)), exist_ok=True)
    
    # Copy the file
    shutil.copy2(source_path, backup_path)
    return backup_path

def delete_file(filename: str) -> bool:
    """
    Delete a file with backup
    
    Args:
        filename: The name of the file to delete
        
    Returns:
        bool: True if deleted successfully
    """
    # Ensure no directory traversal attacks
    if '..' in filename or filename.startswith('/'):
        raise ValueError("Invalid filename. Must be relative to project directory.")
    
    path = os.path.join(FILES_DIR, filename)
    if not os.path.exists(path):
        return False
    
    # Create backup before deletion
    _create_backup(filename)
    
    # Delete the file
    os.remove(path)
    return True
