import os
import unittest
from unittest.mock import patch, MagicMock
import sys
import json
import time

# Add parent directory to path to import ollama_client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ollama_client import OllamaClient

class TestOllamaClient(unittest.TestCase):
    """Test the OllamaClient class with focus on fallback mechanisms"""
    
    def setUp(self):
        """Set up test environment"""
        # Mock environment variables
        self.env_patcher = patch.dict('os.environ', {
            'OLLAMA_URL': 'http://test-ollama:11434',
            'OLLAMA_MODEL': 'test-model',
            'OLLAMA_TIMEOUT': '5',
            'OLLAMA_MAX_RETRIES': '2'
        })
        self.env_patcher.start()
        self.client = OllamaClient()
        
    def tearDown(self):
        """Clean up after tests"""
        self.env_patcher.stop()
    
    @patch('ollama_client.requests.post')
    def test_successful_generation(self, mock_post):
        """Test successful response from Ollama"""
        # Mock a successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'response': 'This is a test response from the LLM'
        }
        mock_post.return_value = mock_response
        
        # Test the generate method
        response = self.client.generate("Test prompt")
        
        # Verify results
        self.assertEqual(response, 'This is a test response from the LLM')
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(kwargs['timeout'], 5)  # Verify timeout was set correctly
    
    @patch('ollama_client.requests.post')
    def test_retry_on_failure(self, mock_post):
        """Test retry mechanism on temporary failure"""
        # Mock a failed response followed by a successful one
        fail_response = MagicMock()
        fail_response.status_code = 500
        success_response = MagicMock()
        success_response.status_code = 200
        success_response.json.return_value = {
            'response': 'Response after retry'
        }
        mock_post.side_effect = [fail_response, success_response]
        
        # Test the generate method with retry
        response = self.client.generate("Test prompt")
        
        # Verify results
        self.assertEqual(response, 'Response after retry')
        self.assertEqual(mock_post.call_count, 2)  # Called twice due to retry
    
    @patch('ollama_client.requests.post')
    def test_max_retries_exceeded(self, mock_post):
        """Test fallback response after max retries exceeded"""
        # Mock consistently failed responses
        fail_response = MagicMock()
        fail_response.status_code = 500
        mock_post.return_value = fail_response
        
        # Test the generate method with max retries
        response = self.client.generate("Help me with a Python function")
        
        # Verify fallback response is returned
        self.assertIn("I'm unable to connect", response)
        self.assertEqual(mock_post.call_count, 3)  # Initial + 2 retries
    
    @patch('ollama_client.requests.post')
    def test_timeout_handling(self, mock_post):
        """Test timeout handling with fallback"""
        # Mock a timeout exception
        mock_post.side_effect = TimeoutError("Request timed out")
        
        # Test the generate method with timeout
        response = self.client.generate("Test prompt")
        
        # Verify fallback response for timeout
        self.assertIn("I'm currently experiencing high load", response)
    
    @patch('ollama_client.requests.post')
    def test_connection_error_fallback(self, mock_post):
        """Test connection error fallback"""
        # Mock a connection error
        mock_post.side_effect = ConnectionError("Connection refused")
        
        # Test the generate method with connection error
        response = self.client.generate("Test prompt")
        
        # Verify connection error fallback
        self.assertIn("I'm unable to connect", response)

if __name__ == '__main__':
    unittest.main()
