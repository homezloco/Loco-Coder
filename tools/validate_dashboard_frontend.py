#!/usr/bin/env python3
"""
AILang Dashboard Frontend Validation Script

This script helps users validate the frontend dashboard components against the standalone AILang API server.
It performs the following:
1. Checks if the API server is running
2. Provides instructions for running the frontend
3. Lists test scenarios for manual validation
4. Offers a guided walkthrough of the validation process

Usage:
    python validate_dashboard_frontend.py

Requirements:
    - requests
    - colorama
"""

import os
import sys
import json
import time
import logging
import webbrowser
import requests
from datetime import datetime
from colorama import Fore, Style, init

# Initialize colorama
init()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('dashboard_validation')

# Constants
API_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:5173"  # Default Vite dev server URL
VALIDATION_RESULTS_DIR = "validation_results"

def print_header(text):
    """Print a formatted header."""
    print(f"\n{Fore.CYAN}{Style.BRIGHT}{'=' * 80}")
    print(f"{text.center(80)}")
    print(f"{'=' * 80}{Style.RESET_ALL}\n")

def print_step(step_number, text):
    """Print a formatted step."""
    print(f"{Fore.GREEN}{Style.BRIGHT}Step {step_number}: {text}{Style.RESET_ALL}")

def print_error(text):
    """Print a formatted error message."""
    print(f"{Fore.RED}{Style.BRIGHT}ERROR: {text}{Style.RESET_ALL}")

def print_success(text):
    """Print a formatted success message."""
    print(f"{Fore.GREEN}{Style.BRIGHT}✓ {text}{Style.RESET_ALL}")

def print_info(text):
    """Print a formatted info message."""
    print(f"{Fore.BLUE}{Style.BRIGHT}ℹ {text}{Style.RESET_ALL}")

def check_api_server():
    """Check if the API server is running."""
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print_success(f"API server is running at {API_URL}")
            return True
        else:
            print_error(f"API server returned status code {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print_error(f"Could not connect to API server at {API_URL}")
        return False

def check_frontend_server():
    """Check if the frontend server is running."""
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print_success(f"Frontend server is running at {FRONTEND_URL}")
            return True
        else:
            print_error(f"Frontend server returned status code {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print_error(f"Could not connect to frontend server at {FRONTEND_URL}")
        return False

def provide_frontend_instructions():
    """Provide instructions for running the frontend."""
    print_info("To run the frontend server:")
    print(f"{Fore.YELLOW}1. Open a new terminal window")
    print(f"2. Navigate to the frontend directory:")
    print(f"   cd /mnt/c/Users/Shane Holmes/CascadeProjects/windsurf-project/Coder/frontend")
    print(f"3. Install dependencies (if not already done):")
    print(f"   npm install")
    print(f"4. Start the development server:")
    print(f"   npm run dev{Style.RESET_ALL}")

def list_validation_scenarios():
    """List the validation scenarios for manual testing."""
    print_header("AILang Dashboard Validation Scenarios")
    
    scenarios = [
        {
            "name": "System Status Dashboard",
            "steps": [
                "Navigate to the System Status page",
                "Verify health status indicators are displayed correctly",
                "Check that version information is displayed",
                "Verify that system metrics are shown"
            ]
        },
        {
            "name": "Logs Viewer",
            "steps": [
                "Navigate to the Logs page",
                "Verify that logs are displayed in a readable format",
                "Check that log filtering works (if implemented)",
                "Verify that log timestamps are displayed correctly"
            ]
        },
        {
            "name": "Version Information",
            "steps": [
                "Navigate to the Version page",
                "Verify that version details are displayed correctly",
                "Check that update status is shown",
                "Verify that GitHub repository link works"
            ]
        },
        {
            "name": "Update Functionality",
            "steps": [
                "Navigate to the Update page",
                "Trigger an update check",
                "Verify that update status is displayed",
                "Check that force update option works (if implemented)"
            ]
        },
        {
            "name": "Responsive Design",
            "steps": [
                "Resize browser window to simulate mobile view",
                "Verify that navigation changes to bottom bar on mobile",
                "Check that all components render correctly on small screens",
                "Verify that drawer opens/closes correctly on mobile"
            ]
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print_step(i, scenario["name"])
        for j, step in enumerate(scenario["steps"], 1):
            print(f"   {j}. {step}")
        print()

def guided_validation():
    """Provide a guided walkthrough of the validation process."""
    print_header("Guided Validation Walkthrough")
    
    # Check if API server is running
    if not check_api_server():
        print_info("Please start the API server with:")
        print(f"{Fore.YELLOW}python -m ailang_api{Style.RESET_ALL}")
        return
    
    # Check if frontend server is running
    frontend_running = check_frontend_server()
    if not frontend_running:
        provide_frontend_instructions()
        user_input = input(f"{Fore.YELLOW}Would you like to continue once the frontend is running? (y/n): {Style.RESET_ALL}")
        if user_input.lower() != 'y':
            return
    
    # Open the frontend in the browser if it's running
    if frontend_running:
        print_info(f"Opening {FRONTEND_URL} in your browser...")
        webbrowser.open(FRONTEND_URL)
    
    # Guide through each validation scenario
    list_validation_scenarios()
    
    # Collect validation results
    print_header("Validation Results Collection")
    print_info("Please provide your validation results for each scenario:")
    
    results = {}
    scenarios = ["System Status Dashboard", "Logs Viewer", "Version Information", "Update Functionality", "Responsive Design"]
    
    for scenario in scenarios:
        print(f"\n{Fore.YELLOW}Scenario: {scenario}{Style.RESET_ALL}")
        status = input("Did this scenario pass? (y/n/partial): ").lower()
        notes = input("Any notes or issues? (press Enter if none): ")
        
        results[scenario] = {
            "status": "pass" if status == 'y' else "partial" if status == 'partial' else "fail",
            "notes": notes if notes else "No issues reported"
        }
    
    # Save validation results
    os.makedirs(VALIDATION_RESULTS_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = os.path.join(VALIDATION_RESULTS_DIR, f"validation_results_{timestamp}.json")
    
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "api_url": API_URL,
            "frontend_url": FRONTEND_URL,
            "results": results
        }, f, indent=2)
    
    print_success(f"Validation results saved to {results_file}")
    
    # Summary
    passed = sum(1 for r in results.values() if r["status"] == "pass")
    partial = sum(1 for r in results.values() if r["status"] == "partial")
    failed = sum(1 for r in results.values() if r["status"] == "fail")
    
    print_header("Validation Summary")
    print(f"{Fore.GREEN}Passed: {passed}{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}Partial: {partial}{Style.RESET_ALL}")
    print(f"{Fore.RED}Failed: {failed}{Style.RESET_ALL}")
    
    if failed > 0:
        print_error("Some scenarios failed. Please review the issues and fix them.")
    elif partial > 0:
        print_info("Some scenarios partially passed. Consider addressing the noted issues.")
    else:
        print_success("All scenarios passed! The dashboard is ready for deployment.")

def main():
    """Main function."""
    print_header("AILang Dashboard Frontend Validation")
    print_info("This script will help you validate the AILang Dashboard frontend components.")
    print_info("Make sure both the standalone AILang API server and the frontend server are running.")
    print()
    
    guided_validation()

if __name__ == "__main__":
    main()
