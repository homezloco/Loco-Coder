import os
import unittest
from unittest.mock import patch, mock_open, MagicMock
import sys
import json
import shutil
import tempfile
from pathlib import Path

# Add parent directory to path to import file_manager
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from file_manager import FileManager

class TestFileManager(unittest.TestCase):
    """Test the FileManager class with focus on fallback mechanisms"""
    
    def setUp(self):
        """Set up test environment with temporary directories"""
        # Create temporary directories for testing
        self.test_dir = tempfile.mkdtemp()
        self.backup_dir = tempfile.mkdtemp()
        
        # Create file manager instance with test directories
        self.file_manager = FileManager(
            project_dir=self.test_dir,
            backup_dir=self.backup_dir
        )
        
        # Create a test file
        self.test_file_path = os.path.join(self.test_dir, "test_file.py")
        with open(self.test_file_path, "w") as f:
            f.write("# Test file content\nprint('Hello, world!')")
    
    def tearDown(self):
        """Clean up temporary test directories"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
        shutil.rmtree(self.backup_dir, ignore_errors=True)
    
    def test_save_file_with_backup(self):
        """Test saving a file with automatic backup creation"""
        # Content to save
        new_content = "# Modified test content\nprint('Modified hello!')"
        
        # Save the file with new content
        result = self.file_manager.save_file("test_file.py", new_content)
        
        # Verify results
        self.assertTrue(result["success"])
        self.assertEqual(result["message"], "File saved successfully")
        
        # Verify file was updated
        with open(self.test_file_path, "r") as f:
            saved_content = f.read()
        self.assertEqual(saved_content, new_content)
        
        # Verify backup was created
        backup_files = os.listdir(self.backup_dir)
        self.assertGreaterEqual(len(backup_files), 1)
    
    def test_load_file_success(self):
        """Test loading a file successfully"""
        # Load the test file
        result = self.file_manager.load_file("test_file.py")
        
        # Verify results
        self.assertTrue(result["success"])
        self.assertEqual(result["content"], "# Test file content\nprint('Hello, world!')")
    
    def test_load_file_not_found_fallback(self):
        """Test loading a non-existent file with fallback"""
        # Try to load a non-existent file
        result = self.file_manager.load_file("non_existent.py")
        
        # Verify fallback behavior
        self.assertFalse(result["success"])
        self.assertIn("File not found", result["message"])
        self.assertEqual(result["content"], "")  # Empty content fallback
    
    def test_list_files(self):
        """Test listing files in project directory"""
        # Create additional test files
        with open(os.path.join(self.test_dir, "test_file2.py"), "w") as f:
            f.write("# Another test file")
        with open(os.path.join(self.test_dir, "test_file.js"), "w") as f:
            f.write("// JavaScript test file")
        
        # List files
        result = self.file_manager.list_files()
        
        # Verify results
        self.assertTrue(result["success"])
        files = result["files"]
        self.assertEqual(len(files), 3)
        
        # Verify file information
        file_names = [f["name"] for f in files]
        self.assertIn("test_file.py", file_names)
        self.assertIn("test_file2.py", file_names)
        self.assertIn("test_file.js", file_names)
        
        # Verify extension grouping
        extensions = result["extensions"]
        self.assertIn("py", extensions)
        self.assertIn("js", extensions)
    
    def test_create_backup(self):
        """Test explicit backup creation"""
        # Create a backup
        backup_path = self.file_manager.create_backup("test_file.py")
        
        # Verify backup was created
        self.assertTrue(os.path.exists(backup_path))
        
        # Verify backup content matches original
        with open(backup_path, "r") as backup_file:
            backup_content = backup_file.read()
        with open(self.test_file_path, "r") as original_file:
            original_content = original_file.read()
        
        self.assertEqual(backup_content, original_content)
    
    def test_directory_traversal_protection(self):
        """Test protection against directory traversal attacks"""
        # Try to access file outside project directory
        result = self.file_manager.load_file("../outside_project.py")
        
        # Verify protection
        self.assertFalse(result["success"])
        self.assertIn("Invalid file path", result["message"])
    
    def test_save_file_with_io_error_fallback(self):
        """Test fallback when saving file encounters IO error"""
        # Mock the open function to raise an IO error
        with patch("builtins.open", side_effect=IOError("Simulated IO error")):
            # Try to save a file
            result = self.file_manager.save_file("test_file.py", "New content")
            
            # Verify fallback behavior
            self.assertFalse(result["success"])
            self.assertIn("Failed to save file", result["message"])
    
    def test_backup_recovery(self):
        """Test recovery from backup when save fails"""
        original_content = "# Original content"
        
        # Setup a file with original content
        test_recovery_path = os.path.join(self.test_dir, "recovery_test.py")
        with open(test_recovery_path, "w") as f:
            f.write(original_content)
        
        # Create a backup
        self.file_manager.create_backup("recovery_test.py")
        
        # Mock a failed save attempt after backup creation
        with patch("builtins.open") as mock_open:
            # Allow the backup to succeed but make the final save fail
            def side_effect_func(*args, **kwargs):
                if "backup" not in args[0]:  # Not backup file
                    if "w" in args[1]:  # Write operation to main file
                        raise IOError("Simulated write error")
                m = mock_open()
                m.side_effect = None
                return m
            
            mock_open.side_effect = side_effect_func
            
            # Try to save
            result = self.file_manager.save_file("recovery_test.py", "New content that will fail")
            
            # Verify fallback behavior
            self.assertFalse(result["success"])
            self.assertIn("Failed to save file", result["message"])
            self.assertIn("backup", result["message"])  # Should mention backup

if __name__ == '__main__':
    unittest.main()
