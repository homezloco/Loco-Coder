#!/usr/bin/env python3
"""
Test script for Ollama integration and fallback mechanisms.
This script verifies that the OllamaClient can properly communicate with
both the Ollama API and CLI, with robust fallbacks in place.
"""

import os
import sys
import time
from typing import List, Optional

# Import the OllamaClient class
try:
    from ollama_client import OllamaClient
except ImportError:
    print("Error: Could not import OllamaClient. Make sure you're running this from the backend directory.")
    sys.exit(1)

def print_separator():
    """Print a separator line for better readability"""
    print("\n" + "=" * 80 + "\n")

def check_network_connectivity(hosts, port=11434):
    """Test network connectivity to various hosts and port"""
    print("\nRunning network connectivity checks...")
    
    for host in hosts:
        # Extract hostname from URL if it's a URL
        if host.startswith('http'):
            hostname = host.split('//')[-1].split(':')[0]
        else:
            hostname = host
            
        # Skip localhost as it's not useful for diagnostics
        if hostname == 'localhost' or hostname == '127.0.0.1':
            continue
            
        print(f"Testing connectivity to {hostname}:{port}...")
        
        # Try ping
        try:
            ping_result = subprocess.run(['ping', '-c', '1', '-W', '3', hostname], 
                                      capture_output=True, text=True, timeout=5)
            if ping_result.returncode == 0:
                print(f"  ✅ Ping successful to {hostname}")
            else:
                print(f"  ❌ Ping failed to {hostname}")
                print(f"    Error: {ping_result.stderr if ping_result.stderr else ping_result.stdout}")
        except Exception as e:
            print(f"  ❌ Ping error for {hostname}: {e}")
            
        # Try TCP connection
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex((hostname, port))
            if result == 0:
                print(f"  ✅ TCP connection successful to {hostname}:{port}")
            else:
                print(f"  ❌ TCP connection failed to {hostname}:{port} (error code: {result})")
            sock.close()
        except Exception as e:
            print(f"  ❌ TCP connection error for {hostname}:{port}: {e}")
    
    # Try curl to localhost for reference
    try:
        curl_result = subprocess.run(['curl', '-s', '-m', '5', 'http://localhost:11434/api/version'], 
                                    capture_output=True, text=True, timeout=8)
        if curl_result.returncode == 0 and curl_result.stdout:
            print(f"\n✅ Curl to localhost:11434 successful: {curl_result.stdout.strip()}")
        else:
            print(f"\n❌ Curl to localhost:11434 failed")
            if curl_result.stderr:
                print(f"  Error: {curl_result.stderr}")
    except Exception as e:
        print(f"\n❌ Curl error: {e}")

