"""
Enhanced health monitoring service with comprehensive fallback mechanisms.
"""
import os
import time
import logging
import requests
import socket
import psutil
import json
import sqlite3
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import threading

# Conditional imports for database backends
try:
    import sqlite3
    SQLITE_AVAILABLE = True
except ImportError:
    SQLITE_AVAILABLE = False
    logging.warning("sqlite3 module not available. SQLite support will be disabled.")

try:
    import psycopg2
    from psycopg2 import pool
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    logging.warning("psycopg2 not available. PostgreSQL support will be disabled.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

@dataclass
class HealthCheckResult:
    """Result of a health check."""
    status: HealthStatus
    message: str = ""
    details: Dict[str, Any] = None
    timestamp: float = None
    response_time: float = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "status": self.status.value,
            "message": self.message,
            "timestamp": self.timestamp or time.time(),
        }
        
        if self.response_time is not None:
            result["response_time"] = self.response_time
        
        if self.details:
            result["details"] = self.details
            
        return result

class HealthService:
    """
    Enhanced health monitoring service with comprehensive fallback mechanisms.
    
    Features:
    - Multiple fallback endpoints for each service
    - Circuit breakers to prevent cascading failures
    - Caching to reduce load on dependencies
    - Timeout handling with exponential backoff
    - Detailed diagnostics and metrics
    - Graceful degradation
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the health service with configuration."""
        self.config = self._load_config(config)
        self.circuit_breakers = {}
        self.cache = {}
        self.lock = threading.RLock()
        self.metrics = {
            "successful_checks": 0,
            "failed_checks": 0,
            "circuit_breaker_trips": 0,
            "fallbacks_used": 0,
        }
        
        # Initialize circuit breakers for each service
        for service in self.config["services"].keys():
            self.circuit_breakers[service] = {
                "state": "closed",  # closed, open, half-open
                "failure_count": 0,
                "last_failure": None,
                "last_success": None,
                "trip_time": None
            }
    
    def _load_config(self, config: Optional[Dict] = None) -> Dict:
        """Load configuration with defaults."""
        default_config = {
            "cache_ttl": 30,  # seconds
            "circuit_breaker": {
                "failure_threshold": 3,
                "reset_timeout": 60,  # seconds
                "half_open_max_attempts": 2
            },
            "timeouts": {
                "default": 5,  # seconds
                "ollama": 10,
                "database": 5,
                "filesystem": 10,
                "network": 5
            },
            "retry": {
                "max_attempts": 3,
                "backoff_factor": 0.5  # seconds
            },
            "services": {
                "ollama": {
                    "endpoints": [
                        "http://localhost:11434",
                        "http://127.0.0.1:11434",
                        "http://172.28.112.1:11434"  # WSL host IP
                    ],
                    "health_path": "/api/tags",
                    "required_models": ["codellama:instruct"],
                    "timeout": 10
                },
                "database": {
                    "types": ["postgres", "sqlite", "json"],
                    "paths": {
                        "sqlite": "data/coder.db",
                        "json": "data/db.json"
                    },
                    "timeout": 5
                },
                "filesystem": {
                    "required_paths": ["data", "projects"],
                    "min_free_space": 100 * 1024 * 1024,  # 100MB
                    "timeout": 5
                },
                "network": {
                    "check_urls": [
                        "https://api.openai.com/v1/models",
                        "https://huggingface.co"
                    ],
                    "timeout": 5
                }
            }
        }
        
        # Merge with provided config
        if config:
            self._deep_update(default_config, config)
            
        return default_config
    
    def _deep_update(self, target: Dict, source: Dict) -> None:
        """Deep update a dictionary."""
        for key, value in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                self._deep_update(target[key], value)
            else:
                target[key] = value
    
    def check_system_health(self) -> Dict[str, Any]:
        """
        Check the health of all system components with fallbacks.
        
        Returns:
            Dict with status of each component and overall system health.
        """
        start_time = time.time()
        
        # Check if we can use cached results
        cached_result = self._get_cached_result("system_health")
        if cached_result:
            return cached_result
        
        # Initialize result structure
        result = {
            "status": HealthStatus.HEALTHY.value,
            "timestamp": datetime.utcnow().isoformat(),
            "components": {},
            "metrics": self.metrics.copy()
        }
        
        # Check each service
        services_healthy = True
        
        # Check Ollama service
        ollama_result = self.check_ollama_health()
        result["components"]["ollama"] = ollama_result.to_dict()
        
        # Check database
        db_result = self.check_database_health()
        result["components"]["database"] = db_result.to_dict()
        
        # Check filesystem
        fs_result = self.check_filesystem_health()
        result["components"]["filesystem"] = fs_result.to_dict()
        
        # Check network connectivity
        net_result = self.check_network_health()
        result["components"]["network"] = net_result.to_dict()
        
        # Check system resources
        sys_result = self.check_system_resources()
        result["components"]["system"] = sys_result.to_dict()
        
        # Determine overall status
        component_statuses = [
            ollama_result.status,
            db_result.status,
            fs_result.status,
            net_result.status,
            sys_result.status
        ]
        
        if HealthStatus.UNHEALTHY in component_statuses:
            result["status"] = HealthStatus.DEGRADED.value
        
        # Add timing information
        result["response_time"] = time.time() - start_time
        
        # Cache the result
        self._cache_result("system_health", result)
        
        return result
    
    def check_ollama_health(self) -> HealthCheckResult:
        """Check the health of the Ollama service with fallbacks."""
        start_time = time.time()
        config = self.config["services"]["ollama"]
        
        # Check circuit breaker first
        if not self._is_circuit_closed("ollama"):
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                message="Circuit breaker is open",
                response_time=time.time() - start_time
            )
        
        # Try each endpoint
        for endpoint in config["endpoints"]:
            try:
                url = f"{endpoint.rstrip('/')}{config['health_path']}"
                response = requests.get(
                    url,
                    timeout=config.get("timeout", self.config["timeouts"]["ollama"])
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if required models are available
                    missing_models = [
                        model for model in config["required_models"]
                        if not any(m["name"] == model for m in data.get("models", []))
                    ]
                    
                    if missing_models:
                        msg = f"Missing required models: {', '.join(missing_models)}"
                        return HealthCheckResult(
                            status=HealthStatus.DEGRADED,
                            message=msg,
                            details={"missing_models": missing_models},
                            response_time=time.time() - start_time
                        )
                    
                    # Success
                    self._record_success("ollama")
                    return HealthCheckResult(
                        status=HealthStatus.HEALTHY,
                        message="Ollama service is healthy",
                        details={"models": [m["name"] for m in data.get("models", [])]},
                        response_time=time.time() - start_time
                    )
                
            except requests.RequestException as e:
                logger.warning(f"Ollama health check failed for {endpoint}: {str(e)}")
                continue
        
        # All endpoints failed
        self._record_failure("ollama")
        return HealthCheckResult(
            status=HealthStatus.UNHEALTHY,
            message="All Ollama endpoints are unreachable",
            response_time=time.time() - start_time
        )
    
    def check_database_health(self) -> HealthCheckResult:
        """Check the health of the database with fallbacks."""
        start_time = time.time()
        config = self.config["services"]["database"]
        
        # Try each database type in order of preference
        for db_type in config["types"]:
            try:
                if db_type == "postgres" and POSTGRES_AVAILABLE:
                    try:
                        # Check PostgreSQL connection
                        conn = psycopg2.connect(
                            host=os.getenv("DB_HOST", "localhost"),
                            port=os.getenv("DB_PORT", "5432"),
                            dbname=os.getenv("DB_NAME", "coder"),
                            user=os.getenv("DB_USER", "postgres"),
                            password=os.getenv("DB_PASSWORD", "")
                        )
                        with conn.cursor() as cursor:
                            cursor.execute("SELECT 1")
                            if cursor.fetchone()[0] == 1:
                                return HealthCheckResult(
                                    status=HealthStatus.HEALTHY,
                                    message="PostgreSQL database is accessible",
                                    response_time=time.time() - start_time
                                )
                    except Exception as e:
                        logger.warning(f"PostgreSQL health check failed: {str(e)}")
                        continue
                        
                elif db_type == "sqlite" and SQLITE_AVAILABLE:
                    try:
                        # Check SQLite database
                        db_path = config["paths"].get("sqlite", "data/coder.db")
                        if not os.path.exists(os.path.dirname(db_path)):
                            os.makedirs(os.path.dirname(db_path), exist_ok=True)
                            
                        # Try to connect and run a simple query
                        with sqlite3.connect(db_path) as conn:
                            cursor = conn.cursor()
                            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                            tables = cursor.fetchall()
                            
                            return HealthCheckResult(
                                status=HealthStatus.HEALTHY,
                                message="SQLite database is accessible",
                                details={"tables": [t[0] for t in tables] if tables else []},
                                response_time=time.time() - start_time
                            )
                    except Exception as e:
                        logger.warning(f"SQLite health check failed: {str(e)}")
                        continue
                
                elif db_type == "json":
                    # Check JSON database
                    json_path = config["paths"].get("json")
                    if not os.path.exists(json_path):
                        continue
                        
                    # Try to read the JSON file
                    with open(json_path, 'r') as f:
                        data = json.load(f)
                        
                    return HealthCheckResult(
                        status=HealthStatus.HEALTHY,
                        message="JSON database is accessible",
                        details={"keys": list(data.keys())},
                        response_time=time.time() - start_time
                    )
                    
            except Exception as e:
                logger.warning(f"Database health check failed for {db_type}: {str(e)}")
                continue
        
        # All database types failed
        return HealthCheckResult(
            status=HealthStatus.UNHEALTHY,
            message="All database backends are unavailable",
            response_time=time.time() - start_time
        )
    
    def check_filesystem_health(self) -> HealthCheckResult:
        """Check filesystem health and available space."""
        start_time = time.time()
        config = self.config["services"]["filesystem"]
        
        try:
            # Check required paths
            missing_paths = []
            accessible_paths = []
            
            for path in config["required_paths"]:
                if os.path.exists(path) and os.access(path, os.W_OK):
                    accessible_paths.append(path)
                else:
                    missing_paths.append(path)
            
            # Check disk space
            disk_usage = psutil.disk_usage("/")
            free_space = disk_usage.free
            min_space = config.get("min_free_space", 100 * 1024 * 1024)  # 100MB default
            
            if missing_paths:
                return HealthCheckResult(
                    status=HealthStatus.DEGRADED,
                    message=f"Missing or inaccessible paths: {', '.join(missing_paths)}",
                    details={
                        "accessible_paths": accessible_paths,
                        "missing_paths": missing_paths,
                        "free_space": free_space
                    },
                    response_time=time.time() - start_time
                )
            
            if free_space < min_space:
                return HealthCheckResult(
                    status=HealthStatus.DEGRADED,
                    message=f"Low disk space: {free_space / (1024*1024):.1f}MB free",
                    details={
                        "free_space": free_space,
                        "min_required_space": min_space,
                        "total_space": disk_usage.total
                    },
                    response_time=time.time() - start_time
                )
            
            return HealthCheckResult(
                status=HealthStatus.HEALTHY,
                message="Filesystem is healthy",
                details={
                    "accessible_paths": accessible_paths,
                    "free_space": free_space,
                    "total_space": disk_usage.total
                },
                response_time=time.time() - start_time
            )
            
        except Exception as e:
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                message=f"Filesystem check failed: {str(e)}",
                response_time=time.time() - start_time
            )
    
    def check_network_health(self) -> HealthCheckResult:
        """Check network connectivity to external services."""
        start_time = time.time()
        config = self.config["services"]["network"]
        
        failed_urls = []
        successful_urls = []
        
        for url in config["check_urls"]:
            try:
                response = requests.head(
                    url,
                    timeout=config.get("timeout", self.config["timeouts"]["network"])
                )
                if response.status_code < 400:
                    successful_urls.append(url)
                else:
                    failed_urls.append((url, f"HTTP {response.status_code}"))
            except Exception as e:
                failed_urls.append((url, str(e)))
        
        if not successful_urls:
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                message="All external services are unreachable",
                details={"failed_checks": failed_urls},
                response_time=time.time() - start_time
            )
        
        if failed_urls:
            return HealthCheckResult(
                status=HealthStatus.DEGRADED,
                message=f"Some external services are unreachable: {len(failed_urls)} failed",
                details={
                    "successful_checks": successful_urls,
                    "failed_checks": failed_urls
                },
                response_time=time.time() - start_time
            )
        
        return HealthCheckResult(
            status=HealthStatus.HEALTHY,
            message="All external services are reachable",
            details={"checked_urls": successful_urls},
            response_time=time.time() - start_time
        )
    
    def check_system_resources(self) -> HealthCheckResult:
        """Check system resource usage."""
        start_time = time.time()
        
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.5)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk I/O
            disk_io = psutil.disk_io_counters()
            
            # Network I/O
            net_io = psutil.net_io_counters()
            
            details = {
                "cpu": {
                    "percent_used": cpu_percent,
                    "cores": psutil.cpu_count(logical=False),
                    "logical_cores": psutil.cpu_count()
                },
                "memory": {
                    "percent_used": memory_percent,
                    "total_gb": memory.total / (1024**3),
                    "available_gb": memory.available / (1024**3),
                    "used_gb": memory.used / (1024**3)
                },
                "disk_io": {
                    "read_count": disk_io.read_count,
                    "write_count": disk_io.write_count,
                    "read_mb": disk_io.read_bytes / (1024**2),
                    "write_mb": disk_io.write_bytes / (1024**2)
                },
                "network_io": {
                    "bytes_sent_mb": net_io.bytes_sent / (1024**2),
                    "bytes_recv_mb": net_io.bytes_recv / (1024**2),
                    "packets_sent": net_io.packets_sent,
                    "packets_recv": net_io.packets_recv
                }
            }
            
            # Determine status based on resource usage
            status = HealthStatus.HEALTHY
            message = "System resources are normal"
            
            if cpu_percent > 90 or memory_percent > 90:
                status = HealthStatus.DEGRADED
                message = "High system resource usage"
            
            return HealthCheckResult(
                status=status,
                message=message,
                details=details,
                response_time=time.time() - start_time
            )
            
        except Exception as e:
            return HealthCheckResult(
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check system resources: {str(e)}",
                response_time=time.time() - start_time
            )
    
    def _is_circuit_closed(self, service: str) -> bool:
        """Check if the circuit breaker is closed for a service."""
        with self.lock:
            cb = self.circuit_breakers[service]
            
            if cb["state"] == "closed":
                return True
                
            if cb["state"] == "open":
                # Check if reset timeout has passed
                reset_timeout = self.config["circuit_breaker"]["reset_timeout"]
                if time.time() - cb["trip_time"] > reset_timeout:
                    # Move to half-open state
                    cb["state"] = "half-open"
                    cb["failure_count"] = 0
                    return True
                return False
                
            if cb["state"] == "half-open":
                # Allow a limited number of attempts
                if cb["failure_count"] < self.config["circuit_breaker"]["half_open_max_attempts"]:
                    return True
                return False
            
            return True
    
    def _record_success(self, service: str) -> None:
        """Record a successful operation for a service."""
        with self.lock:
            cb = self.circuit_breakers[service]
            
            if cb["state"] == "half-open":
                # Success in half-open state, close the circuit
                cb["state"] = "closed"
                cb["failure_count"] = 0
                cb["last_success"] = time.time()
                
            elif cb["state"] == "closed":
                cb["last_success"] = time.time()
    
    def _record_failure(self, service: str) -> None:
        """Record a failed operation for a service."""
        with self.lock:
            cb = self.circuit_breakers[service]
            cb["failure_count"] += 1
            cb["last_failure"] = time.time()
            
            if cb["state"] == "half-open":
                # Failure in half-open state, reopen the circuit
                cb["state"] = "open"
                cb["trip_time"] = time.time()
                self.metrics["circuit_breaker_trips"] += 1
                
            elif cb["state"] == "closed":
                # Check if we've exceeded the failure threshold
                if cb["failure_count"] >= self.config["circuit_breaker"]["failure_threshold"]:
                    cb["state"] = "open"
                    cb["trip_time"] = time.time()
                    self.metrics["circuit_breaker_trips"] += 1
    
    def _get_cached_result(self, key: str) -> Optional[Dict]:
        """Get a cached health check result."""
        with self.lock:
            if key in self.cache:
                cached = self.cache[key]
                if time.time() - cached["timestamp"] < self.config["cache_ttl"]:
                    return cached["data"]
        return None
    
    def _cache_result(self, key: str, data: Dict) -> None:
        """Cache a health check result."""
        with self.lock:
            self.cache[key] = {
                "data": data,
                "timestamp": time.time()
            }

# Singleton instance
health_service = HealthService()
