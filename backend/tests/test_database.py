import os
import unittest
from unittest.mock import patch, MagicMock, mock_open
import sys
import json
import tempfile
import shutil
import sqlite3
from pathlib import Path
import time

# Add parent directory to path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import DatabaseClient

class TestDatabaseClient(unittest.TestCase):
    """Test the DatabaseClient class with focus on fallback mechanisms"""
    
    def setUp(self):
        """Set up test environment with temporary directories"""
        # Create temporary directories for testing
        self.test_dir = tempfile.mkdtemp()
        self.backup_dir = tempfile.mkdtemp()
        
        # Setup test database paths
        self.sqlite_path = os.path.join(self.test_dir, "test.db")
        self.json_path = os.path.join(self.test_dir, "test.json")
        
        # Create environment patch
        self.env_patcher = patch.dict('os.environ', {
            'DB_PATH': self.sqlite_path,
            'JSON_DB_PATH': self.json_path,
            'DB_BACKUP_DIR': self.backup_dir
        })
        self.env_patcher.start()
        
        # Create database client instance
        self.db_client = DatabaseClient(db_type="sqlite", db_path=self.sqlite_path, json_db_path=self.json_path)
    
    def tearDown(self):
        """Clean up test environment"""
        self.env_patcher.stop()
        
        # Close any open database connections
        if hasattr(self.db_client, '_conn') and self.db_client._conn:
            try:
                self.db_client._conn.close()
            except Exception:
                pass
        
        # Remove temporary directories
        shutil.rmtree(self.test_dir, ignore_errors=True)
        shutil.rmtree(self.backup_dir, ignore_errors=True)
    
    def test_sqlite_initialization(self):
        """Test successful SQLite database initialization"""
        # Initialize the database
        self.db_client.initialize_db()
        
        # Verify database file was created
        self.assertTrue(os.path.exists(self.sqlite_path))
        
        # Verify tables were created
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        
        # Check if projects table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='projects';
        """)
        
        self.assertIsNotNone(cursor.fetchone())
        
        # Check if files table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='files';
        """)
        
        self.assertIsNotNone(cursor.fetchone())
        
        # Check if executions table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='executions';
        """)
        
        self.assertIsNotNone(cursor.fetchone())
        conn.close()
    
    def test_sqlite_project_crud(self):
        """Test project CRUD operations with SQLite"""
        # Initialize the database
        self.db_client.initialize_db()
        
        # Create a project
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "language": "python"
        }
        
        result = self.db_client.create_project(project_data)
        
        # Verify creation was successful
        self.assertTrue(result["success"])
        self.assertIsNotNone(result["project_id"])
        
        project_id = result["project_id"]
        
        # Get the project
        get_result = self.db_client.get_project(project_id)
        
        # Verify retrieval was successful
        self.assertTrue(get_result["success"])
        self.assertEqual(get_result["project"]["name"], "Test Project")
        self.assertEqual(get_result["project"]["description"], "A test project")
        self.assertEqual(get_result["project"]["language"], "python")
        
        # Update the project
        update_data = {
            "name": "Updated Project",
            "description": "An updated test project"
        }
        
        update_result = self.db_client.update_project(project_id, update_data)
        
        # Verify update was successful
        self.assertTrue(update_result["success"])
        
        # Get the updated project
        updated_get_result = self.db_client.get_project(project_id)
        
        # Verify updated data
        self.assertEqual(updated_get_result["project"]["name"], "Updated Project")
        self.assertEqual(updated_get_result["project"]["description"], "An updated test project")
        
        # List all projects
        list_result = self.db_client.list_projects()
        
        # Verify list contains our project
        self.assertTrue(list_result["success"])
        self.assertEqual(len(list_result["projects"]), 1)
        self.assertEqual(list_result["projects"][0]["name"], "Updated Project")
        
        # Delete the project
        delete_result = self.db_client.delete_project(project_id)
        
        # Verify deletion was successful
        self.assertTrue(delete_result["success"])
        
        # Verify project is gone
        get_after_delete = self.db_client.get_project(project_id)
        self.assertFalse(get_after_delete["success"])
    
    def test_json_fallback(self):
        """Test JSON fallback when SQLite fails"""
        # Create a database client with failing SQLite connection
        with patch('sqlite3.connect', side_effect=sqlite3.OperationalError("database is locked")):
            fallback_client = DatabaseClient(db_type="sqlite", db_path=self.sqlite_path, json_db_path=self.json_path)
            
            # Initialize should fall back to JSON
            fallback_client.initialize_db()
            
            # Verify JSON file was created
            self.assertTrue(os.path.exists(self.json_path))
            
            # Test project creation with JSON fallback
            project_data = {
                "name": "Fallback Project",
                "description": "A fallback test project",
                "language": "javascript"
            }
            
            result = fallback_client.create_project(project_data)
            
            # Verify creation was successful using fallback
            self.assertTrue(result["success"])
            self.assertIsNotNone(result["project_id"])
            
            # Verify data was written to JSON file
            with open(self.json_path, 'r') as f:
                json_data = json.load(f)
                self.assertIn("projects", json_data)
                self.assertEqual(len(json_data["projects"]), 1)
                self.assertEqual(json_data["projects"][0]["name"], "Fallback Project")
    
    def test_filesystem_fallback(self):
        """Test filesystem fallback when both SQLite and JSON fail"""
        # Create patches to simulate both SQLite and JSON failing
        sqlite_patch = patch('sqlite3.connect', side_effect=sqlite3.OperationalError("database is locked"))
        json_patch = patch('builtins.open', side_effect=IOError("Permission denied"))
        
        with sqlite_patch, json_patch:
            # Create a database client with both mechanisms failing
            filesystem_client = DatabaseClient(
                db_type="sqlite",
                db_path=self.sqlite_path,
                json_db_path=self.json_path
            )
            
            # Initialize should set up in-memory mode
            filesystem_client.initialize_db()
            
            # Create a project using in-memory fallback
            project_data = {
                "name": "Memory Project",
                "description": "An in-memory test project",
                "language": "python"
            }
            
            result = filesystem_client.create_project(project_data)
            
            # Verify creation was successful using in-memory fallback
            self.assertTrue(result["success"])
            self.assertIsNotNone(result["project_id"])
            
            # Get the project from in-memory storage
            project_id = result["project_id"]
            get_result = filesystem_client.get_project(project_id)
            
            # Verify in-memory retrieval works
            self.assertTrue(get_result["success"])
            self.assertEqual(get_result["project"]["name"], "Memory Project")
    
    def test_backup_creation(self):
        """Test database backup creation"""
        # Initialize the database
        self.db_client.initialize_db()
        
        # Add some test data
        project_data = {
            "name": "Backup Test Project",
            "description": "A project to test backups",
            "language": "python"
        }
        
        self.db_client.create_project(project_data)
        
        # Create a backup
        backup_path = self.db_client.create_backup()
        
        # Verify backup was created
        self.assertTrue(os.path.exists(backup_path))
        
        # Verify it's a valid SQLite database with our data
        conn = sqlite3.connect(backup_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM projects")
        result = cursor.fetchone()
        conn.close()
        
        self.assertEqual(result[0], "Backup Test Project")
    
    def test_recovery_from_backup(self):
        """Test recovery from backup when database is corrupted"""
        # Initialize the database
        self.db_client.initialize_db()
        
        # Add some test data
        project_data = {
            "name": "Recovery Test Project",
            "description": "A project to test recovery",
            "language": "python"
        }
        
        self.db_client.create_project(project_data)
        
        # Create a backup
        backup_path = self.db_client.create_backup()
        
        # Corrupt the main database
        with open(self.sqlite_path, 'wb') as f:
            f.write(b'corrupted data')
        
        # Create a new database client that should recover from backup
        recovery_client = DatabaseClient(
            db_type="sqlite",
            db_path=self.sqlite_path,
            json_db_path=self.json_path
        )
        
        # Initialize should recover from backup
        recovery_client.initialize_db()
        
        # Verify data was recovered
        projects = recovery_client.list_projects()
        self.assertTrue(projects["success"])
        self.assertEqual(len(projects["projects"]), 1)
        self.assertEqual(projects["projects"][0]["name"], "Recovery Test Project")

if __name__ == '__main__':
    unittest.main()
