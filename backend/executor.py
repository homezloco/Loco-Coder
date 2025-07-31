# /project-root/backend/executor.py

import docker
import uuid
import os
import tempfile
import logging
import shutil
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback execution methods if Docker isn't available
def execute_python_locally(code: str) -> str:
    """Execute Python code locally as a fallback when Docker isn't available"""
    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "script.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)
        
        try:
            result = subprocess.run(
                ["python", script_path],
                capture_output=True,
                text=True,
                timeout=15  # 15 second timeout for safety
            )
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error (Exit code {result.returncode}):\n{result.stderr}"
        except subprocess.TimeoutExpired:
            return "Execution timed out (15 seconds)"
        except Exception as e:
            return f"Local execution error: {str(e)}"

def execute_javascript_locally(code: str) -> str:
    """Execute JavaScript code locally using Node.js as a fallback"""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = os.path.join(tmpdir, "script.js")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)
            
            result = subprocess.run(
                ["node", script_path],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error (Exit code {result.returncode}):\n{result.stderr}"
    except FileNotFoundError:
        return "Node.js not found. Please install Node.js to run JavaScript code locally."
    except subprocess.TimeoutExpired:
        return "Execution timed out (15 seconds)"
    except Exception as e:
        return f"Local execution error: {str(e)}"

# Main execution function with Docker
def run_code(code: str, language: str = "python") -> str:
    """
    Run code in a Docker container with appropriate language runtime.
    Falls back to local execution if Docker is unavailable.
    """
    # Select Docker image based on language
    if language.lower() == "python":
        image = "python:3.10-slim"
        filename = "script.py"
        cmd = f"python {filename}"
    elif language.lower() in ("javascript", "js", "node"):
        image = "node:16-alpine"
        filename = "script.js" 
        cmd = f"node {filename}"
    else:
        return f"Unsupported language: {language}. Currently supported: python, javascript"
    
    # Try Docker execution first
    try:
        client = docker.from_env()
        
        # Check if Docker is running by listing containers
        client.containers.list(limit=1)
        
        # Use isolated temporary directory for thread safety
        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = os.path.join(tmpdir, filename)
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)
            
            try:
                # Constrain resources: limit memory and CPU
                output = client.containers.run(
                    image,
                    cmd,
                    name=f"exec_{uuid.uuid4().hex[:8]}",
                    volumes={tmpdir: {'bind': '/workspace', 'mode': 'rw'}},
                    working_dir="/workspace",
                    remove=True,
                    stdout=True,
                    stderr=True,
                    mem_limit='256m',      # limit memory to prevent abuse
                    cpu_quota=50000,       # limit to 50% of single CPU core
                    network_mode="none",   # No network access for security
                    timeout=30             # 30 second timeout
                )
                return output.decode('utf-8')
            except docker.errors.ContainerError as e:
                return e.stderr.decode('utf-8')
            except docker.errors.ImageNotFound:
                return f"Docker image '{image}' not found. Please pull it first with 'docker pull {image}'"
            except Exception as e:
                return f"Docker execution error: {e}"
    except (docker.errors.DockerException, docker.errors.APIError) as e:
        logger.warning(f"Docker unavailable: {e}. Falling back to local execution")
        
        # Fallback to local execution if Docker isn't available
        if language.lower() == "python":
            return execute_python_locally(code)
        elif language.lower() in ("javascript", "js", "node"):
            return execute_javascript_locally(code)
        else:
            return f"Unsupported language: {language} and Docker is unavailable for execution"
