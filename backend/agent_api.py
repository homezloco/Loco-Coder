"""
Multi-Agent System API Endpoints
Provides REST API for configuring and interacting with the multi-agent orchestration system
Includes robust error handling and fallback mechanisms
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import asyncio
import logging
import time

# Import the agent orchestrator
from agent_orchestrator import get_orchestrator, AgentOrchestrator

# Security
from security import verify_api_key

# Try to import our custom logger, fall back to standard logging
try:
    from logger import default_logger as logger
except ImportError:
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger('agent_api')

# Create API router
router = APIRouter(
    prefix="/agents",
    tags=["agents"],
    dependencies=[Depends(verify_api_key)]
)

# Request/Response models
class AgentRegistrationRequest(BaseModel):
    name: str
    role: str
    api_url: str
    api_key: Optional[str] = None
    backup_api_url: Optional[str] = None
    backup_api_key: Optional[str] = None
    weight: float = 1.0
    timeout: float = 10.0

class AgentResponse(BaseModel):
    agent_id: str
    name: str
    role: str
    weight: float
    
class TaskRequest(BaseModel):
    description: str
    context: Dict[str, Any] = {}
    agent_ids: List[str]
    consensus_config: Optional[Dict[str, Any]] = None
    
class TaskResponse(BaseModel):
    task_id: str
    status: str
    agent_count: int
    
class ConsensusResult(BaseModel):
    success: bool
    message: str
    consensus: Optional[str] = None
    confidence: Optional[float] = None
    method: Optional[str] = None
    
class AgentResponseModel(BaseModel):
    agent_id: str
    content: str
    timestamp: float

class TaskDetailsResponse(BaseModel):
    task_id: str
    description: str
    status: str
    created_at: float
    agent_count: int
    responses: Optional[Dict[str, AgentResponseModel]] = None
    result: Optional[ConsensusResult] = None

# Background task tracking
_background_tasks = {}

# Routes
@router.post("/register", response_model=AgentResponse)
async def register_agent(
    request: AgentRegistrationRequest,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
):
    """Register a new AI agent with the system"""
    try:
        agent_config = {
            "name": request.name,
            "role": request.role,
            "api_url": request.api_url,
            "api_key": request.api_key,
            "backup_api_url": request.backup_api_url,
            "backup_api_key": request.backup_api_key,
            "weight": request.weight,
            "timeout": request.timeout
        }
        
        agent_id = orchestrator.register_agent(agent_config)
        
        return {
            "agent_id": agent_id,
            "name": request.name,
            "role": request.role,
            "weight": request.weight
        }
    except Exception as e:
        logger.error(f"Agent registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register agent: {str(e)}")

@router.get("/list")
async def list_agents(orchestrator: AgentOrchestrator = Depends(get_orchestrator)):
    """List all registered agents"""
    try:
        result = []
        for agent_id, agent in orchestrator.agents.items():
            result.append({
                "agent_id": agent_id,
                "name": agent.get("name", "Unknown"),
                "role": agent.get("role", "Unknown"),
                "weight": agent.get("weight", 1.0)
            })
        return result
    except Exception as e:
        logger.error(f"Agent listing error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")

@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    request: TaskRequest,
    background_tasks: BackgroundTasks,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
):
    """Create a new task for multiple agents to work on with consensus"""
    try:
        # Validate agent IDs
        for agent_id in request.agent_ids:
            if agent_id not in orchestrator.agents:
                raise HTTPException(status_code=400, detail=f"Agent {agent_id} not registered")
        
        # Create the task
        task_id = await orchestrator.create_task(
            description=request.description,
            context=request.context,
            agent_ids=request.agent_ids,
            consensus_config=request.consensus_config
        )
        
        # Execute the task in the background
        background_tasks.add_task(_execute_task_background, task_id, orchestrator)
        
        return {
            "task_id": task_id,
            "status": "created",
            "agent_count": len(request.agent_ids)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Task creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

async def _execute_task_background(task_id: str, orchestrator: AgentOrchestrator):
    """Execute task in background and store result"""
    try:
        _background_tasks[task_id] = {"status": "running", "started_at": time.time()}
        result = await orchestrator.execute_task(task_id)
        _background_tasks[task_id] = {
            "status": "completed" if result.get("success") else "failed",
            "completed_at": time.time(),
            "result": result
        }
    except Exception as e:
        logger.error(f"Background task error for task {task_id}: {e}")
        _background_tasks[task_id] = {
            "status": "error",
            "error": str(e),
            "completed_at": time.time()
        }

@router.get("/tasks/{task_id}", response_model=TaskDetailsResponse)
async def get_task_status(
    task_id: str,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
):
    """Get the status and results of a task"""
    try:
        task = orchestrator.active_tasks.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        # Convert responses to the expected format
        formatted_responses = {}
        if "responses" in task:
            for agent_id, response in task["responses"].items():
                formatted_responses[agent_id] = {
                    "agent_id": agent_id,
                    "content": response["content"],
                    "timestamp": response["timestamp"]
                }
        
        return {
            "task_id": task_id,
            "description": task["description"],
            "status": task["status"],
            "created_at": task["created_at"],
            "agent_count": len(task["agent_ids"]),
            "responses": formatted_responses if formatted_responses else None,
            "result": task.get("result")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Task status error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")

@router.post("/execute_consensus")
async def execute_consensus(
    task_ids: List[str],
    consensus_config: Optional[Dict[str, Any]] = None,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
):
    """Execute consensus on multiple completed tasks"""
    try:
        # This would be implemented to combine results from multiple tasks
        # For now, just return a simple response
        return {
            "message": "Multi-task consensus not yet implemented",
            "task_count": len(task_ids)
        }
    except Exception as e:
        logger.error(f"Consensus execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute consensus: {str(e)}")

@router.post("/tasks/{task_id}/retry")
async def retry_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
):
    """Retry a failed task with the same parameters"""
    try:
        task = orchestrator.active_tasks.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        # Reset task status
        task["status"] = "created"
        task["responses"] = {}
        task["result"] = None
        
        # Execute the task again in the background
        background_tasks.add_task(_execute_task_background, task_id, orchestrator)
        
        return {
            "task_id": task_id,
            "status": "retrying",
            "agent_count": len(task["agent_ids"])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Task retry error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retry task: {str(e)}")

@router.get("/health")
async def agent_system_health(orchestrator: AgentOrchestrator = Depends(get_orchestrator)):
    """Health check for the agent system"""
    try:
        return {
            "status": "operational",
            "agent_count": len(orchestrator.agents),
            "active_tasks": len(orchestrator.active_tasks),
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": time.time()
        }
