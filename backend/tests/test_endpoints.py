#!/usr/bin/env python3
"""
Test script for code generation and download endpoints
"""
import requests
import json
import os
import tempfile
import zipfile
import argparse
import sys
import time
import socket
from pprint import pprint

# Default configuration
DEFAULT_CONFIG = {
    "base_url": "http://localhost:8000",
    "username": "testuser",  # Updated to match the user in auth.py
    "password": "testpassword",  # Updated to match the password in auth.py
    "project_id": "test-project-123"
}

def check_server_availability(base_url, max_retries=5, retry_delay=2):
    """Check if the server is available by trying different connection methods"""
    print(f"Checking server availability at {base_url}...")
    
    # Try to parse the host from the URL
    try:
        from urllib.parse import urlparse
        parsed_url = urlparse(base_url)
        host = parsed_url.hostname
        port = parsed_url.port or 8000  # Default to 8000 if no port specified
    except Exception:
        host = "localhost"
        port = 8000
    
    # Try socket connection first to check if port is open
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Attempt {attempt}/{max_retries} - Testing socket connection to {host}:{port}")
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                print(f" Port {port} is open on {host}")
                break
            else:
                print(f" Port {port} is not open on {host}")
                if attempt < max_retries:
                    print(f"Waiting {retry_delay} seconds before retry...")
                    time.sleep(retry_delay)
        except Exception as e:
            print(f" Socket error: {str(e)}")
            if attempt < max_retries:
                print(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
    
    # Now try HTTP request
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Attempt {attempt}/{max_retries} - Testing HTTP connection to {base_url}")
            response = requests.get(
                f"{base_url}/health",  # FastAPI health endpoint should always be available
                timeout=5
            )
            if response.status_code == 200:
                print(f" Server is responding at {base_url}")
                return True
            else:
                print(f" Server responded with status code {response.status_code}")
                if attempt < max_retries:
                    print(f"Waiting {retry_delay} seconds before retry...")
                    time.sleep(retry_delay)
        except requests.exceptions.ConnectionError:
            print(f" Connection error. Server might not be running at {base_url}")
            if attempt < max_retries:
                print(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
        except requests.exceptions.Timeout:
            print(f" Connection timeout. Server might be slow to respond at {base_url}")
            if attempt < max_retries:
                print(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
        except Exception as e:
            print(f" Error checking server: {str(e)}")
            if attempt < max_retries:
                print(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
    
    # If we're in WSL, try alternative URLs
    if os.path.exists('/proc/sys/kernel/osrelease') and 'microsoft' in open('/proc/sys/kernel/osrelease').read().lower():
        print("Detected WSL environment, trying alternative connection methods...")
        
        # Try different IP addresses that might work in WSL
        alternative_hosts = [
            "127.0.0.1",
            "host.docker.internal",
            "172.17.0.1",  # Docker default bridge
            "172.28.112.1",  # Common WSL2 IP
            "172.29.112.1"   # Another common WSL2 IP
        ]
        
        for alt_host in alternative_hosts:
            alt_url = base_url.replace(host, alt_host)
            print(f"Trying alternative URL: {alt_url}")
            try:
                response = requests.get(f"{alt_url}/health", timeout=5)
                if response.status_code == 200:
                    print(f" Server is responding at alternative URL: {alt_url}")
                    print(f" Please use {alt_url} instead of {base_url}")
                    return True
            except:
                pass
    
    print(" Could not connect to server after multiple attempts")
    return False

def login(base_url, username, password):
    """Login and get access token and user info"""
    print("Attempting to login...")
    try:
        # Use form data instead of JSON for login
        response = requests.post(
            f"{base_url}/api/v1/auth/auth/login",  # Correct endpoint with prefix from main.py + router prefix + endpoint
            data={"username": username, "password": password},
            timeout=10  # Add explicit timeout
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        print(" Login successful")
        
        # Get user info using the token
        user_info = None
        try:
            user_response = requests.get(
                f"{base_url}/api/v1/auth/auth/validate",  # Use validate endpoint instead of /me
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            if user_response.status_code == 200:
                user_info = user_response.json()
                # Use username as the owner_id since that's what the backend uses
                if 'username' in user_info:
                    user_info['id'] = user_info['username']
                print(f" Retrieved user info: ID={user_info.get('id')}")
            else:
                print(f" Failed to get user info: {user_response.status_code} - {user_response.text}")
        except Exception as e:
            print(f" Could not retrieve user info: {str(e)}")
            
        return token, user_info
    except requests.exceptions.Timeout:
        print(f" Login request timed out after 10 seconds")
        # For development fallback, return None to test without token
        return None, None
    except requests.exceptions.ConnectionError:
        print(f" Connection error. Is the server running at {base_url}?")
        return None, None
    except Exception as e:
        print(f"Login failed: {str(e)}")
        # For development fallback, return None to test without token
        return None, None

def create_test_project(base_url, token, project_id, user_info):
    """Create a test project if it doesn't exist and return the project ID"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    try:
        print(f"Checking if project {project_id} exists...")
        # Check if project exists
        response = requests.get(
            f"{base_url}/api/v1/projects/{project_id}",
            headers=headers,
            timeout=10  # Add explicit timeout
        )
        
        if response.status_code == 200:
            print(f"Project {project_id} already exists")
            return True
            
        print(f"Creating project {project_id}...")
        # Create project if it doesn't exist - wrap in 'project' field as expected by backend
        project_data = {
            "project": {  # Wrap project data in a "project" field
                "name": "Test Project",
                "description": "Test project for code generation and download",
                "project_type": "web",  # Must match valid project types
                "id": project_id  # Include the ID if needed
            }
        }
        
        # If we have user info, add owner_id to ensure proper ownership
        if user_info and 'username' in user_info:
            project_data['project']['owner_id'] = user_info['username']  # Use username as owner_id
            print(f" Setting owner_id to {user_info['username']}")
        elif user_info and 'id' in user_info:
            project_data['project']['owner_id'] = user_info['id']
            print(f" Setting owner_id to {user_info['id']}")
        else:
            print(" WARNING: No user_info available, project will not have correct ownership")
        
        # Use the correct endpoint for project creation
        response = requests.post(
            f"{base_url}/api/v1/projects/",  # Note the trailing slash
            headers=headers,
            json=project_data,  # Send the wrapped project data
            timeout=10  # Add explicit timeout
        )
        
        if response.status_code in (200, 201):
            print(f"Project {project_id} created successfully")
            # Print the project details to see what owner_id was actually set
            try:
                project_details = response.json()
                print(f" Project details: {project_details}")
                print(f" Project owner_id: {project_details.get('owner_id')}")
                # Return the actual project ID from the response
                return project_details.get('id')
            except Exception as e:
                print(f" Could not parse project details: {str(e)}")
                return project_id
        else:
            print(f"Failed to create project: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.Timeout:
        print(f" Project creation/check request timed out after 10 seconds")
        return False
    except requests.exceptions.ConnectionError:
        print(f" Connection error. Is the server running at {base_url}?")
        return False
    except Exception as e:
        print(f"Error creating test project: {str(e)}")
        return False

def test_code_generation(base_url, token, project_id):
    """Test code generation endpoint"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}" if token else ""
    }
    
    # Sample data for code generation
    request_data = {
        # Wrap in code_request field as expected by backend with embed=True
        "code_request": {
            "project_id": project_id,
            "erd_data": {  # Match field name in CodeGenerationRequest model
                "entities": [
                    {
                        "name": "User",
                        "attributes": [
                            {"name": "id", "type": "uuid", "primary": True},
                            {"name": "username", "type": "string"},
                            {"name": "email", "type": "string"},
                            {"name": "password", "type": "string"}
                        ]
                    },
                    {
                        "name": "Product",
                        "attributes": [
                            {"name": "id", "type": "uuid", "primary": True},
                            {"name": "name", "type": "string"},
                            {"name": "price", "type": "decimal"},
                            {"name": "description", "type": "text"}
                        ]
                    }
                ],
                "relationships": [
                    {
                        "from": "User",
                        "to": "Product",
                        "type": "one-to-many",
                        "name": "creates"
                    }
                ]
            },
            "api_design": {  # Match field name in CodeGenerationRequest model
                "endpoints": [
                    {
                        "path": "/users",
                        "method": "GET",
                        "description": "Get all users"
                    },
                    {
                        "path": "/users/{id}",
                        "method": "GET",
                        "description": "Get user by ID"
                    },
                    {
                        "path": "/products",
                        "method": "GET",
                        "description": "Get all products"
                    },
                    {
                        "path": "/products/{id}",
                        "method": "GET",
                        "description": "Get product by ID"
                    }
                ]
            },
            "test_data": {  # Match field name in CodeGenerationRequest model
                "testCases": [
                    {
                        "name": "Get all users",
                        "endpoint": "/users",
                        "method": "GET",
                        "expectedStatus": 200
                    },
                    {
                        "name": "Get user by ID",
                        "endpoint": "/users/123",
                        "method": "GET",
                        "expectedStatus": 200
                    }
                ]
            },
            "target_language": "python",  # Match field name in CodeGenerationRequest model
            "target_framework": "fastapi",  # Match field name in CodeGenerationRequest model
            "include_tests": True,  # Match field name in CodeGenerationRequest model
            "include_documentation": True  # Match field name in CodeGenerationRequest model
        }
    }
    
    try:
        print(f"\n--- Testing Code Generation Endpoint ---")
        print(f"POST {base_url}/api/v1/projects/{project_id}/generate-code")
        print("Sending request... (this may take up to 60 seconds)")
        
        # Now make the actual code generation request
        response = requests.post(
            f"{base_url}/api/v1/projects/{project_id}/generate-code",
            headers=headers,
            json=request_data,  # Send the wrapped request data
            timeout=60  # Code generation might take time
        )
        
        if response.status_code == 200:
            result = response.json()
            print(" Code generation successful!")
            print(f"Generated {len(result.get('code', {}))} files:")
            for filename in result.get("code", {}).keys():
                print(f"  - {filename}")
            return result
        else:
            print(f" Code generation failed: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.Timeout:
        print(f" Code generation request timed out after 60 seconds")
        print("This could be because the server is taking too long to generate code.")
        print("You may want to check the server logs for more information.")
        return None
    except requests.exceptions.ConnectionError:
        print(f" Connection error. Is the server running at {base_url}?")
        return None
    except Exception as e:
        print(f" Error testing code generation: {str(e)}")
        return None

def test_code_download(base_url, token, project_id, generated_code):
    """Test code download endpoint"""
    if not generated_code or not generated_code.get("generated_code"):
        print(" No generated code to download")
        return False
        
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}" if token else ""
    }
    
    # Prepare download request
    download_data = {
        "download_request": {
            "code": generated_code.get("generated_code", {}),
            "techStack": "python-fastapi"
        }
    }
    
    try:
        print(f"\n--- Testing Code Download Endpoint ---")
        print(f"POST {base_url}/api/v1/projects/{project_id}/download-code")
        print("Sending request... (this may take up to 30 seconds)")
        
        response = requests.post(
            f"{base_url}/api/v1/projects/{project_id}/download-code",
            headers=headers,
            json=download_data,
            timeout=30,
            stream=True
        )
        
        if response.status_code == 200:
            # Save the ZIP file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            print(f" Code download successful!")
            print(f"ZIP file saved to: {temp_file_path}")
            
            # Verify ZIP contents
            try:
                with zipfile.ZipFile(temp_file_path, 'r') as zip_ref:
                    file_list = zip_ref.namelist()
                    print(f"ZIP contains {len(file_list)} files:")
                    for filename in file_list:
                        print(f"  - {filename}")
                return True
            except Exception as e:
                print(f" Error verifying ZIP contents: {str(e)}")
                return False
        else:
            print(f" Code download failed: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.Timeout:
        print(f" Code download request timed out after 30 seconds")
        return False
    except requests.exceptions.ConnectionError:
        print(f" Connection error. Is the server running at {base_url}?")
        return False
    except Exception as e:
        print(f" Error testing code download: {str(e)}")
        return False

def main():
    """Main function to run the test script"""
    parser = argparse.ArgumentParser(description="Test code generation and download endpoints")
    parser.add_argument("--base-url", default=DEFAULT_CONFIG["base_url"], help="Base URL of the API")
    parser.add_argument("--username", default=DEFAULT_CONFIG["username"], help="Username for authentication")
    parser.add_argument("--password", default=DEFAULT_CONFIG["password"], help="Password for authentication")
    parser.add_argument("--project-id", default=DEFAULT_CONFIG["project_id"], help="Project ID to use for testing")
    parser.add_argument("--timeout", type=int, default=60, help="Timeout in seconds for code generation")
    parser.add_argument("--skip-generation", action="store_true", help="Skip code generation and test only download")
    parser.add_argument("--skip-server-check", action="store_true", help="Skip server availability check")
    args = parser.parse_args()
    
    print(f"Testing API at {args.base_url}")
    
    # Check server availability first
    if not args.skip_server_check:
        if not check_server_availability(args.base_url):
            print(" Server is not available. Exiting.")
            sys.exit(1)
    
    # Login
    token, user_info = login(args.base_url, args.username, args.password)
    if token:
        print(f" Login successful")
    else:
        print(f" Using development fallback (no token)")
    
    # Create test project if needed and get the actual project ID
    project_id = create_test_project(args.base_url, token, args.project_id, user_info)
    if not project_id:
        print("Failed to create test project. Exiting.")
        sys.exit(1)
        
    # Update the project_id to use the one returned by the backend
    args.project_id = project_id
    
    # Test code generation
    print(f"\nUsing project ID: {args.project_id} for code generation")
    generated_code = None
    if not args.skip_generation:
        generated_code = test_code_generation(args.base_url, token, args.project_id)
    else:
        print("Skipping code generation as requested")
        # Create a minimal generated code structure for download testing
        generated_code = {
            "generated_code": {
                "main.py": "print('Hello world')",
                "requirements.txt": "fastapi==0.68.0\nuvicorn==0.15.0"
            }
        }
    
    # Test code download
    if generated_code:
        test_code_download(args.base_url, token, args.project_id, generated_code)
    else:
        print(" Cannot test code download without generated code")
        sys.exit(1)
    
if __name__ == "__main__":
    main()
