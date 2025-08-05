"""
AILang Parser
Parses AILang model definition files and converts them to Python objects
"""

import os
import re
import json
import logging
from enum import Enum
from typing import Dict, List, Any, Optional, Union, Set
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ailang_parser")

# Pydantic models for AILang constructs
class AgentParameter(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    
class AgentFallback(BaseModel):
    local_model: str
    timeout: float
    
class AgentDefinition(BaseModel):
    name: str
    role: str
    api_url: str
    api_key: Optional[str] = None
    backup_api_url: Optional[str] = None
    backup_api_key: Optional[str] = None
    weight: float = 1.0
    timeout: float = 30.0
    parameters: Optional[AgentParameter] = None
    fallback: Optional[AgentFallback] = None

class ConsensusDefinition(BaseModel):
    strategy: str
    threshold: Optional[float] = None
    timeout: float = 30.0
    retry_count: int = 2
    primary_role: Optional[str] = None
    
class ContextTemplate(BaseModel):
    required_fields: List[str] = []
    optional_fields: List[str] = []
    
class TaskDefinition(BaseModel):
    description: str
    agents: List[str]
    consensus: str
    context_template: ContextTemplate
    
class ErrorHandling(BaseModel):
    max_retries: int = 3
    retry_delay: float = 2.0
    backoff_factor: float = 2.0
    
class SystemConfig(BaseModel):
    max_concurrent_tasks: int = 5
    default_consensus: str = "MajorityVote"
    logging_level: str = "info"
    error_handling: ErrorHandling = ErrorHandling()

class AILangModel(BaseModel):
    """Complete AILang model definition"""
    enums: Dict[str, List[str]] = {}
    agents: Dict[str, AgentDefinition] = {}
    consensus_strategies: Dict[str, ConsensusDefinition] = {}
    tasks: Dict[str, TaskDefinition] = {}
    system_config: Optional[SystemConfig] = None

class AILangParser:
    """Parser for AILang model definition files"""
    
    def __init__(self):
        self.model = AILangModel()
        self.current_section = None
        self.current_block = {}
        self.current_nested_block = None
        self.enum_values = {}
        
    def _resolve_env_vars(self, value: str) -> str:
        """Resolve environment variables in a string"""
        if not isinstance(value, str):
            return value
            
        env_pattern = r'env\("([^"]+)"\)'
        matches = re.findall(env_pattern, value)
        
        if not matches:
            return value
            
        result = value
        for env_var in matches:
            env_value = os.environ.get(env_var, "")
            result = result.replace(f'env("{env_var}")', env_value)
            
        return result
    
    def _resolve_enum_reference(self, value: str) -> str:
        """Resolve enum references in a string"""
        if not isinstance(value, str):
            return value
            
        enum_pattern = r'([A-Za-z_][A-Za-z0-9_]*)\.(([A-Z_][A-Z0-9_]*))'
        matches = re.findall(enum_pattern, value)
        
        if not matches:
            return value
            
        for match in matches:
            enum_name, enum_value = match[0], match[1]
            if enum_name in self.enum_values and enum_value in self.enum_values[enum_name]:
                return enum_value
                
        return value
    
    def _parse_value(self, value_str: str) -> Any:
        """Parse a value string into the appropriate Python type"""
        # Remove quotes for strings
        if value_str.startswith('"') and value_str.endswith('"'):
            return self._resolve_env_vars(value_str[1:-1])
            
        # Handle boolean values
        if value_str.lower() == "true":
            return True
        if value_str.lower() == "false":
            return False
            
        # Handle numeric values
        try:
            if "." in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            pass
            
        # Handle enum references
        return self._resolve_enum_reference(value_str)
    
    def _parse_list(self, list_str: str) -> List[Any]:
        """Parse a list string into a Python list"""
        # Remove brackets and split by comma
        items = list_str.strip()[1:-1].split(",")
        return [self._parse_value(item.strip()) for item in items if item.strip()]
    
    def _parse_property(self, line: str) -> tuple:
        """Parse a property line into key-value pair"""
        parts = line.split(":", 1)
        if len(parts) != 2:
            return None, None
            
        key = parts[0].strip()
        value_str = parts[1].strip()
        
        # Handle list values
        if value_str.startswith("[") and value_str.endswith("]"):
            value = self._parse_list(value_str)
        else:
            value = self._parse_value(value_str)
            
        return key, value
    
    def _start_block(self, line: str, block_type: str) -> str:
        """Start a new block and return its name"""
        parts = line.split(" ", 1)
        if len(parts) != 2:
            logger.error(f"Invalid {block_type} definition: {line}")
            return None
            
        name = parts[1].split("{")[0].strip()
        self.current_section = block_type
        self.current_block = {"name": name}
        return name
    
    def _end_block(self) -> None:
        """End the current block and add it to the model"""
        if not self.current_section:
            return
            
        if self.current_section == "enum":
            enum_name = self.current_block["name"]
            enum_values = self.current_block.get("values", [])
            self.model.enums[enum_name] = enum_values
            self.enum_values[enum_name] = enum_values
            
        elif self.current_section == "agent":
            agent_name = self.current_block["name"]
            # Convert parameters and fallback to their respective models
            if "parameters" in self.current_block:
                self.current_block["parameters"] = AgentParameter(**self.current_block["parameters"])
            if "fallback" in self.current_block:
                self.current_block["fallback"] = AgentFallback(**self.current_block["fallback"])
                
            # Create agent definition
            agent_def = AgentDefinition(**{k: v for k, v in self.current_block.items() if k != "name"})
            self.model.agents[agent_name] = agent_def
            
        elif self.current_section == "consensus":
            consensus_name = self.current_block["name"]
            consensus_def = ConsensusDefinition(**{k: v for k, v in self.current_block.items() if k != "name"})
            self.model.consensus_strategies[consensus_name] = consensus_def
            
        elif self.current_section == "task":
            task_name = self.current_block["name"]
            # Process context template
            if "context_template" in self.current_block:
                required_fields = []
                optional_fields = []
                
                for field, requirement in self.current_block["context_template"].items():
                    if requirement == "required":
                        required_fields.append(field)
                    elif requirement == "optional":
                        optional_fields.append(field)
                        
                self.current_block["context_template"] = ContextTemplate(
                    required_fields=required_fields,
                    optional_fields=optional_fields
                )
                
            # Create task definition
            task_def = TaskDefinition(**{k: v for k, v in self.current_block.items() if k != "name"})
            self.model.tasks[task_name] = task_def
            
        elif self.current_section == "system":
            # Process error handling if present
            if "error_handling" in self.current_block:
                self.current_block["error_handling"] = ErrorHandling(**self.current_block["error_handling"])
                
            # Create system config
            system_config = SystemConfig(**{k: v for k, v in self.current_block.items() if k != "name"})
            self.model.system_config = system_config
            
        self.current_section = None
        self.current_block = {}
        self.current_nested_block = None
    
    def parse_file(self, file_path: str) -> AILangModel:
        """Parse an AILang file and return the model"""
        try:
            with open(file_path, 'r') as f:
                return self.parse_content(f.read())
        except Exception as e:
            logger.error(f"Error parsing AILang file {file_path}: {str(e)}")
            raise
    
    def parse_content(self, content: str) -> AILangModel:
        """Parse AILang content string and return the model"""
        self.model = AILangModel()
        self.current_section = None
        self.current_block = {}
        self.current_nested_block = None
        
        # Process line by line
        lines = content.split('\n')
        for line in lines:
            # Skip comments and empty lines
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('"""'):
                continue
                
            # Check for block start
            if line.startswith("enum ") and "{" in line:
                enum_name = self._start_block(line, "enum")
                self.current_block["values"] = []
                continue
                
            if line.startswith("agent ") and "{" in line:
                self._start_block(line, "agent")
                continue
                
            if line.startswith("consensus ") and "{" in line:
                self._start_block(line, "consensus")
                continue
                
            if line.startswith("task ") and "{" in line:
                self._start_block(line, "task")
                continue
                
            if line.startswith("system ") and "{" in line:
                self._start_block(line, "system")
                continue
                
            # Check for nested block start
            if self.current_section and "{" in line and "}" not in line:
                nested_block_name = line.split("{")[0].strip()
                self.current_nested_block = nested_block_name
                self.current_block[nested_block_name] = {}
                continue
                
            # Check for block end
            if line == "}" and self.current_nested_block:
                self.current_nested_block = None
                continue
                
            if line == "}" and self.current_section:
                self._end_block()
                continue
                
            # Handle enum values
            if self.current_section == "enum" and not self.current_nested_block:
                enum_value = line.strip()
                if enum_value and enum_value not in ["{", "}"]:
                    self.current_block["values"].append(enum_value)
                continue
                
            # Handle properties
            if self.current_section and ":" in line:
                key, value = self._parse_property(line)
                if key:
                    if self.current_nested_block:
                        self.current_block[self.current_nested_block][key] = value
                    else:
                        self.current_block[key] = value
                        
        # Ensure any open blocks are closed
        if self.current_section:
            self._end_block()
            
        return self.model

# Helper function to load AILang model from file
def load_ailang_model(file_path: str) -> AILangModel:
    """Load and parse an AILang model from a file"""
    parser = AILangParser()
    return parser.parse_file(file_path)