def test_ollama_client():
    """Test the OllamaClient integration with various models and fallback scenarios"""
    
    # Ollama URL (default API endpoint)
    # When running in WSL, we need to use the Windows host IP instead of localhost
    # Try different methods to reach the Windows host from WSL
    if os.path.exists("/proc/version") and "microsoft" in open("/proc/version").read().lower():
        print("Detected WSL environment, trying alternate connection methods to Windows host")
        
        # Try to detect the actual Windows host IP address
        print("\nAttempting to detect Windows host IP address...")
        windows_ip = None
        try:
            # Method 1: Using the WSL networking route to find the Windows host IP
            result = subprocess.run(['ip', 'route', 'show'], capture_output=True, text=True)
            print(f"Route info: {result.stdout}")
            # Look for default route which is typically the Windows host
            for line in result.stdout.splitlines():
                if 'default via' in line:
                    windows_ip = line.split('via ')[1].split()[0]
                    print(f"Found Windows host IP: {windows_ip} (via default route)")
                    break
        except Exception as e:
            print(f"Error detecting Windows IP: {e}")
            
        # Try multiple possible Windows host addresses
        possible_hosts = [
            "http://host.docker.internal:11434"   # Docker convention for host
        ]
        
        # Add the detected Windows IP if found
        if windows_ip:
            possible_hosts.insert(0, f"http://{windows_ip}:11434")
            
        # Add other common addresses
        possible_hosts.extend([
            "http://172.17.0.1:11434",           # Common Docker bridge
            "http://172.29.112.1:11434",         # Common WSL2 host IP
            "http://192.168.1.1:11434",          # Common default gateway
            "http://localhost:11434"              # Try localhost as last resort
        ])
        
        # Remove duplicates while preserving order
        seen = set()
        possible_hosts = [x for x in possible_hosts if not (x in seen or seen.add(x))]
        
        ollama_url = possible_hosts[0]  # Default to first option
        print(f"Will attempt these connection URLs: {', '.join(possible_hosts)}")
        print("Note: The script will automatically try each URL until one works.")
    else:
        ollama_url = "http://localhost:11434"
    print_separator()
    print("Starting Ollama integration test...")
    print(f"Using Ollama URL: {ollama_url}")
    
    # Run network connectivity checks for all possible hosts
    hostnames = [h.split('//')[-1].split(':')[0] for h in possible_hosts] 
    check_network_connectivity(hostnames)
    
    # Print environment diagnostics
    print("\nRunning environment diagnostics...")
    print(f"Current directory: {os.getcwd()}")
    print(f"Python executable: {sys.executable}")
    print(f"Environment PATH: {os.environ.get('PATH', '')}")
    
    # Check if Ollama server is running (basic checks)
    print("\nChecking Ollama server status...")
    
    # Try API version endpoint
    try:
        response = requests.get(f"{ollama_url}/api/version", timeout=5)
        if response.status_code == 200:
            print(f"✅ Ollama server is running. Version: {response.json().get('version', 'unknown')}")
        else:
            print(f"❌ Ollama server returned error code: {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot connect to Ollama server: {str(e)}")
        
    # Check if Windows Ollama.exe process is running
    try:
        if os.path.exists("/proc/version") and "microsoft" in open("/proc/version").read().lower():
            # We're in WSL, check Windows processes
            ps_result = subprocess.run(['cmd.exe', '/c', 'powershell', '-Command', 
                                      "Get-Process -Name 'ollama' -ErrorAction SilentlyContinue"], 
                                     capture_output=True, text=True, timeout=10)
            if "ollama" in ps_result.stdout.lower():
                print("✅ Ollama.exe process is running in Windows")
            else:
                print("❌ Ollama.exe process does NOT appear to be running in Windows")
    except Exception as e:
        print(f"❓ Could not check Ollama process status: {str(e)}")
    
    # Test prompts
    test_prompts = [
        "Write a hello world function in Python",
        "Explain what a REST API is in one paragraph"
    ]
    
    # Step 1: Initialize client with the 'codellama:instruct' model (known to be locally available)
    print_separator()
    print("STEP 1: Testing with codellama:instruct (should be available locally)")
    client = OllamaClient(ollama_url, "codellama:instruct", timeout=30)  # Increase timeout to 30 seconds
    
    # Print model availability information
    print(f"API models detected: {', '.join(client.api_models) if client.api_models else 'None'}")
    print(f"CLI models detected: {', '.join(client.cli_models) if client.cli_models else 'None'}")
    print(f"Selected model in API: {client.model_in_api}")
    print(f"Selected model in CLI: {client.model_in_cli}")
    
    # Test with first prompt
    if client.model_in_api or client.model_in_cli:
        print("\nGenerating response with codellama:instruct...")
        print("Note: This model may take longer to respond - timeout set to 120 seconds")
        try:
            # Use a longer timeout for large models like deepseek-coder:33b
            start_time = time.time()
            response = client.generate(test_prompts[0])
            end_time = time.time()
            print(f"Response received in {end_time - start_time:.1f} seconds")
            print(f"\nResponse:\n{response}")
        except Exception as e:
            print(f"\nError getting response: {str(e)}")
            print("This could be due to a timeout or API error.")
    else:
        print("\nWarning: codellama:instruct not available in either API or CLI, skipping test")
    
    # Step 2: Try with alternative model codellama:7b-instruct-q4_0
    print_separator()
    print("STEP 2: Testing with codellama:7b-instruct-q4_0 (should be available locally)")
    client = OllamaClient(ollama_url, "codellama:7b-instruct-q4_0", timeout=30)  # Increase timeout to 30 seconds
    
    # Print model availability information 
    print(f"API models detected: {', '.join(client.api_models) if client.api_models else 'None'}")
    print(f"CLI models detected: {', '.join(client.cli_models) if client.cli_models else 'None'}")
    print(f"Selected model in API: {client.model_in_api}")
    print(f"Selected model in CLI: {client.model_in_cli}")
    
    if client.model_in_api or client.model_in_cli:
        print("\nGenerating response with codellama:7b-instruct-q4_0...")
        print("Note: This model may take longer to respond - timeout set to 120 seconds")
        try:
            # Use a longer timeout for potentially slow models
            start_time = time.time()
            response = client.generate(test_prompts[1])
            end_time = time.time()
            print(f"Response received in {end_time - start_time:.1f} seconds")
            print(f"\nResponse:\n{response}")
        except Exception as e:
            print(f"\nError getting response: {str(e)}")
            print("This could be due to a timeout or API error.")
    else:
        print("\nWarning: codellama:7b-instruct-q4_0 not available in either API or CLI, skipping test")
    
    # Step 3: Test with a non-existent model to verify fallback response
    print_separator()
    print("STEP 3: Testing with non-existent model to verify fallback mechanisms")
    client = OllamaClient(ollama_url, "non-existent-model-123", timeout=30)  # Increase timeout to 30 seconds
    
    # Print model availability information
    print(f"API models detected: {', '.join(client.api_models) if client.api_models else 'None'}")
    print(f"CLI models detected: {', '.join(client.cli_models) if client.cli_models else 'None'}")
    print(f"Selected model in API: {client.model_in_api}")
    print(f"Selected model in CLI: {client.model_in_cli}")
    
    print("\nGenerating response with non-existent model (should use fallback)...")
    try:
        start_time = time.time()
        response = client.generate(test_prompts[0])
        end_time = time.time()
        print(f"Response received in {end_time - start_time:.1f} seconds")
        print(f"\nResponse:\n{response}")
    except Exception as e:
        print(f"\nError getting response: {str(e)}")
        print("This could be due to a timeout or API error.")
    
    # Step 4: Test with whatever model is actually available in API
    if len(client.api_models) > 0:
        first_api_model = list(client.api_models)[0]
        print_separator()
        print(f"STEP 4: Testing with first available API model: {first_api_model}")
        client = OllamaClient(ollama_url, first_api_model, timeout=30)  # Increase timeout to 30 seconds
        
        # Print model availability information
        print(f"API models detected: {', '.join(client.api_models) if client.api_models else 'None'}")
        print(f"CLI models detected: {', '.join(client.cli_models) if client.cli_models else 'None'}")
        print(f"Selected model in API: {client.model_in_api}")
        print(f"Selected model in CLI: {client.model_in_cli}")
        
        print(f"\nGenerating response with {first_api_model}...")
        print("Note: Large models like deepseek-coder:33b may take significantly longer - timeout set to 180 seconds")
        try:
            # Extend timeout for large models like deepseek-coder:33b
            start_time = time.time()
            # Update the client to use a longer timeout for deepseek-coder:33b
            if "deepseek" in first_api_model:
                client.timeout = 180  # Longer timeout for larger models
            response = client.generate(test_prompts[0])
            end_time = time.time()
            print(f"Response received in {end_time - start_time:.1f} seconds")
            print(f"\nResponse:\n{response}")
        except Exception as e:
            print(f"\nError getting response: {str(e)}")
            print("This could be due to a timeout or API error.")
    
    print_separator()
    print("Ollama integration test complete!")

if __name__ == "__main__":
    test_ollama_client()
