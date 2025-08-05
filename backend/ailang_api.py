#!/usr/bin/env python3
"""
AILang API Server

This module provides FastAPI endpoints for the AILang adapter dashboard,
including health checks, logs retrieval, version information, and update triggering.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ailang_api")

# Default paths (can be overridden with environment variables)
DEFAULT_CONFIG_PATH = Path.home() / ".ailang" / "config"
DEFAULT_LOG_PATH = Path.home() / ".ailang" / "logs" / "ailang_adapter.log"
DEFAULT_VERSION_PATH = Path.home() / ".ailang" / "version.json"

# Get paths from environment variables or use defaults
CONFIG_PATH = Path(os.environ.get("AILANG_CONFIG_PATH", DEFAULT_CONFIG_PATH))
LOG_PATH = Path(os.environ.get("AILANG_LOG_PATH", DEFAULT_LOG_PATH))
VERSION_PATH = Path(os.environ.get("AILANG_VERSION_PATH", DEFAULT_VERSION_PATH))

# Create app
app = FastAPI(
    title="AILang Adapter API",
    description="API for AILang adapter monitoring and management",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class UpdateRequest(BaseModel):
    """Request model for update endpoint."""
    force: bool = False
    check_only: bool = False


# Background update task
async def run_update_task(force: bool = False) -> None:
    """
    Run the AILang adapter update task in the background.
    
    Args:
        force: Whether to force an update regardless of version differences
    """
    logger.info(f"Starting background update task (force={force})")
    
    try:
        # Find the auto update script
        script_dir = Path(__file__).parent.absolute()
        update_script = script_dir / "ailang_adapter" / "ailang_auto_update.py"
        
        if not update_script.exists():
            # Try to find it in parent directories
            update_script = script_dir.parent / "ailang_adapter" / "ailang_auto_update.py"
        
        if not update_script.exists():
            logger.error(f"Update script not found at {update_script}")
            return
        
        # Run the update script
        cmd = [sys.executable, str(update_script)]
        if force:
            cmd.append("--force")
        
        logger.info(f"Running command: {' '.join(cmd)}")
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Update failed with return code {process.returncode}")
            logger.error(f"STDERR: {stderr.decode('utf-8')}")
        else:
            logger.info("Update completed successfully")
            logger.info(f"STDOUT: {stdout.decode('utf-8')}")
    
    except Exception as e:
        logger.error(f"Error running update task: {str(e)}")


@app.get("/api/health", response_class=JSONResponse)
async def health_check(full: bool = False) -> Dict[str, Any]:
    """
    Get health status of the AILang adapter.
    
    Args:
        full: Whether to perform a full health check
        
    Returns:
        Health status information
    """
    # For testing purposes, return mock health data
    components = [
        {
            "name": "AILang Parser",
            "status": "healthy",
            "version": "0.2.1",
            "last_check": datetime.now().isoformat(),
        },
        {
            "name": "Model Loader",
            "status": "healthy",
            "version": "0.1.5",
            "last_check": datetime.now().isoformat(),
        },
        {
            "name": "Task Executor",
            "status": "healthy",
            "version": "0.1.3",
            "last_check": datetime.now().isoformat(),
        },
    ]
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": components,
        "message": "All components are functioning normally",
    }


@app.get("/api/logs", response_class=JSONResponse)
async def get_logs(lines: int = 100) -> Dict[str, Union[List[str], str]]:
    """
    Get recent log lines from the AILang adapter log file.
    
    Args:
        lines: Number of recent log lines to retrieve
        
    Returns:
        Dictionary containing log lines
    """
    # For testing purposes, return mock log data
    mock_logs = [
        "2025-08-05 10:00:01 INFO [AILangAdapter] Starting adapter service",
        "2025-08-05 10:00:02 INFO [AILangAdapter] Loading configuration from /home/user/.ailang/config",
        "2025-08-05 10:00:03 INFO [AILangParser] Initializing parser with grammar version 0.2.1",
        "2025-08-05 10:00:04 INFO [ModelLoader] Loading model definitions",
        "2025-08-05 10:00:05 INFO [TaskExecutor] Task executor initialized",
        "2025-08-05 10:00:06 INFO [AILangAdapter] All components initialized successfully",
        "2025-08-05 10:00:07 INFO [AILangAdapter] Adapter ready to process requests",
        "2025-08-05 10:15:23 INFO [AILangParser] Processing model definition: agent_orchestration.ailang",
        "2025-08-05 10:15:24 INFO [ModelLoader] Loading model: AgentOrchestrator",
        "2025-08-05 10:15:25 INFO [TaskExecutor] Executing task: initialize_agent",
        "2025-08-05 10:15:26 DEBUG [TaskExecutor] Task parameters: {\"agent_type\": \"assistant\", \"capabilities\": [\"text\", \"code\"]}",
        "2025-08-05 10:15:27 INFO [TaskExecutor] Task completed successfully",
        "2025-08-05 10:30:01 INFO [AILangAdapter] Checking for updates",
        "2025-08-05 10:30:02 INFO [AILangAdapter] No updates available",
        "2025-08-05 10:30:03 INFO [AILangAdapter] Next update check scheduled in 1 hour",
    ]
    
    # Limit to requested number of lines
    return {"logs": mock_logs[-lines:]}


@app.get("/api/version", response_class=JSONResponse)
async def get_version() -> Dict[str, Any]:
    """
    Get version information for the AILang adapter and AILang language.
    
    Returns:
        Dictionary containing version information
    """
    # For testing purposes, return mock version data
    mock_version_data = {
        "adapter_version": "0.3.2",
        "adapter_last_update": "2025-07-15T14:30:45",
        "ailang_current_version": "0.2.1",
        "ailang_latest_version": "0.2.3",
        "update_available": True,
        "days_since_update": 21,
        "update_status": "Update available to version 0.2.3",
    }
    
    return mock_version_data


@app.post("/api/update", response_class=JSONResponse)
async def trigger_update(
    request: UpdateRequest,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """
    Trigger an update check or update process for the AILang adapter.
    
    Args:
        request: Update request parameters
        background_tasks: FastAPI background tasks
        
    Returns:
        Dictionary containing update status
    """
    # For testing purposes, simulate a successful update check
    if request.check_only:
        return {
            "success": True,
            "message": "Update check completed",
            "update_available": True,
            "current_version": "0.2.1",
            "latest_version": "0.2.3",
        }
    else:
        # Simulate starting a background update task
        background_tasks.add_task(run_update_task, request.force)
        
        return {
            "success": True,
            "message": "Update process started in the background",
            "force": request.force,
        }


@app.get("/", response_class=JSONResponse)
async def root() -> Dict[str, Any]:
    """
    Root endpoint for the API.
    
    Returns:
        Welcome message
    """
    return {
        "message": "AILang Adapter API",
        "version": "1.0.0",
        "endpoints": [
            "/api/health",
            "/api/logs",
            "/api/version",
            "/api/update",
        ],
    }


def main():
    """Main entry point for the API server."""
    host = os.environ.get("AILANG_API_HOST", "0.0.0.0")
    port = int(os.environ.get("AILANG_API_PORT", 8001))  # Changed default port to 8001
    reload = os.environ.get("AILANG_API_RELOAD", "").lower() in ("true", "1", "yes")
    
    logger.info(f"Starting AILang API server on {host}:{port}")
    uvicorn.run(
        "ailang_api:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    main()
