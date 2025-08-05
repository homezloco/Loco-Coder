# AILang Integration for Agent Orchestration System

This module provides integration between AILang (AI Language) model definitions and the existing agent orchestration system. It allows you to define agents, consensus strategies, and tasks in a declarative AILang syntax and use them with the Python backend.

## Overview

AILang is a domain-specific language (DSL) for defining, training, and deploying neural network models with a focus on LLM orchestration and agent workflows. This integration adapter allows you to use AILang's declarative syntax to configure your agent orchestration system without waiting for the full AILang transpiler to mature.

## Components

The AILang integration consists of the following components:

1. **AILang Model Definition** (`ailang_models/agent_system.ail`): A declarative definition of agents, consensus strategies, and tasks using AILang syntax.

2. **AILang Parser** (`ailang_adapter/ailang_parser.py`): Parses AILang model definition files and converts them to Python objects.

3. **AILang Adapter** (`ailang_adapter/ailang_adapter.py`): Integrates AILang model definitions with the existing agent orchestration system.

4. **Usage Example** (`examples/ailang_example.py`): Demonstrates how to use the AILang adapter with the agent orchestration system.

## Getting Started

### 1. Define Your Agent System in AILang

Create an AILang model definition file (`.ail`) to define your agents, consensus strategies, and tasks:

```ailang
# Define agent configurations
agent CodeWriter {
  name: "Code Writer"
  role: "CODE_WRITER"
  api_url: "https://api.openai.com/v1/chat/completions"
  api_key: env("OPENAI_API_KEY")
  weight: 1.0
  timeout: 30.0
  
  parameters {
    model: "gpt-4"
    temperature: 0.7
  }
  
  fallback {
    local_model: "codellama:7b-instruct"
    timeout: 60.0
  }
}

# Define consensus strategies
consensus MajorityVote {
  strategy: "majority_vote"
  threshold: 0.5
  timeout: 30.0
  retry_count: 2
}

# Define task templates
task CodeReview {
  description: "Review code for quality and best practices"
  agents: [CodeWriter, CodeReviewer]
  consensus: MajorityVote
  
  context_template {
    code_snippet: required
    language: required
    focus_areas: optional
  }
}
```

### 2. Initialize the AILang Adapter

```python
from ailang_adapter import AILangAdapter
from agent_orchestrator import AgentOrchestrator

# Create an agent orchestrator
orchestrator = AgentOrchestrator()

# Create an AILang adapter with the orchestrator
adapter = AILangAdapter(orchestrator)

# Initialize the adapter from the AILang model
model_path = "path/to/your/model.ail"
adapter.initialize_from_model(model_path)
```

### 3. Create and Execute Tasks

```python
# Create a task from an AILang task template
context = {
    "code_snippet": "def example(): pass",
    "language": "python",
    "focus_areas": ["performance", "security"]
}

task_id = adapter.create_task_from_template("CodeReview", context)

# Execute the task
await orchestrator.execute_task(task_id)

# Get task results
task_details = orchestrator.active_tasks.get(task_id)
```

## Features

- **Declarative Configuration**: Define your agent system in a clean, declarative syntax
- **Environment Variable Support**: Use `env("VAR_NAME")` to reference environment variables
- **Enum Support**: Define and use enums for better type safety
- **Nested Configuration**: Use nested blocks for complex configurations
- **Validation**: Automatic validation of required fields in task contexts
- **Fallback Support**: Define fallback mechanisms for agents

## Extending

### Adding New AILang Constructs

To add support for new AILang constructs:

1. Add appropriate Pydantic models in `ailang_parser.py`
2. Update the parsing logic in `AILangParser`
3. Add corresponding integration logic in `AILangAdapter`

### Custom Validation

You can add custom validation logic to the `create_task_from_template` method in `AILangAdapter` to enforce additional constraints on task contexts.

## Future Enhancements

As AILang matures, this adapter can be extended to support:

1. **Model Training**: Integrate with AILang's model training capabilities
2. **JavaScript Transpilation**: Support for frontend AI components
3. **WebAssembly Integration**: Deploy models to the browser
4. **Visualization**: Visualize agent interactions and task execution

## Error Handling and Fallbacks

The adapter includes comprehensive error handling and fallback mechanisms:

- Environment variable resolution with fallbacks
- Agent registration with error handling
- Task creation with validation
- System configuration with defaults

## Contributing

To contribute to this integration:

1. Add support for new AILang features
2. Improve parsing efficiency
3. Add more examples and tests
4. Enhance documentation

## Related Documentation

- [Agent Orchestration System](../agent_orchestrator.py)
- [AILang GitHub Repository](https://github.com/homezloco/ailang)
