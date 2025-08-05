#!/usr/bin/env python3
"""
AILang Dashboard Integration Test Script

This script tests the integration between the backend API endpoints
and the frontend dashboard components to ensure they work together correctly.
"""

import argparse
import json
import logging
import os
import requests
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("dashboard_test")

# Default settings
DEFAULT_API_HOST = "localhost"
DEFAULT_API_PORT = 8000
DEFAULT_FRONTEND_HOST = "localhost"
DEFAULT_FRONTEND_PORT = 3000
DEFAULT_TIMEOUT = 10  # seconds


class DashboardTester:
    """Tests the integration between backend API and frontend dashboard."""
    
    def __init__(
        self,
        api_host: str = DEFAULT_API_HOST,
        api_port: int = DEFAULT_API_PORT,
        frontend_host: str = DEFAULT_FRONTEND_HOST,
        frontend_port: int = DEFAULT_FRONTEND_PORT,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        """
        Initialize the dashboard tester.
        
        Args:
            api_host: API server hostname
            api_port: API server port
            frontend_host: Frontend server hostname
            frontend_port: Frontend server port
            timeout: Request timeout in seconds
        """
        self.api_base_url = f"http://{api_host}:{api_port}"
        self.frontend_base_url = f"http://{frontend_host}:{frontend_port}"
        self.timeout = timeout
        self.session = requests.Session()
    
    def test_api_health_endpoint(self) -> bool:
        """
        Test the API health endpoint.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Testing API health endpoint...")
            response = self.session.get(
                f"{self.api_base_url}/api/health",
                timeout=self.timeout,
            )
            
            if response.status_code != 200:
                logger.error(f"Health endpoint returned status code {response.status_code}")
                return False
            
            data = response.json()
            
            # Check for required fields in the health response
            required_fields = ["status", "components", "timestamp"]
            for field in required_fields:
                if field not in data:
                    logger.error(f"Health response missing required field: {field}")
                    return False
            
            logger.info("API health endpoint test passed")
            return True
        
        except Exception as e:
            logger.error(f"Error testing API health endpoint: {str(e)}")
            return False
    
    def test_api_logs_endpoint(self) -> bool:
        """
        Test the API logs endpoint.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Testing API logs endpoint...")
            response = self.session.get(
                f"{self.api_base_url}/api/logs?lines=10",
                timeout=self.timeout,
            )
            
            if response.status_code != 200:
                logger.error(f"Logs endpoint returned status code {response.status_code}")
                return False
            
            data = response.json()
            
            # Check for logs field in the response
            if "logs" not in data:
                logger.error("Logs response missing 'logs' field")
                return False
            
            logger.info("API logs endpoint test passed")
            return True
        
        except Exception as e:
            logger.error(f"Error testing API logs endpoint: {str(e)}")
            return False
    
    def test_api_version_endpoint(self) -> bool:
        """
        Test the API version endpoint.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Testing API version endpoint...")
            response = self.session.get(
                f"{self.api_base_url}/api/version",
                timeout=self.timeout,
            )
            
            if response.status_code != 200:
                logger.error(f"Version endpoint returned status code {response.status_code}")
                return False
            
            data = response.json()
            
            # Check for required fields in the version response
            if "version" not in data and "adapter_version" not in data:
                logger.error("Version response missing version information")
                return False
            
            logger.info("API version endpoint test passed")
            return True
        
        except Exception as e:
            logger.error(f"Error testing API version endpoint: {str(e)}")
            return False
    
    def test_api_update_endpoint(self) -> bool:
        """
        Test the API update endpoint.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Testing API update endpoint...")
            response = self.session.post(
                f"{self.api_base_url}/api/update",
                json={"check_only": True},
                timeout=self.timeout,
            )
            
            if response.status_code != 200:
                logger.error(f"Update endpoint returned status code {response.status_code}")
                return False
            
            data = response.json()
            
            # Check for required fields in the update response
            required_fields = ["success", "message"]
            for field in required_fields:
                if field not in data:
                    logger.error(f"Update response missing required field: {field}")
                    return False
            
            logger.info("API update endpoint test passed")
            return True
        
        except Exception as e:
            logger.error(f"Error testing API update endpoint: {str(e)}")
            return False
    
    def test_frontend_accessibility(self) -> bool:
        """
        Test if the frontend is accessible.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Testing frontend accessibility...")
            response = self.session.get(
                self.frontend_base_url,
                timeout=self.timeout,
            )
            
            if response.status_code != 200:
                logger.error(f"Frontend returned status code {response.status_code}")
                return False
            
            logger.info("Frontend accessibility test passed")
            return True
        
        except Exception as e:
            logger.error(f"Error testing frontend accessibility: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """
        Run all integration tests.
        
        Returns:
            Dictionary with test results
        """
        results = {
            "api_health": self.test_api_health_endpoint(),
            "api_logs": self.test_api_logs_endpoint(),
            "api_version": self.test_api_version_endpoint(),
            "api_update": self.test_api_update_endpoint(),
            "frontend": self.test_frontend_accessibility(),
        }
        
        # Calculate overall success
        success_count = sum(1 for result in results.values() if result)
        total_count = len(results)
        success_rate = (success_count / total_count) * 100
        
        logger.info(f"Test Results: {success_count}/{total_count} tests passed ({success_rate:.1f}%)")
        
        for test_name, result in results.items():
            status = "PASSED" if result else "FAILED"
            logger.info(f"  {test_name}: {status}")
        
        return results


def start_api_server(
    host: str = DEFAULT_API_HOST,
    port: int = DEFAULT_API_PORT,
    wait_time: int = 5,
) -> Optional[subprocess.Popen]:
    """
    Start the API server for testing.
    
    Args:
        host: Host to bind the server to
        port: Port to bind the server to
        wait_time: Time to wait for server startup in seconds
        
    Returns:
        Subprocess object if successful, None otherwise
    """
    try:
        logger.info(f"Starting API server on {host}:{port}...")
        
        # Find the API server script
        script_dir = Path(__file__).parent.absolute()
        api_script = script_dir / ".." / "backend" / "ailang_api.py"
        
        if not api_script.exists():
            logger.error(f"API script not found at {api_script}")
            return None
        
        # Set environment variables
        env = os.environ.copy()
        env["AILANG_API_HOST"] = host
        env["AILANG_API_PORT"] = str(port)
        
        # Start the server
        process = subprocess.Popen(
            [sys.executable, str(api_script)],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        # Wait for server to start
        logger.info(f"Waiting {wait_time} seconds for API server to start...")
        time.sleep(wait_time)
        
        # Check if process is still running
        if process.poll() is not None:
            logger.error("API server failed to start")
            stdout, stderr = process.communicate()
            logger.error(f"STDOUT: {stdout.decode('utf-8')}")
            logger.error(f"STDERR: {stderr.decode('utf-8')}")
            return None
        
        logger.info("API server started successfully")
        return process
    
    except Exception as e:
        logger.error(f"Error starting API server: {str(e)}")
        return None


def main():
    """Main entry point for the dashboard test script."""
    parser = argparse.ArgumentParser(description="AILang Dashboard Integration Test")
    parser.add_argument(
        "--api-host",
        default=DEFAULT_API_HOST,
        help=f"API server hostname (default: {DEFAULT_API_HOST})",
    )
    parser.add_argument(
        "--api-port",
        type=int,
        default=DEFAULT_API_PORT,
        help=f"API server port (default: {DEFAULT_API_PORT})",
    )
    parser.add_argument(
        "--frontend-host",
        default=DEFAULT_FRONTEND_HOST,
        help=f"Frontend server hostname (default: {DEFAULT_FRONTEND_HOST})",
    )
    parser.add_argument(
        "--frontend-port",
        type=int,
        default=DEFAULT_FRONTEND_PORT,
        help=f"Frontend server port (default: {DEFAULT_FRONTEND_PORT})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Request timeout in seconds (default: {DEFAULT_TIMEOUT})",
    )
    parser.add_argument(
        "--start-api",
        action="store_true",
        help="Start the API server for testing",
    )
    parser.add_argument(
        "--wait-time",
        type=int,
        default=5,
        help="Time to wait for server startup in seconds (default: 5)",
    )
    
    args = parser.parse_args()
    
    # Start API server if requested
    api_process = None
    if args.start_api:
        api_process = start_api_server(
            host=args.api_host,
            port=args.api_port,
            wait_time=args.wait_time,
        )
        if not api_process:
            sys.exit(1)
    
    try:
        # Run tests
        tester = DashboardTester(
            api_host=args.api_host,
            api_port=args.api_port,
            frontend_host=args.frontend_host,
            frontend_port=args.frontend_port,
            timeout=args.timeout,
        )
        
        results = tester.run_all_tests()
        
        # Exit with success if all tests passed
        if all(results.values()):
            logger.info("All tests passed!")
            sys.exit(0)
        else:
            logger.error("Some tests failed")
            sys.exit(1)
    
    finally:
        # Clean up API server if we started it
        if api_process:
            logger.info("Stopping API server...")
            api_process.terminate()
            api_process.wait()
            logger.info("API server stopped")


if __name__ == "__main__":
    main()
