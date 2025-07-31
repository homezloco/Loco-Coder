"""
FastAPI health check endpoints for the Coder AI Platform.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import time
import logging
import os

from health_service import health_service, HealthStatus, HealthCheckResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/health",
    tags=["health"],
    responses={404: {"description": "Not found"}},
)

# Cache for health check results
health_cache = {}
CACHE_TTL = 30  # seconds

@router.get("", response_model=Dict[str, Any])
async def get_health() -> Dict[str, Any]:
    """
    Get the health status of the entire system.
    
    Returns:
        Dict containing health status of all components and overall system status.
    """
    try:
        # Check cache first
        cache_key = "health_summary"
        cached_result = health_service._get_cached_result(cache_key)
        if cached_result:
            return cached_result
        
        # Get fresh health status
        health_data = health_service.check_system_health()
        
        # Add version information
        health_data["version"] = {
            "api": os.getenv("APP_VERSION", "dev"),
            "python": "3.12.0"  # TODO: Get actual Python version
        }
        
        # Add timestamps
        health_data["timestamp"] = time.time()
        health_data["time"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        # Cache the result
        health_service._cache_result(cache_key, health_data)
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": HealthStatus.UNHEALTHY.value,
            "error": str(e),
            "timestamp": time.time(),
            "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

@router.get("/liveness")
async def liveness_probe() -> Dict[str, str]:
    """
    Kubernetes liveness probe endpoint.
    
    Returns:
        Simple status indicating if the service is alive.
    """
    return {"status": "alive"}

@router.get("/readiness")
async def readiness_probe() -> Dict[str, str]:
    """
    Kubernetes readiness probe endpoint.
    
    Returns:
        Status indicating if the service is ready to handle requests.
    """
    try:
        # Check if we can access required services
        health_data = health_service.check_system_health()
        
        # Consider the service ready if at least one critical component is healthy
        critical_components = ["database", "filesystem"]
        ready = all(
            health_data["components"][component]["status"] == HealthStatus.HEALTHY.value
            for component in critical_components
            if component in health_data["components"]
        )
        
        if ready:
            return {"status": "ready"}
        else:
            return {"status": "not ready"}, 503
            
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {"status": f"error: {str(e)}"}, 503

@router.get("/startup")
async def startup_probe() -> Dict[str, str]:
    """
    Kubernetes startup probe endpoint.
    
    Returns:
        Status indicating if the service has started successfully.
    """
    # For now, just return success if we can reach this endpoint
    # You can add more sophisticated startup checks here
    return {"status": "started"}

@router.get("/components/{component}")
async def get_component_health(component: str) -> Dict[str, Any]:
    """
    Get health status for a specific component.
    
    Args:
        component: Name of the component to check (e.g., 'database', 'ollama')
        
    Returns:
        Health status of the specified component.
    """
    try:
        # Check cache first
        cache_key = f"component_{component}"
        cached_result = health_service._get_cached_result(cache_key)
        if cached_result:
            return cached_result
        
        # Get fresh health status for the component
        if component == "ollama":
            result = health_service.check_ollama_health()
        elif component == "database":
            result = health_service.check_database_health()
        elif component == "filesystem":
            result = health_service.check_filesystem_health()
        elif component == "network":
            result = health_service.check_network_health()
        elif component == "system":
            result = health_service.check_system_resources()
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown component: {component}"
            )
        
        # Convert to dict and cache
        result_dict = result.to_dict()
        health_service._cache_result(cache_key, result_dict)
        
        return result_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Component health check failed for {component}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check {component} health: {str(e)}"
        )

# Add health check endpoints to the main FastAPI app
def add_health_routes(app):
    """Add health check routes to the FastAPI app."""
    app.include_router(router)
    
    # Add a simple root health check
    @app.get("/health")
    async def root_health():
        """Simple health check endpoint for load balancers and monitoring."""
        return {"status": "ok"}
    
    # Add a head method for health checks
    @app.head("/health")
    async def head_health():
        """HEAD method for health checks."""
        return ""
    
    return app
