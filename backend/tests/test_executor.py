import os
import unittest
from unittest.mock import patch, MagicMock
import sys
import tempfile
import shutil
import docker
from pathlib import Path

# Add parent directory to path to import executor
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from executor import CodeExecutor

class TestCodeExecutor(unittest.TestCase):
    """Test the CodeExecutor class with focus on Docker and local fallback mechanisms"""
    
    def setUp(self):
        """Set up test environment"""
        # Create temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
        self.temp_dir = os.path.join(self.test_dir, "temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        
        # Mock environment variables
        self.env_patcher = patch.dict('os.environ', {
            'DOCKER_MEMORY_LIMIT': '128m',
            'DOCKER_CPU_LIMIT': '0.5',
            'DOCKER_TIMEOUT': '10',
            'TEMP_DIR': self.temp_dir
        })
        self.env_patcher.start()
        
        # Create executor instance
        self.executor = CodeExecutor()
    
    def tearDown(self):
        """Clean up test environment"""
        self.env_patcher.stop()
        
        # Remove temporary directory
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    @patch('docker.from_env')
    def test_docker_execution_success(self, mock_docker):
        """Test successful code execution in Docker container"""
        # Mock Docker client and container
        mock_client = MagicMock()
        mock_container = MagicMock()
        mock_docker.return_value = mock_client
        mock_client.containers.run.return_value = b'Hello, world!'
        
        # Test code execution
        code = "print('Hello, world!')"
        result = self.executor.run_code('test.py', code)
        
        # Verify results
        self.assertTrue(result["success"])
        self.assertEqual(result["output"], "Hello, world!")
        self.assertEqual(result["execution_mode"], "docker")
        
        # Verify Docker was called with correct parameters
        mock_client.containers.run.assert_called_once()
        args, kwargs = mock_client.containers.run.call_args
        self.assertEqual(kwargs['image'], 'python:3.9-slim')  # Default Python image
        self.assertEqual(kwargs['mem_limit'], '128m')
        self.assertEqual(kwargs['cpu_period'], 100000)
        self.assertEqual(kwargs['cpu_quota'], 50000)  # 0.5 CPU
        self.assertTrue('volumes' in kwargs)
    
    @patch('docker.from_env')
    def test_javascript_execution(self, mock_docker):
        """Test JavaScript code execution"""
        # Mock Docker client and container
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_client.containers.run.return_value = b'42'
        
        # Test JavaScript code execution
        code = "console.log(42);"
        result = self.executor.run_code('test.js', code)
        
        # Verify results
        self.assertTrue(result["success"])
        self.assertEqual(result["output"], "42")
        
        # Verify correct Docker image was used
        mock_client.containers.run.assert_called_once()
        args, kwargs = mock_client.containers.run.call_args
        self.assertEqual(kwargs['image'], 'node:16-slim')  # Node.js image
    
    @patch('docker.from_env', side_effect=docker.errors.DockerException("Docker not available"))
    def test_local_fallback_when_docker_fails(self, mock_docker):
        """Test fallback to local execution when Docker is not available"""
        with patch('subprocess.run') as mock_subprocess:
            # Mock subprocess return
            mock_process = MagicMock()
            mock_process.returncode = 0
            mock_process.stdout = "Local execution result"
            mock_subprocess.return_value = mock_process
            
            # Test code execution with Docker failure
            code = "print('Local fallback')"
            result = self.executor.run_code('test.py', code)
            
            # Verify fallback to local execution
            self.assertTrue(result["success"])
            self.assertEqual(result["execution_mode"], "local")
            self.assertIn("Docker not available", result["warnings"])
            
            # Verify subprocess was called
            mock_subprocess.assert_called_once()
    
    @patch('docker.from_env')
    def test_execution_error_handling(self, mock_docker):
        """Test handling of code execution errors"""
        # Mock Docker client with error during execution
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_client.containers.run.side_effect = docker.errors.ContainerError(
            container="test", 
            exit_status=1, 
            command="python", 
            image="python:3.9-slim",
            stderr=b'Traceback (most recent call last):\n  File "code.py", line 1\n    print(undefined_variable)\nNameError: name \'undefined_variable\' is not defined'
        )
        
        # Test code with error
        code = "print(undefined_variable)"
        result = self.executor.run_code('test.py', code)
        
        # Verify error handling
        self.assertFalse(result["success"])
        self.assertIn("NameError: name 'undefined_variable' is not defined", result["error"])
        self.assertEqual(result["execution_mode"], "docker")
    
    @patch('docker.from_env')
    def test_resource_limit_enforcement(self, mock_docker):
        """Test that resource limits are enforced"""
        # Mock Docker client
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_client.containers.run.return_value = b'Limited resources'
        
        # Override environment with strict limits
        with patch.dict('os.environ', {
            'DOCKER_MEMORY_LIMIT': '64m',
            'DOCKER_CPU_LIMIT': '0.2',
            'DOCKER_TIMEOUT': '5'
        }):
            # Recreate executor with new limits
            executor = CodeExecutor()
            
            # Run code
            code = "print('Limited resources')"
            executor.run_code('test.py', code)
            
            # Verify limits were applied
            mock_client.containers.run.assert_called_once()
            args, kwargs = mock_client.containers.run.call_args
            self.assertEqual(kwargs['mem_limit'], '64m')
            self.assertEqual(kwargs['cpu_quota'], 20000)  # 0.2 CPU
            self.assertEqual(kwargs['stop_timeout'], 5)
    
    @patch('docker.from_env')
    def test_execution_timeout_handling(self, mock_docker):
        """Test handling of execution timeouts"""
        # Mock Docker client with timeout error
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_client.containers.run.side_effect = docker.errors.ContainerError(
            container="test", 
            exit_status=124,  # SIGTERM exit code
            command="python", 
            image="python:3.9-slim",
            stderr=b'Container timed out'
        )
        
        # Test code that would timeout
        code = "import time; time.sleep(100)"
        result = self.executor.run_code('test.py', code)
        
        # Verify timeout handling
        self.assertFalse(result["success"])
        self.assertIn("timeout", result["error"].lower())
        self.assertEqual(result["execution_mode"], "docker")
    
    def test_determine_language_by_extension(self):
        """Test determining language by file extension"""
        # Python
        self.assertEqual(self.executor._get_language_from_filename('test.py'), 'python')
        self.assertEqual(self.executor._get_language_from_filename('module/test.py'), 'python')
        
        # JavaScript
        self.assertEqual(self.executor._get_language_from_filename('test.js'), 'javascript')
        self.assertEqual(self.executor._get_language_from_filename('module/test.js'), 'javascript')
        
        # Unknown (should default to python)
        self.assertEqual(self.executor._get_language_from_filename('test.xyz'), 'python')

if __name__ == '__main__':
    unittest.main()
