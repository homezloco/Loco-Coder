#!/usr/bin/env python3
"""
AILang Dashboard Integration Test

This script tests the integration between the AILang dashboard and the API server.
It verifies that all required endpoints are available and returning data in the expected format.

Usage:
    python test_ailang_dashboard.py

Requirements:
    - Python 3.x
    - requests
"""

import requests
import json
import os
import sys
import time
from pathlib import Path
import subprocess
import webbrowser
from urllib.parse import urlparse
import platform
import socket
import colorama
from colorama import Fore, Style

# Initialize colorama
colorama.init()

# Default API server port
API_PORT = 8001
# Default dashboard server port
DASHBOARD_PORT = 8080

def print_header(text):
    """Print a formatted header."""
    print(f"\n{Fore.CYAN}{Style.BRIGHT}{'=' * 60}")
    print(f" {text}")
    print(f"{'=' * 60}{Style.RESET_ALL}\n")

def print_success(text):
    """Print a success message."""
    print(f"{Fore.GREEN}✓ {text}{Style.RESET_ALL}")

def print_error(text):
    """Print an error message."""
    print(f"{Fore.RED}✗ {text}{Style.RESET_ALL}")

def print_warning(text):
    """Print a warning message."""
    print(f"{Fore.YELLOW}! {text}{Style.RESET_ALL}")

def print_info(text):
    """Print an info message."""
    print(f"{Fore.BLUE}ℹ {text}{Style.RESET_ALL}")

def get_project_root():
    """Get the project root directory."""
    # Start from the current directory and go up until we find the Coder directory
    current_dir = Path(os.path.abspath(__file__)).parent
    while current_dir.name != "Coder" and current_dir != current_dir.parent:
        current_dir = current_dir.parent
    return current_dir

def is_port_in_use(port):
    """Check if a port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_api_server():
    """Start the AILang API server."""
    project_root = get_project_root()
    api_script = project_root / "tools" / "simple_ailang_api.py"
    
    if not api_script.exists():
        print_error(f"API server script not found at {api_script}")
        return None
    
    if is_port_in_use(API_PORT):
        print_warning(f"Port {API_PORT} is already in use. Assuming API server is running.")
        return None
    
    print_info(f"Starting AILang API server on port {API_PORT}...")
    
    # Determine the Python executable
    python_exec = sys.executable
    
    # Start the API server as a subprocess
    try:
        process = subprocess.Popen(
            [python_exec, str(api_script), "-p", str(API_PORT)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(2)
        
        # Check if the process is still running
        if process.poll() is not None:
            _, stderr = process.communicate()
            print_error(f"Failed to start API server: {stderr}")
            return None
        
        print_success("API server started successfully")
        return process
    except Exception as e:
        print_error(f"Error starting API server: {e}")
        return None

def test_api_endpoint(endpoint, expected_keys=None):
    """Test an API endpoint."""
    url = f"http://localhost:{API_PORT}{endpoint}"
    
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if expected_keys:
            missing_keys = [key for key in expected_keys if key not in data]
            if missing_keys:
                print_error(f"Endpoint {endpoint}: Missing expected keys: {missing_keys}")
                return False
            else:
                print_success(f"Endpoint {endpoint}: All expected keys present")
                return True
        else:
            print_success(f"Endpoint {endpoint}: Received valid JSON response")
            return True
    except requests.exceptions.RequestException as e:
        print_error(f"Endpoint {endpoint}: {e}")
        return False
    except json.JSONDecodeError:
        print_error(f"Endpoint {endpoint}: Invalid JSON response")
        return False

def open_dashboard():
    """Open the AILang dashboard in the default web browser."""
    project_root = get_project_root()
    dashboard_script = project_root / "tools" / "serve_ailang_dashboard.py"
    
    if not dashboard_script.exists():
        print_error(f"Dashboard server script not found at {dashboard_script}")
        return None
    
    if is_port_in_use(DASHBOARD_PORT):
        print_warning(f"Port {DASHBOARD_PORT} is already in use. Assuming dashboard server is running.")
        dashboard_url = f"http://localhost:{DASHBOARD_PORT}/ailang-dashboard.html"
        webbrowser.open(dashboard_url)
        return None
    
    print_info(f"Starting AILang dashboard server on port {DASHBOARD_PORT}...")
    
    # Determine the Python executable
    python_exec = sys.executable
    
    # Start the dashboard server as a subprocess
    try:
        process = subprocess.Popen(
            [python_exec, str(dashboard_script), "-p", str(DASHBOARD_PORT)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(2)
        
        # Check if the process is still running
        if process.poll() is not None:
            _, stderr = process.communicate()
            print_error(f"Failed to start dashboard server: {stderr}")
            return None
        
        print_success("Dashboard server started successfully")
        return process
    except Exception as e:
        print_error(f"Error starting dashboard server: {e}")
        return None

def run_tests():
    """Run all integration tests."""
    print_header("AILang Dashboard Integration Test")
    
    # Start the API server
    api_process = start_api_server()
    
    # Test API endpoints
    print_header("Testing API Endpoints")
    
    endpoints = {
        "/api/health": ["status", "details"],
        "/api/logs": ["logs"],
        "/api/version": ["version", "last_updated", "update_available"],
        "/api/update": ["status", "message"]
    }
    
    all_tests_passed = True
    
    for endpoint, expected_keys in endpoints.items():
        if not test_api_endpoint(endpoint, expected_keys):
            all_tests_passed = False
    
    # Open the dashboard
    print_header("Opening Dashboard")
    dashboard_process = open_dashboard()
    
    # Wait for user to verify the dashboard
    print_info("\nThe AILang dashboard should now be open in your web browser.")
    print_info("Please verify that the dashboard is displaying data correctly.")
    
    input(f"\n{Fore.YELLOW}Press Enter when you're done testing the dashboard...{Style.RESET_ALL}")
    
    # Clean up
    if api_process and api_process.poll() is None:
        api_process.terminate()
        print_info("API server stopped")
    
    if dashboard_process and dashboard_process.poll() is None:
        dashboard_process.terminate()
        print_info("Dashboard server stopped")
    
    # Print final results
    print_header("Test Results")
    
    if all_tests_passed:
        print_success("All API endpoint tests passed!")
    else:
        print_error("Some API endpoint tests failed. See above for details.")
    
    print_info("\nManual verification required for dashboard UI functionality.")
    print_info("Please ensure that:")
    print_info("1. The dashboard loaded correctly")
    print_info("2. System health information was displayed")
    print_info("3. Logs were displayed")
    print_info("4. Version information was displayed")

if __name__ == "__main__":
    run_tests()
