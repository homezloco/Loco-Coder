"""
Agent Orchestration System for Multi-Agent Consensus
Handles coordination, communication, and consensus between multiple AI agents
Implements robust fallback mechanisms at every level
"""

import asyncio
import json
import logging
import os
import time
import uuid
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple, Callable, Union

# Fallback support - try to import advanced libraries but fall back to basic functionality
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False
    logging.warning("aiohttp not available, using fallback HTTP client")

try:
    from pydantic import BaseModel, Field
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False
    logging.warning("pydantic not available, using fallback data validation")
    
# Try to import our custom logger, fall back to standard logging
try:
    from logger import default_logger as logger
except ImportError:
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger('agent_orchestrator')

# Models for agent system
if HAS_PYDANTIC:
    class AgentRole(str, Enum):
        CODE_WRITER = "code_writer"
        CODE_REVIEWER = "code_reviewer"
        ARCHITECT = "architect"
        SECURITY_EXPERT = "security_expert"
        PERFORMANCE_EXPERT = "performance_expert"
        DOCUMENTATION_WRITER = "documentation_writer"
        
    class AgentConfig(BaseModel):
        agent_id: str
        name: str
        role: AgentRole
        api_url: str
        api_key: Optional[str] = None
        backup_api_url: Optional[str] = None
        backup_api_key: Optional[str] = None
        weight: float = 1.0  # For weighted consensus
        timeout: float = 10.0  # Seconds
        
    class ConsensusStrategy(str, Enum):
        MAJORITY_VOTE = "majority_vote"
        WEIGHTED_VOTE = "weighted_vote"
        UNANIMOUS = "unanimous"
        PRIMARY_WITH_VETO = "primary_with_veto"
        
    class ConsensusConfig(BaseModel):
        strategy: ConsensusStrategy = ConsensusStrategy.MAJORITY_VOTE
        threshold: float = 0.5  # Required agreement percentage (for non-unanimous)
        timeout: float = 30.0  # Max time to reach consensus
        retry_count: int = 2  # Number of retries for consensus
        
    class AgentMessage(BaseModel):
        agent_id: str
        message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
        content: str
        metadata: Dict[str, Any] = {}
        timestamp: float = Field(default_factory=time.time)
        
    class AgentTask(BaseModel):
        task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
        description: str
        context: Dict[str, Any] = {}
        agents: List[str] = []  # List of agent_ids
        deadline: Optional[float] = None
        consensus_config: Optional[ConsensusConfig] = None
else:
    # Simple fallback classes without validation
    class AgentRole:
        CODE_WRITER = "code_writer"
        CODE_REVIEWER = "code_reviewer"
        ARCHITECT = "architect"
        SECURITY_EXPERT = "security_expert"
        PERFORMANCE_EXPERT = "performance_expert"
        DOCUMENTATION_WRITER = "documentation_writer"
    
    class ConsensusStrategy:
        MAJORITY_VOTE = "majority_vote"
        WEIGHTED_VOTE = "weighted_vote"
        UNANIMOUS = "unanimous"
        PRIMARY_WITH_VETO = "primary_with_veto"

class LocalModelFallback:
    """Local model fallback for when external API services are unavailable"""
    
    def __init__(self):
        # Try to import local inference libraries with fallbacks
        self.local_model = None
        try:
            import ollama
            self.ollama_available = True
        except ImportError:
            self.ollama_available = False
            
        try:
            # Try a different local inference option
            from llama_cpp import Llama
            self.llama_cpp_available = True
        except ImportError:
            self.llama_cpp_available = False
    
    async def generate(self, prompt: str, role: str) -> str:
        """Generate a response using available local models"""
        if self.ollama_available:
            try:
                import ollama
                return ollama.generate(model="codellama:instruct", prompt=prompt)["response"]
            except Exception as e:
                logger.error(f"Ollama generation failed: {e}")
        
        if self.llama_cpp_available:
            try:
                from llama_cpp import Llama
                llm = Llama(model_path="models/codellama-7b-instruct.gguf", n_ctx=2048)
                return llm.create_completion(prompt, max_tokens=1024)["choices"][0]["text"]
            except Exception as e:
                logger.error(f"llama.cpp generation failed: {e}")
        
        # Ultimate fallback - rule-based response
        logger.warning("All local models failed, using rule-based fallback")
        return f"As a {role}, I recommend proceeding with caution as full AI analysis is currently unavailable."


