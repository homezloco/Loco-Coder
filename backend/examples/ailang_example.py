"""
AILang Integration Example
Demonstrates how to use the AILang adapter with the agent orchestration system
"""

import os
import sys
import logging
import asyncio
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from ailang_adapter import AILangAdapter
from agent_orchestrator import AgentOrchestrator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ailang_example")

async def run_code_review_task():
    """
    Example of using AILang to define and execute a code review task
    """
    # Path to the AILang model definition file
    model_path = os.path.join(Path(__file__).parent.parent, "ailang_models", "agent_system.ail")
    
    # Create an agent orchestrator
    orchestrator = AgentOrchestrator()
    
    # Create an AILang adapter with the orchestrator
    adapter = AILangAdapter(orchestrator)
    
    # Initialize the adapter from the AILang model
    if not adapter.initialize_from_model(model_path):
        logger.error("Failed to initialize AILang adapter")
        return
    
    logger.info("AILang adapter initialized successfully")
    
    # Create a code review task using the AILang task template
    context = {
        "code_snippet": """
def calculate_total(items):
    total = 0
    for item in items:
        total += item['price'] * item['quantity']
    return total
        """,
        "language": "python",
        "focus_areas": ["performance", "security", "best practices"]
    }
    
    # Create the task from the template
    task_id = adapter.create_task_from_template("CodeReview", context)
    
    if not task_id:
        logger.error("Failed to create task")
        return
    
    logger.info(f"Created task with ID: {task_id}")
    
    # Execute the task
    try:
        await orchestrator.execute_task(task_id)
        logger.info(f"Task {task_id} executed")
        
        # Get task results
        task_details = orchestrator.active_tasks.get(task_id)
        
        if task_details and task_details.get("status") == "completed":
            logger.info("Task completed successfully")
            
            # Print agent responses
            if "responses" in task_details:
                logger.info("Agent responses:")
                for agent_id, response in task_details["responses"].items():
                    agent_name = orchestrator.agents.get(agent_id, {}).get("name", "Unknown")
                    logger.info(f"  {agent_name}: {response.get('content', 'No content')[:100]}...")
            
            # Print consensus result
            if "result" in task_details:
                result = task_details["result"]
                logger.info(f"Consensus result: {result.get('consensus', 'No consensus')}")
                logger.info(f"Confidence: {result.get('confidence', 'N/A')}")
                logger.info(f"Method: {result.get('method', 'N/A')}")
        else:
            logger.error(f"Task failed or still in progress: {task_details.get('status', 'unknown')}")
            
    except Exception as e:
        logger.error(f"Error executing task: {str(e)}")

async def run_security_audit_task():
    """
    Example of using AILang to define and execute a security audit task
    """
    # Path to the AILang model definition file
    model_path = os.path.join(Path(__file__).parent.parent, "ailang_models", "agent_system.ail")
    
    # Create an agent orchestrator
    orchestrator = AgentOrchestrator()
    
    # Create an AILang adapter with the orchestrator
    adapter = AILangAdapter(orchestrator)
    
    # Initialize the adapter from the AILang model
    if not adapter.initialize_from_model(model_path):
        logger.error("Failed to initialize AILang adapter")
        return
    
    logger.info("AILang adapter initialized successfully")
    
    # Create a security audit task using the AILang task template
    context = {
        "code_snippet": """
def process_user_input(user_input):
    # Process the user input
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    
    # Execute the query
    result = execute_query(query)
    
    return result
        """,
        "language": "python",
        "security_focus": "SQL injection",
        "compliance_requirements": ["OWASP Top 10", "PCI DSS"]
    }
    
    # Create the task from the template
    task_id = adapter.create_task_from_template("SecurityAudit", context)
    
    if not task_id:
        logger.error("Failed to create task")
        return
    
    logger.info(f"Created task with ID: {task_id}")
    
    # Execute the task
    try:
        await orchestrator.execute_task(task_id)
        logger.info(f"Task {task_id} executed")
        
        # Get task results
        task_details = orchestrator.active_tasks.get(task_id)
        
        if task_details and task_details.get("status") == "completed":
            logger.info("Task completed successfully")
            
            # Print agent responses
            if "responses" in task_details:
                logger.info("Agent responses:")
                for agent_id, response in task_details["responses"].items():
                    agent_name = orchestrator.agents.get(agent_id, {}).get("name", "Unknown")
                    logger.info(f"  {agent_name}: {response.get('content', 'No content')[:100]}...")
            
            # Print consensus result
            if "result" in task_details:
                result = task_details["result"]
                logger.info(f"Consensus result: {result.get('consensus', 'No consensus')}")
                logger.info(f"Confidence: {result.get('confidence', 'N/A')}")
                logger.info(f"Method: {result.get('method', 'N/A')}")
        else:
            logger.error(f"Task failed or still in progress: {task_details.get('status', 'unknown')}")
            
    except Exception as e:
        logger.error(f"Error executing task: {str(e)}")

async def main():
    """
    Main function to run the examples
    """
    logger.info("Running AILang integration examples")
    
    # Run the code review task example
    logger.info("=== Running Code Review Task Example ===")
    await run_code_review_task()
    
    logger.info("\n=== Running Security Audit Task Example ===")
    await run_security_audit_task()
    
    logger.info("AILang integration examples completed")

if __name__ == "__main__":
    asyncio.run(main())
