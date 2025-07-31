"""
Startup Manager module with robust initialization and fallbacks
for critical system components
"""
import os
import sys
import time
import importlib
import logging
from typing import Dict, Any, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StartupManager:
    """Manages the initialization of all system components with fallbacks"""
    
    def __init__(self):
        self.startup_status = {
            "time": time.time(),
            "components": {},
            "overall_status": "initializing"
        }
        
        # Core components that must be initialized
        self.core_components = [
            "code_execution",
            "health_monitor",
            "file_manager"
        ]
        
        # Optional components
        self.optional_components = [
            "ollama_client",
            "template_manager",
            "database_manager",
            "authentication"
        ]
        
        # Fallback implementations
        self.fallbacks = {
            "code_execution": self._fallback_code_execution,
            "ollama_client": self._fallback_ollama,
            "file_manager": self._fallback_file_manager,
            "database_manager": self._fallback_database,
            "authentication": self._fallback_authentication
        }
    
    def initialize_all(self) -> Dict[str, Any]:
        """Initialize all components with fallbacks"""
        start_time = time.time()
        
        # Initialize core components first
        for component in self.core_components:
            self._initialize_component(component, is_core=True)
        
        # Initialize optional components
        for component in self.optional_components:
            self._initialize_component(component, is_core=False)
        
        # Determine overall status
        core_statuses = [
            self.startup_status["components"].get(component, {}).get("status") 
            for component in self.core_components
        ]
        
        if all(status == "healthy" for status in core_statuses):
            self.startup_status["overall_status"] = "healthy"
        elif all(status in ["healthy", "degraded"] for status in core_statuses):
            self.startup_status["overall_status"] = "degraded"
        else:
            self.startup_status["overall_status"] = "critical"
        
        self.startup_status["initialization_time"] = time.time() - start_time
        return self.startup_status
    
    def _initialize_component(self, component_name: str, is_core: bool = False) -> None:
        """Initialize a single component with fallbacks"""
        logger.info(f"Initializing {component_name}...")
        
        try:
            # Try to import and initialize the component
            module = importlib.import_module(component_name)
            
            # Check if module has an initialize function
            if hasattr(module, "initialize"):
                result = module.initialize()
                status = "healthy"
                message = f"{component_name} initialized successfully"
            else:
                # No explicit initialization needed
                status = "healthy"
                message = f"{component_name} loaded successfully"
            
            self.startup_status["components"][component_name] = {
                "status": status,
                "message": message,
                "time": time.time(),
                "using_fallback": False
            }
            
        except (ImportError, ModuleNotFoundError) as e:
            logger.warning(f"Failed to import {component_name}: {e}")
            
            # Try fallback if available
            if component_name in self.fallbacks:
                try:
                    fallback_result = self.fallbacks[component_name]()
                    self.startup_status["components"][component_name] = {
                        "status": "degraded",
                        "message": f"Using fallback implementation for {component_name}",
                        "error": str(e),
                        "time": time.time(),
                        "using_fallback": True
                    }
                except Exception as fallback_error:
                    self._handle_component_failure(component_name, fallback_error, is_core)
            else:
                self._handle_component_failure(component_name, e, is_core)
                
        except Exception as e:
            logger.error(f"Error initializing {component_name}: {e}")
            
            # Try fallback if available
            if component_name in self.fallbacks:
                try:
                    fallback_result = self.fallbacks[component_name]()
                    self.startup_status["components"][component_name] = {
                        "status": "degraded",
                        "message": f"Using fallback implementation for {component_name}",
                        "error": str(e),
                        "time": time.time(),
                        "using_fallback": True
                    }
                except Exception as fallback_error:
                    self._handle_component_failure(component_name, fallback_error, is_core)
            else:
                self._handle_component_failure(component_name, e, is_core)
    
    def _handle_component_failure(self, component_name: str, error: Exception, is_core: bool) -> None:
        """Handle component initialization failure"""
        error_message = f"Failed to initialize {component_name}: {error}"
        
        if is_core:
            logger.error(f"CRITICAL: Core component {component_name} failed: {error}")
            status = "critical"
        else:
            logger.warning(f"Optional component {component_name} failed: {error}")
            status = "degraded"
        
        self.startup_status["components"][component_name] = {
            "status": status,
            "message": error_message,
            "error": str(error),
            "time": time.time(),
            "using_fallback": False
        }
    
    def _fallback_code_execution(self):
        """Fallback for code execution"""
        logger.info("Setting up fallback code execution")
        
        # Create a simple exec-based code executor
        class SimpleCodeExecutor:
            def execute_code(self, code, language="python"):
                if language != "python":
                    return {
                        "output": "",
                        "error": f"Fallback execution only supports Python, not {language}",
                        "execution_time": 0,
                        "success": False,
                        "method_used": "simple_fallback"
                    }
                
                import io
                from contextlib import redirect_stdout, redirect_stderr
                
                stdout_buffer = io.StringIO()
                stderr_buffer = io.StringIO()
                
                start_time = time.time()
                success = True
                
                try:
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(code, {"__builtins__": __builtins__})
                except Exception as e:
                    stderr_buffer.write(f"Error: {str(e)}")
                    success = False
                
                execution_time = time.time() - start_time
                
                return {
                    "output": stdout_buffer.getvalue(),
                    "error": stderr_buffer.getvalue(),
                    "execution_time": execution_time,
                    "success": success,
                    "method_used": "simple_fallback"
                }
        
        # Add to module namespace
        sys.modules["code_execution"] = type("code_execution", (), {})
        sys.modules["code_execution"].code_executor = SimpleCodeExecutor()
        
        return True
    
    def _fallback_ollama(self):
        """Fallback for Ollama client"""
        logger.info("Setting up fallback Ollama client")
        
        class FallbackOllamaClient:
            def __init__(self, url="http://localhost:11434", model="codellama:instruct", timeout=60):
                """Initialize the fallback Ollama client with default values.
                
                Args:
                    url (str): The base URL for the Ollama API
                    model (str): The model name to use for fallback responses
                    timeout (int): Timeout in seconds for API calls (not used in fallback)
                """
                self.url = url
                self.model = model
                self.timeout = timeout  # Store timeout for API compatibility
                self.backup_responses = {
                    "help": "I can help you write code, explain concepts, or debug issues.",
                    "error": "I'm sorry, but I couldn't process that request.",
                    "code": "```python\ndef hello_world():\n    print('Hello, World!')\n\nhello_world()\n```",
                }
                
            def _check_connection(self):
                return False
                
            def generate(self, prompt):
                return "Sorry, the AI model is currently unavailable. Please try again later."
                
            def _get_fallback_response(self, prompt):
                return "Sorry, the AI model is currently unavailable. Please try again later."
        
        # Add to module namespace
        sys.modules["ollama_client"] = type("ollama_client", (), {})
        sys.modules["ollama_client"].ollama = FallbackOllamaClient()
        # Expose OllamaClient class for direct import
        sys.modules["ollama_client"].OllamaClient = FallbackOllamaClient
        
        return True
    
    def _fallback_file_manager(self):
        """Fallback for file management"""
        logger.info("Setting up fallback file manager")
        
        import json
        import tempfile
        
        class SimpleFileManager:
            def __init__(self):
                self.temp_dir = tempfile.gettempdir()
                self.files = {}
                self.memory_storage = {}
                
            def save_file(self, filename, content):
                self.memory_storage[filename] = content
                return True, f"memory://{filename}"
                
            def load_file(self, filename):
                if filename in self.memory_storage:
                    return True, self.memory_storage[filename]
                return False, f"File {filename} not found"
                
            def list_files(self):
                return list(self.memory_storage.keys())
        
        # Add to module namespace
        sys.modules["file_manager"] = type("file_manager", (), {})
        sys.modules["file_manager"].file_manager = SimpleFileManager()
        
        return True
    
    def _fallback_database(self):
        """Fallback for database manager"""
        logger.info("Setting up fallback database manager")
        
        class InMemoryDatabase:
            def __init__(self):
                self.data = {}
                
            def get(self, collection, key):
                if collection not in self.data or key not in self.data[collection]:
                    return None
                return self.data[collection][key]
                
            def set(self, collection, key, value):
                if collection not in self.data:
                    self.data[collection] = {}
                self.data[collection][key] = value
                return True
                
            def delete(self, collection, key):
                if collection in self.data and key in self.data[collection]:
                    del self.data[collection][key]
                    return True
                return False
                
            def list(self, collection):
                if collection not in self.data:
                    return []
                return list(self.data[collection].keys())
        
        # Add to module namespace
        sys.modules["database_manager"] = type("database_manager", (), {})
        sys.modules["database_manager"].db = InMemoryDatabase()
        
        return True
    
    def _fallback_authentication(self):
        """Fallback for authentication"""
        logger.info("Setting up fallback authentication")
        
        class SimpleAuth:
            def __init__(self):
                self.tokens = {"default": "admin"}
                
            def verify_token(self, token):
                return token in self.tokens.values()
                
            def create_token(self, username):
                import uuid
                token = f"temp_{uuid.uuid4().hex[:12]}"
                self.tokens[username] = token
                return token
                
            def invalidate_token(self, token):
                for key, val in list(self.tokens.items()):
                    if val == token:
                        del self.tokens[key]
                        return True
                return False
        
        # Add to module namespace
        sys.modules["authentication"] = type("authentication", (), {})
        sys.modules["authentication"].auth_service = SimpleAuth()
        
        return True

# Create singleton instance
startup_manager = StartupManager()