class AgentOrchestrator:
    """
    Coordinates multiple AI agents, manages communication, and implements consensus
    mechanisms with comprehensive fallbacks at every level.
    """
    
    def __init__(self):
        self.agents: Dict[str, Dict] = {}  # Store agent configurations
        self.active_tasks: Dict[str, Dict] = {}  # Track ongoing tasks
        self.consensus_results: Dict[str, Dict] = {}  # Store consensus outcomes
        self.local_fallback = LocalModelFallback()
        self.session = None
        self._initialize_http_client()
    
    def _initialize_http_client(self):
        """Initialize HTTP client with fallback mechanisms"""
        if HAS_AIOHTTP:
            try:
                self.session = aiohttp.ClientSession()
            except Exception as e:
                logger.error(f"Failed to initialize aiohttp session: {e}")
                self.session = None
        else:
            self.session = None
    
    async def close(self):
        """Clean up resources"""
        if HAS_AIOHTTP and self.session:
            await self.session.close()
    
    def register_agent(self, agent_config: Union[dict, Any]) -> str:
        """
        Register a new agent with the orchestrator
        Returns the agent_id
        """
        # Handle both pydantic models and plain dicts
        if not isinstance(agent_config, dict):
            agent_config = agent_config.dict() if hasattr(agent_config, "dict") else vars(agent_config)
        
        agent_id = agent_config.get("agent_id", str(uuid.uuid4()))
        self.agents[agent_id] = agent_config
        logger.info(f"Registered agent: {agent_config.get('name')} with ID {agent_id}")
        return agent_id
    
    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get agent configuration by ID"""
        return self.agents.get(agent_id)
    
    async def call_agent_api(self, agent_id: str, prompt: str, context: Dict = None) -> Optional[str]:
        """Call an individual agent's API with fallbacks"""
        agent = self.get_agent(agent_id)
        if not agent:
            logger.error(f"Agent {agent_id} not found")
            return None
        
        # Try primary API
        response = await self._try_api_call(
            agent["api_url"], 
            agent["api_key"], 
            prompt, 
            context, 
            timeout=agent.get("timeout", 10.0)
        )
        
        # If primary fails, try backup API
        if response is None and agent.get("backup_api_url"):
            logger.warning(f"Primary API failed for agent {agent_id}, trying backup")
            response = await self._try_api_call(
                agent["backup_api_url"],
                agent.get("backup_api_key"),
                prompt,
                context,
                timeout=agent.get("timeout", 10.0)
            )
        
        # If all remote APIs fail, use local fallback
        if response is None:
            logger.warning(f"All APIs failed for agent {agent_id}, using local fallback")
            try:
                role = agent.get("role", "assistant")
                response = await self.local_fallback.generate(prompt, role)
            except Exception as e:
                logger.error(f"Local fallback failed: {e}")
                response = f"ERROR: Unable to generate response from agent {agent['name']}"
        
        return response
    
    async def _try_api_call(
        self, 
        url: str, 
        api_key: Optional[str], 
        prompt: str, 
        context: Optional[Dict], 
        timeout: float
    ) -> Optional[str]:
        """Try to call an API with proper error handling"""
        if not url:
            return None
            
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            
        payload = {
            "prompt": prompt,
            "context": context or {}
        }
        
        try:
            if HAS_AIOHTTP and self.session:
                # Use aiohttp if available
                async with self.session.post(
                    url, 
                    json=payload, 
                    headers=headers, 
                    timeout=timeout
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("response") or result.get("text") or str(result)
                    else:
                        logger.error(f"API call failed with status {response.status}: {await response.text()}")
                        return None
            else:
                # Fallback to standard library
                import urllib.request
                import urllib.error
                
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers=headers)
                
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    result = json.loads(response.read().decode("utf-8"))
                    return result.get("response") or result.get("text") or str(result)
                    
        except Exception as e:
            logger.error(f"API call error: {e}")
            return None
    
    async def create_task(
        self, 
        description: str, 
        context: Dict[str, Any], 
        agent_ids: List[str],
        consensus_config: Optional[Dict] = None
    ) -> str:
        """
        Create a new task for multiple agents to work on
        Returns the task_id
        """
        task_id = str(uuid.uuid4())
        
        # Validate that all agent_ids exist
        for agent_id in agent_ids:
            if agent_id not in self.agents:
                raise ValueError(f"Agent {agent_id} not registered")
        
        # Setup default consensus config if not provided
        if not consensus_config:
            consensus_config = {
                "strategy": "majority_vote",
                "threshold": 0.5,
                "timeout": 30.0,
                "retry_count": 2
            }
        
        self.active_tasks[task_id] = {
            "description": description,
            "context": context,
            "agent_ids": agent_ids,
            "consensus_config": consensus_config,
            "status": "created",
            "created_at": time.time(),
            "responses": {},
            "result": None
        }
        
        logger.info(f"Created task {task_id} for {len(agent_ids)} agents")
        return task_id
    
    async def execute_task(self, task_id: str) -> Dict:
        """
        Execute a task by distributing it to all assigned agents
        and collecting their responses
        """
        task = self.active_tasks.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        task["status"] = "running"
        
        # Call all agents in parallel
        coroutines = []
        for agent_id in task["agent_ids"]:
            coroutine = self._execute_agent_subtask(task_id, agent_id, task["description"], task["context"])
            coroutines.append(coroutine)
        
        # Wait for all responses with timeout
        try:
            timeout = task["consensus_config"].get("timeout", 30.0)
            await asyncio.wait_for(asyncio.gather(*coroutines), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(f"Task {task_id} timed out waiting for all agents")
            task["status"] = "partial"
        
        # Check if we have enough responses to reach consensus
        if not task["responses"]:
            task["status"] = "failed"
            logger.error(f"Task {task_id} failed with no responses")
            return {"success": False, "task_id": task_id, "message": "All agents failed to respond"}
        
        # Try to reach consensus
        consensus_result = await self._reach_consensus(task_id)
        task["result"] = consensus_result
        
        if consensus_result["success"]:
            task["status"] = "completed"
        else:
            task["status"] = "no_consensus"
        
        return consensus_result
    
    async def _execute_agent_subtask(
        self, 
        task_id: str, 
        agent_id: str, 
        description: str, 
        context: Dict
    ) -> None:
        """Execute a subtask for a specific agent"""
        task = self.active_tasks[task_id]
        
        try:
            response = await self.call_agent_api(agent_id, description, context)
            if response:
                task["responses"][agent_id] = {
                    "content": response,
                    "timestamp": time.time()
                }
                logger.debug(f"Agent {agent_id} responded to task {task_id}")
            else:
                logger.warning(f"Agent {agent_id} failed to provide a valid response")
        except Exception as e:
            logger.error(f"Error executing subtask for agent {agent_id}: {e}")
    
    async def _reach_consensus(self, task_id: str) -> Dict:
        """
        Apply the consensus strategy to the collected responses
        Returns a dictionary with consensus results
        """
        task = self.active_tasks[task_id]
        strategy = task["consensus_config"].get("strategy", "majority_vote")
        threshold = task["consensus_config"].get("threshold", 0.5)
        
        responses = task["responses"]
        if not responses:
            return {"success": False, "message": "No responses received"}
        
        # Get agent weights for weighted voting
        weights = {}
        for agent_id in responses:
            agent = self.get_agent(agent_id)
            weights[agent_id] = agent.get("weight", 1.0) if agent else 1.0
        
        if strategy == "unanimous":
            return await self._unanimous_consensus(task_id, responses)
        elif strategy == "weighted_vote":
            return await self._weighted_vote_consensus(task_id, responses, weights, threshold)
        elif strategy == "primary_with_veto":
            return await self._primary_with_veto_consensus(task_id, responses, weights)
        else:  # Default to majority vote
            return await self._majority_vote_consensus(task_id, responses, threshold)
    
    async def _unanimous_consensus(self, task_id: str, responses: Dict) -> Dict:
        """Check if all responses are identical"""
        # This is simplified - in practice, you'd use semantic similarity
        # or more sophisticated agreement metrics
        values = list(responses.values())
        first_response = values[0]["content"] if values else None
        
        if not first_response:
            return {"success": False, "message": "Empty response", "consensus": None}
        
        all_match = all(r["content"] == first_response for r in values)
        
        if all_match:
            return {
                "success": True, 
                "message": "Unanimous agreement", 
                "consensus": first_response,
                "confidence": 1.0
            }
        else:
            # Try to merge responses if possible
            merged = await self._try_merge_responses(task_id, responses)
            if merged["success"]:
                return merged
            else:
                return {
                    "success": False, 
                    "message": "No unanimous agreement", 
                    "responses": {agent_id: r["content"] for agent_id, r in responses.items()}
                }
    
    async def _majority_vote_consensus(self, task_id: str, responses: Dict, threshold: float) -> Dict:
        """Simple majority voting consensus"""
        # In a real implementation, this would use NLP to group similar responses
        # For now we'll use a simplified approach of exact matching
        
        vote_counts = {}
        for agent_id, response in responses.items():
            content = response["content"]
            if content in vote_counts:
                vote_counts[content].append(agent_id)
            else:
                vote_counts[content] = [agent_id]
        
        # Find the most common response
        top_response = max(vote_counts.items(), key=lambda x: len(x[1]))
        top_content, voters = top_response
        
        # Check if it meets the threshold
        vote_percentage = len(voters) / len(responses)
        if vote_percentage >= threshold:
            return {
                "success": True,
                "message": f"Majority agreement ({vote_percentage:.1%})",
                "consensus": top_content,
                "confidence": vote_percentage,
                "supporters": voters
            }
        else:
            # Try to merge responses if possible
            merged = await self._try_merge_responses(task_id, responses)
            if merged["success"]:
                return merged
            else:
                return {
                    "success": False,
                    "message": f"No majority agreement (highest: {vote_percentage:.1%})",
                    "responses": {agent_id: r["content"] for agent_id, r in responses.items()},
                    "vote_distribution": {content: len(voters) for content, voters in vote_counts.items()}
                }
    
    async def _weighted_vote_consensus(
        self, 
        task_id: str, 
        responses: Dict, 
        weights: Dict, 
        threshold: float
    ) -> Dict:
        """Weighted voting consensus"""
        vote_weights = {}
        total_weight = sum(weights[agent_id] for agent_id in responses)
        
        for agent_id, response in responses.items():
            content = response["content"]
            agent_weight = weights.get(agent_id, 1.0)
            
            if content in vote_weights:
                vote_weights[content]["weight"] += agent_weight
                vote_weights[content]["voters"].append(agent_id)
            else:
                vote_weights[content] = {
                    "weight": agent_weight,
                    "voters": [agent_id]
                }
        
        # Find response with highest weight
        top_response = max(vote_weights.items(), key=lambda x: x[1]["weight"])
        top_content, details = top_response
        
        # Check if it meets the threshold
        weight_percentage = details["weight"] / total_weight
        if weight_percentage >= threshold:
            return {
                "success": True,
                "message": f"Weighted agreement ({weight_percentage:.1%})",
                "consensus": top_content,
                "confidence": weight_percentage,
                "supporters": details["voters"]
            }
        else:
            # Try to merge responses if possible
            merged = await self._try_merge_responses(task_id, responses)
            if merged["success"]:
                return merged
            else:
                return {
                    "success": False,
                    "message": f"No weighted agreement (highest: {weight_percentage:.1%})",
                    "responses": {agent_id: r["content"] for agent_id, r in responses.items()},
                    "weight_distribution": {
                        content: details["weight"] / total_weight 
                        for content, details in vote_weights.items()
                    }
                }
    
    async def _primary_with_veto_consensus(self, task_id: str, responses: Dict, weights: Dict) -> Dict:
        """Primary decision maker with veto power from others"""
        task = self.active_tasks[task_id]
        
        # Find primary agent (highest weight)
        primary_agent_id = max(
            [agent_id for agent_id in responses],
            key=lambda aid: weights.get(aid, 1.0)
        )
        
        primary_response = responses[primary_agent_id]["content"]
        
        # Check for vetos (explicit disagreement)
        # In real implementation, would use NLP to detect semantic disagreement
        vetos = []
        for agent_id, response in responses.items():
            if agent_id != primary_agent_id:
                # Simple heuristic: look for "disagree" or "veto" keywords
                if "disagree" in response["content"].lower() or "veto" in response["content"].lower():
                    vetos.append(agent_id)
        
        if not vetos:
            return {
                "success": True,
                "message": "Primary decision accepted with no vetos",
                "consensus": primary_response,
                "primary_agent": primary_agent_id,
                "confidence": 0.8  # Confidence is high but not maximum
            }
        else:
            # Try to merge responses if possible
            merged = await self._try_merge_responses(task_id, responses)
            if merged["success"]:
                return merged
            else:
                return {
                    "success": False,
                    "message": f"Primary decision vetoed by {len(vetos)} agents",
                    "primary_response": primary_response,
                    "primary_agent": primary_agent_id,
                    "veto_agents": vetos,
                    "all_responses": {agent_id: r["content"] for agent_id, r in responses.items()}
                }
    
    async def _try_merge_responses(self, task_id: str, responses: Dict) -> Dict:
        """
        Attempt to merge different responses into a coherent result
        This is a complex process that may involve:
        - NLP to identify compatible parts of different responses
        - Using an additional agent to synthesize a new response
        """
        # This is a simplified implementation
        # In a real system, this would be more sophisticated
        
        try:
            # Simple approach: ask a synthesizer agent to merge responses
            context = self.active_tasks[task_id]["context"].copy()
            context["responses"] = [r["content"] for r in responses.values()]
            
            # Use a local model as fallback if available
            merge_prompt = (
                "You are a synthesis agent tasked with merging multiple responses into a single coherent solution. "
                "Below are the responses from different agents. "
                "Create a solution that incorporates the best parts of each response and resolves any conflicts:\n\n"
            )
            
            for i, response_content in enumerate([r["content"] for r in responses.values()]):
                merge_prompt += f"Agent {i+1}:\n{response_content}\n\n"
                
            merge_prompt += "Synthesized solution:"
            
            # Try to use a local model for merging
            merged_response = await self.local_fallback.generate(merge_prompt, "synthesizer")
            
            if merged_response and len(merged_response) > 10:  # Basic validation
                return {
                    "success": True,
                    "message": "Successfully merged different perspectives",
                    "consensus": merged_response,
                    "confidence": 0.7,  # Lower confidence since this is a synthesized response
                    "method": "synthesis"
                }
        except Exception as e:
            logger.error(f"Failed to merge responses for task {task_id}: {e}")
            
        # If merging fails, return failure
        return {
            "success": False,
            "message": "Could not merge divergent responses",
            "method": "synthesis_failed"
        }


# Create singleton instance
orchestrator = AgentOrchestrator()

# Export for API usage
async def get_orchestrator():
    """Dependency for FastAPI to get the orchestrator instance"""
    return orchestrator
