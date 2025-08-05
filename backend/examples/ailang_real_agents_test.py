#!/usr/bin/env python
"""
AILang Integration Test with Real Agents

This script tests the AILang adapter with real agent implementations from the project.
It demonstrates how to use the AILang adapter with actual agents and tasks.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from ailang_adapter import AILangAdapter
from agent_orchestrator import AgentOrchestrator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ailang_real_agents_test")

# Path to the AILang model
MODEL_PATH = os.path.join(Path(__file__).parent.parent, "ailang_models", "agent_system.ail")

# Test cases for different task templates
TEST_CASES = {
    "CodeReview": {
        "code_snippet": """
def calculate_total(items):
    total = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total
        """,
        "language": "python",
        "focus_areas": ["performance", "security", "best practices"]
    },
    "SecurityAudit": {
        "code_snippet": """
def authenticate_user(username, password):
    stored_password = get_password_from_db(username)
    if password == stored_password:
        return generate_token(username)
    return None
        """,
        "language": "python",
        "security_focus": "authentication"
    },
    "CodeGeneration": {
        "requirements": "Create a function that calculates the factorial of a number recursively",
        "language": "python",
        "framework": "standard library"
    },
    "BugFix": {
        "code_snippet": """
def divide_values(a, b):
    return a / b
        """,
        "language": "python",
        "error_message": "ZeroDivisionError: division by zero",
        "reproduction_steps": "Called with divide_values(10, 0)"
    },
    "APIDesign": {
        "resource_name": "users",
        "operations": ["create", "read", "update", "delete"],
        "authentication": "JWT"
    }
}


async def test_task_template(adapter: AILangAdapter, template_name: str, context: Dict[str, Any]) -> None:
    """
    Test a specific task template with the given context
    
    Args:
        adapter: The AILang adapter
        template_name: Name of the task template to test
        context: Context for the task
    """
    logger.info(f"Testing task template: {template_name}")
    
    try:
        # Create a task from the template
        task_id = adapter.create_task_from_template(template_name, context)
        logger.info(f"Created task with ID: {task_id}")
        
        # Execute the task
        logger.info(f"Executing task {task_id}...")
        await adapter.orchestrator.execute_task(task_id)
        
        # Get task results
        task = adapter.orchestrator.active_tasks.get(task_id)
        if task:
            logger.info(f"Task status: {task.get('status', 'unknown')}")
            
            # Log agent responses
            if "responses" in task:
                logger.info(f"Received {len(task['responses'])} agent responses")
                for agent_id, response in task["responses"].items():
                    logger.info(f"Agent {agent_id} response: {response.get('content', '')[:100]}...")
            
            # Log consensus result if available
            if "consensus_result" in task:
                logger.info(f"Consensus result: {task['consensus_result'].get('content', '')[:100]}...")
        else:
            logger.error(f"Task {task_id} not found in active tasks")
    
    except Exception as e:
        logger.error(f"Error testing task template {template_name}: {str(e)}")


async def main() -> None:
    """
    Main function to run the AILang integration test with real agents
    """
    logger.info("Starting AILang integration test with real agents")
    
    try:
        # Create an agent orchestrator
        logger.info("Initializing agent orchestrator")
        orchestrator = AgentOrchestrator()
        
        # Create an AILang adapter with the orchestrator
        logger.info(f"Initializing AILang adapter with model: {MODEL_PATH}")
        adapter = AILangAdapter(orchestrator)
        
        # Load the AILang model
        adapter.load_model(MODEL_PATH)
        logger.info("AILang model loaded successfully")
        
        # Register agents from the AILang model
        agent_ids = adapter.register_agents()
        logger.info(f"Registered {len(agent_ids)} agents: {', '.join(agent_ids.keys())}")
        
        # Configure consensus strategies
        adapter.configure_consensus_strategies()
        logger.info("Configured consensus strategies")
        
        # Configure system settings
        adapter.configure_system()
        logger.info("Configured system settings")
        
        # Test each task template
        for template_name, context in TEST_CASES.items():
            logger.info(f"Testing template: {template_name}")
            try:
                await test_task_template(adapter, template_name, context)
            except Exception as e:
                logger.error(f"Error in template {template_name}: {str(e)}")
            logger.info("-" * 50)
        
        logger.info("AILang integration test completed")
    
    except Exception as e:
        logger.error(f"Error in AILang integration test: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())
