#!/usr/bin/env python3
"""
Direct Ollama test script - bypasses OllamaClient to test raw API and CLI communication.
This script helps isolate whether issues are in the OllamaClient implementation or in the
underlying Ollama server and environment.
"""

import os
import sys
import time
import json
import subprocess
import platform
import requests
from urllib.parse import urlparse

CLI_TIMEOUT = 180  # Increased from 120 to 180 seconds for CLI commands

def check_ollama_version(url="http://localhost:11434"):
    """Check Ollama API version"""
    print(f"Checking Ollama version at {url}...")
    try:
        response = requests.get(f"{url}/api/version", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Ollama server is running. Version: {data.get('version', 'unknown')}")
            return True
        else:
            print(f"❌ Ollama server returned error code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to Ollama server: {str(e)}")
        return False

def check_ollama_models_api(url="http://localhost:11434"):
    """List models available via Ollama API"""
    print(f"\nChecking available models via API at {url}...")
    try:
        response = requests.get(f"{url}/api/tags", timeout=10)
        if response.status_code == 200:
            models = response.json().get('models', [])
            if models:
                print(f"✅ Found {len(models)} models via API:")
                for model in models:
                    print(f"  - {model.get('name', 'unknown')}")
                return [model.get('name') for model in models]
            else:
                print("⚠️ No models found via API")
                return []
        else:
            print(f"❌ API request failed with status code: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error querying API: {str(e)}")
        return []

def check_ollama_models_cli():
    """List models available via Ollama CLI"""
    print("\nChecking available models via CLI...")
    
    commands_to_try = []
    
    in_wsl, system, release = detect_environment()
    if in_wsl:
        print("Since we're in WSL, will try additional Windows host URLs")
        
        # Try to get Windows host IP from route
        try:
            result = subprocess.run(['ip', 'route', 'show'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if 'default via' in line:
                    windows_ip = line.split('via ')[1].split()[0]
                    print(f"Found Windows host IP: {windows_ip} (via default route)")
                    break
        except Exception as e:
            print(f"Could not determine Windows host IP: {e}")
        
        # Get environment variables for more robust path detection
        win_username = os.environ.get("USERNAME", "Shane Holmes")
        win_path = os.environ.get("PATH", "")
        print(f"Using Windows username: {win_username} for path construction")
        print(f"Windows PATH: {win_path[:200]}..." if len(win_path) > 200 else win_path)
        ollama_user_path = f"C:\\Users\\{win_username}\\AppData\\Local\\Programs\\Ollama\\ollama.exe"
    else:
        windows_host_ip = None
        win_username = None
        ollama_user_path = None
    
    # Add appropriate commands based on environment
    if in_wsl:
        commands_to_try.extend([
            ["cmd.exe", "/c", "ollama", "list"],
            ["cmd.exe", "/c", ollama_user_path, "list"],
            ["wsl", "--distribution", "Ubuntu-20.04", "cmd.exe", "/c", ollama_user_path, "list"],
            ["wsl", "--distribution", "Ubuntu", "cmd.exe", "/c", ollama_user_path, "list"],
            ["cmd.exe", "/c", "C:\\Progra~1\\Ollama\\ollama.exe", "list"],  # Short path notation
            ["cmd.exe", "/c", "C:\\ProgramData\\chocolatey\\bin\\ollama.exe", "list"],
            ["cmd.exe", "/c", "where", "ollama"],  # Try to locate ollama in PATH
            ["cmd.exe", "/c", "dir", "C:\\Users\\" + win_username + "\\AppData\\Local\\Programs\\Ollama"],  # Check if directory exists
            ["cmd.exe", "/c", "call", ollama_user_path, "list"],  # Try using call command
            ["bash", "-c", f"cmd.exe /c \"{ollama_user_path}\" list"],  # Escaped quotes
            ["cmd.exe", "/c", "C:\\Users\\" + win_username + "\\AppData\\Local\\Ollama\\ollama.exe", "list"],  # Alternative path
            ["powershell.exe", "-Command", f"& '{{{ollama_user_path}}}' list"],  # Try PowerShell
            ["ollama", "list"]
        ])
    else:
        commands_to_try.append(["ollama", "list"])
    
    for cmd in commands_to_try:
        print(f"Trying: {cmd}")
        try:
            start_time = time.time()
            if isinstance(cmd, str):
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=CLI_TIMEOUT)
            else:
                result = subprocess.run(cmd, shell=False, capture_output=True, text=True, timeout=CLI_TIMEOUT)
            elapsed_time = time.time() - start_time
            if result.returncode == 0 and result.stdout:
                print(f"✅ CLI command successful in {elapsed_time:.2f} seconds")
                print(f"Output: {result.stdout[:200]}..." if len(result.stdout) > 200 else result.stdout)
                models = []
                for line in result.stdout.strip().split("\n"):
                    if line and not line.startswith("NAME") and not "---" in line:
                        parts = line.split()
                        if parts:
                            models.append(parts[0])
                print(f"Found models: {', '.join(models) if models else 'None'}")
                return models
            else:
                print(f"❌ CLI command failed: {result.stderr}")
                print(f"Return code: {result.returncode}")
        except subprocess.TimeoutExpired:
            elapsed_time = time.time() - start_time
            print(f"❌ Error running CLI command: Command '{cmd}' timed out after {elapsed_time:.2f} seconds")
        except Exception as e:
            print(f"❌ Error running CLI command: {str(e)}")
    
    print("❌ All CLI attempts failed")
    return []

def test_api_generation(url="http://localhost:11434", model="codellama:instruct", prompt="Hello, world!"):
    """Test generation via the Ollama API directly"""
    print(f"\nTesting API generation with model '{model}'...")
    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        start_time = time.time()
        response = requests.post(f"{url}/api/generate", json=payload, timeout=30)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            try:
                result = response.json()
                response_text = result.get('response', '')
                print(f"✅ API generation successful in {duration:.2f} seconds")
                print(f"Response: '{response_text[:100]}...' (truncated)")
                return True
            except Exception as e:
                print(f"❌ Error parsing API response: {str(e)}")
                print(f"Raw response: {response.text[:200]}..." if len(response.text) > 200 else response.text)
                return False
        else:
            print(f"❌ API request failed with status code: {response.status_code}")
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error making API request: {str(e)}")
        return False

def test_cli_generation(model="codellama:instruct", prompt="Hello, world!"):
    """Test generation via the Ollama CLI directly"""
    print(f"\nTesting CLI generation with model '{model}'...")
    
    commands_to_try = []
    
    in_wsl, system, release = detect_environment()
    if in_wsl:
        print("Since we're in WSL, will try additional Windows host URLs")
        
        # Try to get Windows host IP from route
        try:
            result = subprocess.run(['ip', 'route', 'show'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if 'default via' in line:
                    windows_ip = line.split('via ')[1].split()[0]
                    print(f"Found Windows host IP: {windows_ip} (via default route)")
                    break
        except Exception as e:
            print(f"Could not determine Windows host IP: {e}")
        
        # Get environment variables for more robust path detection
        win_username = os.environ.get("USERNAME", "Shane Holmes")
        win_path = os.environ.get("PATH", "")
        print(f"Using Windows username: {win_username} for path construction")
        print(f"Windows PATH: {win_path[:200]}..." if len(win_path) > 200 else win_path)
        ollama_user_path = f"C:\\Users\\{win_username}\\AppData\\Local\\Programs\\Ollama\\ollama.exe"
    else:
        windows_host_ip = None
        win_username = None
        ollama_user_path = None
    
    # Properly escape single quotes in the prompt
    escaped_prompt = prompt.replace("'", "'\\''")
    
    # Add appropriate commands based on environment
    if in_wsl:
        commands_to_try.extend([
            ["cmd.exe", "/c", "ollama", "run", model, escaped_prompt],
            ["cmd.exe", "/c", ollama_user_path, "run", model, escaped_prompt],
            ["wsl", "--distribution", "Ubuntu-20.04", "cmd.exe", "/c", ollama_user_path, "run", model, escaped_prompt],
            ["wsl", "--distribution", "Ubuntu", "cmd.exe", "/c", ollama_user_path, "run", model, escaped_prompt],
            ["cmd.exe", "/c", "C:\\Progra~1\\Ollama\\ollama.exe", "run", model, escaped_prompt],  # Short path notation
            ["cmd.exe", "/c", "C:\\ProgramData\\chocolatey\\bin\\ollama.exe", "run", model, escaped_prompt],
            ["cmd.exe", "/c", f"\"C:\\Users\\{win_username}\\AppData\\Local\\Programs\\Ollama\\ollama.exe\"", "run", model, escaped_prompt],
            ["cmd.exe", "/c", "call", ollama_user_path, "run", model, escaped_prompt],  # Try using call command
            ["bash", "-c", f"cmd.exe /c \"{ollama_user_path}\" run {model} \"{escaped_prompt}\""],  # Escaped quotes
            ["cmd.exe", "/c", "C:\\Users\\" + win_username + "\\AppData\\Local\\Ollama\\ollama.exe", "run", model, escaped_prompt],  # Alternative path
            ["powershell.exe", "-Command", f"& '{{{ollama_user_path}}}' run {model} '{{{escaped_prompt}}}'"],  # Try PowerShell
            ["ollama", "run", model, escaped_prompt]
        ])
    else:
        commands_to_try.append(["ollama", "run", model, escaped_prompt])
    
    for cmd in commands_to_try:
        print(f"Trying: {cmd}")
        try:
            start_time = time.time()
            if isinstance(cmd, str):
                result = subprocess.run(cmd, shell=True, text=True, capture_output=True, timeout=CLI_TIMEOUT)
            else:
                result = subprocess.run(cmd, shell=False, text=True, capture_output=True, timeout=CLI_TIMEOUT)
            elapsed_time = time.time() - start_time
            if result.returncode == 0 and result.stdout:
                print(f"✅ CLI generation successful in {elapsed_time:.2f} seconds")
                print(f"Response: '{result.stdout[:200]}...' (truncated)")
                return True
            else:
                print(f"❌ CLI command failed: {result.stderr}")
                print(f"Return code: {result.returncode}")
        except subprocess.TimeoutExpired:
            elapsed_time = time.time() - start_time
            print(f"❌ Error running CLI command: Command '{cmd}' timed out after {elapsed_time:.2f} seconds")
        except Exception as e:
            print(f"❌ Error running CLI command: {str(e)}")
    
    print(f"❌ All CLI generation attempts failed")
    return False

def detect_environment():
    """Detect if we're in WSL and get system information."""
    system = platform.system()
    if system == "Linux" and "microsoft" in platform.release().lower():
        print("Detected: Running in Windows Subsystem for Linux (WSL)")
        return True, system, platform.release()
    else:
        print(f"Detected: Running on {system}")
        return False, system, platform.release()

def main():
    """Main function to run various Ollama diagnostics"""
    print("\n===== OLLAMA DIRECT COMMUNICATION TEST =====\n")
    print(f"System: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version.split()[0]}")
    
    in_wsl, system, release = detect_environment()
    if in_wsl:
        print("Since we're in WSL, will try additional Windows host URLs")
        
        # Try to get Windows host IP from route
        try:
            result = subprocess.run(['ip', 'route', 'show'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if 'default via' in line:
                    windows_ip = line.split('via ')[1].split()[0]
                    print(f"Found Windows host IP: {windows_ip} (via default route)")
                    break
        except Exception as e:
            print(f"Could not determine Windows host IP: {e}")
        
        # Get environment variables for more robust path detection
        win_username = os.environ.get("USERNAME", "Shane Holmes")
        win_path = os.environ.get("PATH", "")
        print(f"Using Windows username: {win_username} for path construction")
        print(f"Windows PATH: {win_path[:200]}..." if len(win_path) > 200 else win_path)
        ollama_user_path = f"C:\\Users\\{win_username}\\AppData\\Local\\Programs\\Ollama\\ollama.exe"
    else:
        windows_host_ip = None
        win_username = None
        ollama_user_path = None
    
    # Define URLs to try
    urls = ["http://localhost:11434"]
    if in_wsl:
        print("Since we're in WSL, will try additional Windows host URLs")
        
        # Try to get Windows host IP from route
        try:
            result = subprocess.run(['ip', 'route', 'show'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if 'default via' in line:
                    windows_ip = line.split('via ')[1].split()[0]
                    print(f"Found Windows host IP: {windows_ip} (via default route)")
                    urls.insert(0, f"http://{windows_ip}:11434")
                    break
        except Exception as e:
            print(f"Could not determine Windows host IP: {e}")
        
        # Add common Windows host addresses
        urls = [
            "http://host.docker.internal:11434",
            "http://172.17.0.1:11434",
            "http://172.29.112.1:11434",
        ] + urls
    
    # Check server status with first working URL
    working_url = None
    for url in urls:
        print(f"\nTrying URL: {url}")
        if check_ollama_version(url):
            working_url = url
            print(f"✅ Found working Ollama server at {url}")
            break
    
    if not working_url:
        print("❌ Could not connect to any Ollama server")
        return
    
    # List available models
    api_models = check_ollama_models_api(working_url)
    cli_models = check_ollama_models_cli()
    
    # Compare API and CLI model lists
    if api_models and cli_models:
        print("\n--- API vs CLI Model Comparison ---")
        api_set = set(api_models)
        cli_set = set(cli_models)
        
        if api_set == cli_set:
            print("✅ API and CLI model lists match perfectly")
        else:
            print("⚠️ API and CLI model lists differ:")
            api_only = api_set - cli_set
            cli_only = cli_set - api_set
            
            if api_only:
                print(f"Models in API only: {', '.join(api_only)}")
            
            if cli_only:
                print(f"Models in CLI only: {', '.join(cli_only)}")
    
    # Test model generation
    print("\n--- Testing Model Generation ---")
    test_prompt = "Write a hello world function in Python"
    
    # Try both API and CLI for each available model
    all_models = list(set(api_models + cli_models))
    
    if not all_models:
        print("❌ No models available to test")
        return
    
    for model in all_models:
        print(f"\n=== Testing model: {model} ===")
        api_success = test_api_generation(working_url, model, test_prompt)
        cli_success = test_cli_generation(model, test_prompt)
        
        if api_success and cli_success:
            print(f"✅ Model {model} works perfectly with both API and CLI")
        elif api_success:
            print(f"⚠️ Model {model} works with API but not CLI")
        elif cli_success:
            print(f"⚠️ Model {model} works with CLI but not API")
        else:
            print(f"❌ Model {model} does not work with either API or CLI")

if __name__ == "__main__":
    main()
