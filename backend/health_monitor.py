import os
import time
import logging
import requests
import docker
import sqlite3
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HealthMonitor:
    """Health monitoring service with comprehensive fallback mechanisms"""
    
    def __init__(self):
        """Initialize health monitor with configuration from environment"""
        # Ollama settings
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "codellama:instruct")
        self.ollama_timeout = int(os.getenv("OLLAMA_TIMEOUT", "5"))
        
        # Docker settings
        self.docker_timeout = int(os.getenv("DOCKER_TIMEOUT", "5"))
        
        # Database settings
        self.db_type = os.getenv("DB_TYPE", "sqlite")
        self.db_path = os.getenv("DB_PATH", "data/coder.db")
        self.json_db_path = os.getenv("JSON_DB_PATH", "data/db.json")
        
        # Cache settings
        self.cache_ttl = int(os.getenv("HEALTH_CACHE_TTL", "30"))
        self.cache = {}
    
    def check_health(self) -> Dict[str, Any]:
        """
        Check health of all system components with fallbacks
        
        Returns:
            Dict with status of each component and overall system health
        """
        # Check if we can return cached result
        if self._check_cache("health"):
            return self.cache["health"]["data"]
        
        # Start health check
        start_time = time.time()
        
        health_data = {
            "status": "healthy",
            "timestamp": time.time(),
            "checks": {}
        }
        
        # Check individual components
        ollama_status = self._check_ollama()
        docker_status = self._check_docker()
        database_status = self._check_database()
        
        # Add component status to response
        health_data["checks"]["ollama"] = ollama_status
        health_data["checks"]["docker"] = docker_status
        health_data["checks"]["database"] = database_status
        
        # Format for frontend
        health_data["ollama_status"] = ollama_status["status"]
        health_data["docker_status"] = docker_status["status"]
        health_data["database_status"] = database_status["status"]
        
        # Determine overall status (healthy only if all components are healthy)
        all_healthy = all(
            check["status"] == "healthy" 
            for check in health_data["checks"].values()
        )
        
        if not all_healthy:
            health_data["status"] = "degraded"
        
        # Add timing information
        health_data["response_time"] = time.time() - start_time
        
        # Cache the result
        self._cache_result("health", health_data)
        
        return health_data
    
    def _check_ollama(self) -> Dict[str, Any]:
        """Check Ollama service health with fallbacks"""
        try:
            # Try to get Ollama models list as health check
            response = requests.get(
                f"{self.ollama_url}/api/tags",
                timeout=self.ollama_timeout
            )
            
            if response.status_code == 200:
                models = response.json().get("models", [])
                has_model = any(model["name"] == self.ollama_model for model in models) if models else False
                
                if has_model:
                    return {
                        "status": "healthy",
                        "message": f"Ollama is running with model {self.ollama_model}",
                        "has_model": True
                    }
                else:
                    return {
                        "status": "degraded",
                        "message": f"Ollama is running but model {self.ollama_model} is not available",
                        "has_model": False,
                        "fallback": "Using fallback responses for AI features"
                    }
            else:
                return {
                    "status": "degraded",
                    "message": f"Ollama returned status code {response.status_code}",
                    "has_model": False,
                    "fallback": "Using fallback responses for AI features"
                }
        except requests.exceptions.ConnectionError:
            logger.warning("Ollama connection error")
            return {
                "status": "offline",
                "message": "Cannot connect to Ollama service",
                "has_model": False,
                "fallback": "Using static responses for AI features"
            }
        except requests.exceptions.Timeout:
            logger.warning("Ollama request timeout")
            return {
                "status": "degraded",
                "message": "Ollama request timed out",
                "has_model": False,
                "fallback": "Using fallback responses for AI features"
            }
        except Exception as e:
            logger.error(f"Unexpected error checking Ollama: {e}")
            return {
                "status": "error",
                "message": f"Error checking Ollama: {str(e)}",
                "has_model": False,
                "fallback": "Using static responses for AI features"
            }
    
    def _check_docker(self) -> Dict[str, Any]:
        """Check Docker service health with fallbacks"""
        # Check if Docker is actually needed
        docker_enabled = os.getenv("ENABLE_DOCKER", "False").lower() == "true"
        
        if not docker_enabled:
            # If Docker isn't required, don't report it as an error
            return {
                "status": "healthy",
                "message": "Docker integration is disabled",
                "disabled": True
            }
            
        try:
            # Try to connect to Docker
            client = docker.from_env(timeout=self.docker_timeout)
            version = client.version()
            
            return {
                "status": "healthy",
                "message": f"Docker is running (v{version.get('Version', 'unknown')})",
                "version": version.get("Version")
            }
        except docker.errors.DockerException as e:
            logger.warning(f"Docker error: {e}")
            return {
                "status": "offline",
                "message": "Docker service is not available",
                "fallback": "Code execution will fall back to local mode"
            }
        except Exception as e:
            logger.error(f"Unexpected error checking Docker: {e}")
            return {
                "status": "error",
                "message": f"Error checking Docker: {str(e)}",
                "fallback": "Code execution will fall back to local mode"
            }
    
    def _check_database(self) -> Dict[str, Any]:
        """Check database health with fallbacks"""
        if self.db_type == "sqlite":
            try:
                # Ensure directory exists
                db_dir = os.path.dirname(self.db_path)
                if not os.path.exists(db_dir):
                    try:
                        os.makedirs(db_dir, exist_ok=True)
                        logger.info(f"Created database directory: {db_dir}")
                    except Exception as e:
                        logger.error(f"Failed to create database directory: {e}")
                        # Will continue and likely fail, but we tried
                
                # Try to connect to SQLite
                conn = sqlite3.connect(self.db_path, timeout=self.docker_timeout)
                cursor = conn.cursor()
                cursor.execute("SELECT sqlite_version();")
                version = cursor.fetchone()[0]
                
                # Create basic tables if they don't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS chat_history (
                        id INTEGER PRIMARY KEY,
                        timestamp REAL,
                        prompt TEXT,
                        response TEXT
                    )
                """)
                conn.commit()
                conn.close()
                
                return {
                    "status": "healthy",
                    "message": f"SQLite database is available (v{version})",
                    "type": "sqlite",
                    "version": version
                }
            except sqlite3.Error as e:
                logger.warning(f"SQLite error: {e}")
                
                # Try in-memory SQLite as first fallback
                try:
                    conn = sqlite3.connect(":memory:")
                    cursor = conn.cursor()
                    cursor.execute("SELECT sqlite_version();")
                    version = cursor.fetchone()[0]
                    conn.close()
                    
                    return {
                        "status": "degraded",
                        "message": "Using in-memory SQLite database",
                        "type": "sqlite_memory",
                        "fallback": "Database changes will not be persisted"
                    }
                except sqlite3.Error:
                    # Continue to next fallback
                    pass
                
                # Check if JSON fallback is available
                json_dir = os.path.dirname(self.json_db_path)
                if not os.path.exists(json_dir):
                    try:
                        os.makedirs(json_dir, exist_ok=True)
                    except Exception:
                        pass
                        
                try:
                    # Try to create/access JSON file
                    with open(self.json_db_path, 'a+') as f:
                        pass  # Just testing if we can open it
                        
                    return {
                        "status": "degraded",
                        "message": "SQLite database error, using JSON fallback",
                        "type": "json",
                        "fallback": "Using JSON file database for storage"
                    }
                except Exception:
                    return {
                        "status": "error",
                        "message": "Database is not available",
                        "fallback": "Using in-memory storage with filesystem backup"
                    }
            except Exception as e:
                logger.error(f"Unexpected database error: {e}")
                return {
                    "status": "error",
                    "message": f"Error checking database: {str(e)}",
                    "fallback": "Using filesystem storage as fallback"
                }
        else:
            # JSON database
            if os.path.exists(self.json_db_path):
                return {
                    "status": "healthy",
                    "message": "JSON file database is available",
                    "type": "json"
                }
            else:
                return {
                    "status": "degraded",
                    "message": "JSON file database does not exist yet",
                    "type": "json",
                    "fallback": "New database will be created on first use"
                }
    
    def _check_cache(self, key: str) -> bool:
        """Check if cache entry is valid"""
        if key not in self.cache:
            return False
        
        cache_entry = self.cache[key]
        if time.time() - cache_entry["timestamp"] < self.cache_ttl:
            return True
        
        return False
        
    def check_all_systems(self):
        """Comprehensive health check for all system components with multiple fallbacks"""
        try:
            # Start with basic health check
            health_data = self.check_health()
            
            # Check code execution capability
            code_exec_status = self._check_code_execution()
            health_data["checks"]["code_execution"] = code_exec_status
            
            # Check file system access
            fs_status = self._check_filesystem()
            health_data["checks"]["filesystem"] = fs_status
            
            # Additional system metrics
            health_data["language"] = "python"  # Default language
            
            # Enhanced status determination logic
            critical_services = ["code_execution", "filesystem"]
            critical_healthy = all(
                health_data["checks"].get(service, {}).get("status") in ["healthy", "degraded"]
                for service in critical_services
                if service in health_data["checks"]
            )
            
            # Only mark as healthy if critical services are working
            if critical_healthy:
                if health_data["status"] == "degraded":
                    # Keep as degraded if some services are degraded
                    pass
                else:
                    health_data["status"] = "healthy"
            else:
                health_data["status"] = "critical"
            
            return health_data
        except Exception as e:
            logger.error(f"Critical error in health check: {e}")
            # Ultimate fallback - minimal health response
            return {
                "status": "degraded",  # Use degraded instead of critical to allow frontend operation
                "ollama_status": "unknown",
                "docker_status": "unknown",
                "database_status": "unknown",
                "timestamp": time.time(),
                "response_time": 0.0,
                "language": "python",
                "message": "System operational with limited features"
            }
            
    def _check_code_execution(self) -> Dict[str, Any]:
        """Check if code execution is working with multiple fallbacks"""
        try:
            # Try to import our code execution module
            import code_execution
            
            # Execute simple test code
            test_code = "print('health_check_test')"
            result = code_execution.code_executor.execute_code(test_code)
            
            if result.success:
                return {
                    "status": "healthy",
                    "message": f"Code execution working ({result.method_used})",
                    "method": result.method_used
                }
            else:
                # Try alternative execution methods
                return {
                    "status": "degraded",
                    "message": "Primary code execution failed, fallbacks available",
                    "error": result.error,
                    "fallback": "Alternative execution methods will be used"
                }
        except ImportError:
            logger.warning("Code execution module not available")
            return {
                "status": "degraded",
                "message": "Code execution module not available",
                "fallback": "Using built-in Python exec as fallback"
            }
        except Exception as e:
            logger.error(f"Code execution check error: {e}")
            return {
                "status": "error",
                "message": f"Code execution error: {str(e)}",
                "fallback": "Code will be displayed without execution"
            }
            
    def _check_filesystem(self) -> Dict[str, Any]:
        """Check filesystem access with fallbacks"""
        try:
            # Check temp directory access
            import tempfile
            temp_dir = tempfile.gettempdir()
            test_file = os.path.join(temp_dir, f"health_check_{time.time()}.txt")
            
            # Test write access
            with open(test_file, 'w') as f:
                f.write('health check')
                
            # Test read access
            with open(test_file, 'r') as f:
                content = f.read()
                
            # Clean up
            os.remove(test_file)
            
            if content == 'health check':
                return {
                    "status": "healthy",
                    "message": "Filesystem access is working"
                }
            else:
                return {
                    "status": "degraded",
                    "message": "Filesystem read/write inconsistency",
                    "fallback": "Using in-memory storage with periodic sync"
                }
        except PermissionError:
            logger.warning("Filesystem permission error")
            return {
                "status": "degraded",
                "message": "Filesystem permission issues",
                "fallback": "Using restricted file access paths"
            }
        except Exception as e:
            logger.error(f"Filesystem check error: {e}")
            return {
                "status": "error",
                "message": f"Filesystem error: {str(e)}",
                "fallback": "Using in-memory storage only"
            }
    
    def _cache_result(self, key: str, data: Dict[str, Any]) -> None:
        """Cache a result with timestamp"""
        self.cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

# Singleton instance
health_monitor = HealthMonitor()
