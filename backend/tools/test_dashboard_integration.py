#!/usr/bin/env python3
"""
AILang Dashboard Integration Test

This script tests the integration between the AILang dashboard frontend components
and the backend FastAPI endpoints. It validates that all required endpoints are
functioning correctly and that the data format matches what the frontend expects.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

import aiohttp
import requests
from colorama import Fore, Style, init

# Initialize colorama for cross-platform colored terminal output
init()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("dashboard_test")

# Default API URL
DEFAULT_API_URL = "http://localhost:8001"


class DashboardIntegrationTest:
    """Test suite for AILang dashboard integration."""

    def __init__(self, api_url: str = DEFAULT_API_URL):
        """
        Initialize the test suite.
        
        Args:
            api_url: Base URL for the AILang API
        """
        self.api_url = api_url
        self.session = None
        self.test_results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "tests": [],
        }

    async def setup(self):
        """Set up the test environment."""
        self.session = aiohttp.ClientSession()
        logger.info(f"Testing API at {self.api_url}")

    async def teardown(self):
        """Clean up the test environment."""
        if self.session:
            await self.session.close()

    def log_success(self, message: str):
        """Log a success message."""
        logger.info(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")

    def log_failure(self, message: str):
        """Log a failure message."""
        logger.error(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")

    def log_warning(self, message: str):
        """Log a warning message."""
        logger.warning(f"{Fore.YELLOW}! {message}{Style.RESET_ALL}")

    def log_info(self, message: str):
        """Log an info message."""
        logger.info(f"{Fore.CYAN}ℹ {message}{Style.RESET_ALL}")

    def record_test(self, name: str, passed: bool, message: str, details: Optional[Dict] = None):
        """
        Record a test result.
        
        Args:
            name: Test name
            passed: Whether the test passed
            message: Test message
            details: Additional test details
        """
        self.test_results["total"] += 1
        if passed:
            self.test_results["passed"] += 1
            self.log_success(message)
        else:
            self.test_results["failed"] += 1
            self.log_failure(message)

        self.test_results["tests"].append({
            "name": name,
            "passed": passed,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat(),
        })

    async def test_api_root(self):
        """Test the API root endpoint."""
        try:
            async with self.session.get(f"{self.api_url}/") as response:
                if response.status == 200:
                    data = await response.json()
                    if "message" in data and "endpoints" in data:
                        self.record_test(
                            "api_root",
                            True,
                            "API root endpoint is accessible and returns expected data",
                            {"data": data},
                        )
                    else:
                        self.record_test(
                            "api_root",
                            False,
                            "API root endpoint response is missing expected fields",
                            {"data": data},
                        )
                else:
                    self.record_test(
                        "api_root",
                        False,
                        f"API root endpoint returned status {response.status}",
                        {"status": response.status},
                    )
        except Exception as e:
            self.record_test(
                "api_root",
                False,
                f"Error accessing API root endpoint: {str(e)}",
                {"error": str(e)},
            )

    async def test_health_endpoint(self):
        """Test the health endpoint."""
        try:
            async with self.session.get(f"{self.api_url}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    if "status" in data and "timestamp" in data:
                        self.record_test(
                            "health_endpoint",
                            True,
                            "Health endpoint is accessible and returns expected data",
                            {"data": data},
                        )
                    else:
                        self.record_test(
                            "health_endpoint",
                            False,
                            "Health endpoint response is missing expected fields",
                            {"data": data},
                        )
                else:
                    self.record_test(
                        "health_endpoint",
                        False,
                        f"Health endpoint returned status {response.status}",
                        {"status": response.status},
                    )
        except Exception as e:
            self.record_test(
                "health_endpoint",
                False,
                f"Error accessing health endpoint: {str(e)}",
                {"error": str(e)},
            )

    async def test_logs_endpoint(self):
        """Test the logs endpoint."""
        try:
            async with self.session.get(f"{self.api_url}/api/logs?lines=10") as response:
                if response.status == 200:
                    data = await response.json()
                    if "logs" in data and isinstance(data["logs"], list):
                        self.record_test(
                            "logs_endpoint",
                            True,
                            "Logs endpoint is accessible and returns expected data",
                            {"log_count": len(data["logs"])},
                        )
                    else:
                        self.record_test(
                            "logs_endpoint",
                            False,
                            "Logs endpoint response is missing expected fields",
                            {"data": data},
                        )
                else:
                    self.record_test(
                        "logs_endpoint",
                        False,
                        f"Logs endpoint returned status {response.status}",
                        {"status": response.status},
                    )
        except Exception as e:
            self.record_test(
                "logs_endpoint",
                False,
                f"Error accessing logs endpoint: {str(e)}",
                {"error": str(e)},
            )

    async def test_version_endpoint(self):
        """Test the version endpoint."""
        try:
            async with self.session.get(f"{self.api_url}/api/version") as response:
                if response.status == 200:
                    data = await response.json()
                    required_fields = [
                        "adapter_version",
                        "ailang_current_version",
                        "ailang_latest_version",
                        "update_available",
                    ]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        self.record_test(
                            "version_endpoint",
                            True,
                            "Version endpoint is accessible and returns expected data",
                            {"data": data},
                        )
                    else:
                        self.record_test(
                            "version_endpoint",
                            False,
                            f"Version endpoint response is missing fields: {', '.join(missing_fields)}",
                            {"data": data, "missing_fields": missing_fields},
                        )
                else:
                    self.record_test(
                        "version_endpoint",
                        False,
                        f"Version endpoint returned status {response.status}",
                        {"status": response.status},
                    )
        except Exception as e:
            self.record_test(
                "version_endpoint",
                False,
                f"Error accessing version endpoint: {str(e)}",
                {"error": str(e)},
            )

    async def test_update_endpoint(self):
        """Test the update endpoint."""
        try:
            payload = {"check_only": True, "force": False}
            async with self.session.post(
                f"{self.api_url}/api/update",
                json=payload,
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if "success" in data and "message" in data:
                        self.record_test(
                            "update_endpoint",
                            True,
                            "Update endpoint is accessible and returns expected data",
                            {"data": data},
                        )
                    else:
                        self.record_test(
                            "update_endpoint",
                            False,
                            "Update endpoint response is missing expected fields",
                            {"data": data},
                        )
                else:
                    self.record_test(
                        "update_endpoint",
                        False,
                        f"Update endpoint returned status {response.status}",
                        {"status": response.status},
                    )
        except Exception as e:
            self.record_test(
                "update_endpoint",
                False,
                f"Error accessing update endpoint: {str(e)}",
                {"error": str(e)},
            )

    async def test_frontend_api_compatibility(self):
        """
        Test that the frontend components are compatible with the API.
        
        This test checks that the API endpoints return data in the format
        expected by the frontend components.
        """
        # Define the expected data formats for each endpoint
        expected_formats = {
            "/api/health": {
                "status": str,
                "timestamp": str,
                "components": list,  # Optional
            },
            "/api/logs": {
                "logs": list,
            },
            "/api/version": {
                "adapter_version": str,
                "ailang_current_version": str,
                "ailang_latest_version": str,
                "update_available": bool,
            },
        }
        
        for endpoint, expected in expected_formats.items():
            try:
                async with self.session.get(f"{self.api_url}{endpoint}") as response:
                    if response.status == 200:
                        data = await response.json()
                        missing_fields = []
                        type_mismatches = []
                        
                        for field, expected_type in expected.items():
                            if field not in data:
                                missing_fields.append(field)
                            elif not isinstance(data[field], expected_type):
                                actual_type = type(data[field]).__name__
                                expected_type_name = expected_type.__name__
                                type_mismatches.append(f"{field} (expected {expected_type_name}, got {actual_type})")
                        
                        if not missing_fields and not type_mismatches:
                            self.record_test(
                                f"frontend_compatibility_{endpoint}",
                                True,
                                f"Endpoint {endpoint} returns data compatible with frontend components",
                                {"data": data},
                            )
                        else:
                            issues = []
                            if missing_fields:
                                issues.append(f"Missing fields: {', '.join(missing_fields)}")
                            if type_mismatches:
                                issues.append(f"Type mismatches: {', '.join(type_mismatches)}")
                            
                            self.record_test(
                                f"frontend_compatibility_{endpoint}",
                                False,
                                f"Endpoint {endpoint} data format issues: {'; '.join(issues)}",
                                {"data": data, "issues": issues},
                            )
                    else:
                        self.record_test(
                            f"frontend_compatibility_{endpoint}",
                            False,
                            f"Endpoint {endpoint} returned status {response.status}",
                            {"status": response.status},
                        )
            except Exception as e:
                self.record_test(
                    f"frontend_compatibility_{endpoint}",
                    False,
                    f"Error accessing endpoint {endpoint}: {str(e)}",
                    {"error": str(e)},
                )

    async def run_all_tests(self):
        """Run all integration tests."""
        self.log_info("Starting AILang Dashboard Integration Tests")
        
        # Test API endpoints
        await self.test_api_root()
        await self.test_health_endpoint()
        await self.test_logs_endpoint()
        await self.test_version_endpoint()
        await self.test_update_endpoint()
        
        # Test frontend compatibility
        await self.test_frontend_api_compatibility()
        
        # Print summary
        self.log_info("\nTest Summary:")
        self.log_info(f"Total Tests: {self.test_results['total']}")
        self.log_info(f"Passed: {self.test_results['passed']}")
        self.log_failure(f"Failed: {self.test_results['failed']}")
        if self.test_results["skipped"] > 0:
            self.log_warning(f"Skipped: {self.test_results['skipped']}")
        
        # Return overall success/failure
        return self.test_results["failed"] == 0

    def save_results(self, output_path: Optional[str] = None):
        """
        Save test results to a JSON file.
        
        Args:
            output_path: Path to save results to (default: test_results_{timestamp}.json)
        """
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"test_results_{timestamp}.json"
        
        with open(output_path, "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        self.log_info(f"Test results saved to {output_path}")


async def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="AILang Dashboard Integration Test")
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"Base URL for the AILang API (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--output",
        help="Path to save test results (default: test_results_{timestamp}.json)",
    )
    args = parser.parse_args()
    
    test_suite = DashboardIntegrationTest(api_url=args.api_url)
    
    try:
        await test_suite.setup()
        success = await test_suite.run_all_tests()
        test_suite.save_results(args.output)
        
        if success:
            print(f"\n{Fore.GREEN}All tests passed!{Style.RESET_ALL}")
            sys.exit(0)
        else:
            print(f"\n{Fore.RED}Some tests failed. See above for details.{Style.RESET_ALL}")
            sys.exit(1)
    finally:
        await test_suite.teardown()


if __name__ == "__main__":
    asyncio.run(main())
