# AILang Adapter System

A comprehensive system for integrating, monitoring, and maintaining AILang compatibility in your multi-agent orchestration platform.

## Overview

The AILang Adapter System provides a complete solution for working with AILang, a domain-specific language for defining, training, and deploying neural network models with a focus on LLM orchestration and agent workflows. This system includes:

1. **AILang Adapter**: Core Python adapter for interpreting AILang model definitions
2. **JavaScript Adapter**: Frontend adapter for AILang integration in React applications
3. **Monitoring System**: Automated tools to track AILang repository changes
4. **Auto-Update System**: Tools to automatically update adapters when AILang changes
5. **Dashboard**: React component for visualizing AILang tasks and agents

## Components

### Backend Components

#### AILang Adapter (`ailang_adapter/`)

The core adapter that interprets AILang model definitions and integrates them with your Python backend.

- `ailang_parser.py`: Parses AILang syntax into Python objects
- `model_loader.py`: Loads and resolves AILang models, including imports
- `adapter.py`: Main adapter class for integrating AILang with your application
- `version.py`: Version information and compatibility tracking

#### Monitoring and Update Tools (`tools/`)

Tools for monitoring the AILang repository and automatically updating the adapter.

- `ailang_monitor.py`: Monitors the AILang GitHub repository for changes
- `ailang_adapter_updater.py`: Updates the adapter based on AILang changes
- `ailang_auto_update.py`: Integrates monitoring and updating for automatic updates
- `ailang-auto-update.service`: Systemd service file for running auto-updates as a background service

#### Examples and Tests

- `examples/ailang_usage_example.py`: Example of using the AILang adapter
- `examples/ailang_real_agents_test.py`: Test script for integrating AILang with real agents
- `tests/test_ailang_integration.py`: Unit tests for the AILang adapter

### Frontend Components

- `frontend/src/ailang/ailang-adapter.js`: JavaScript adapter for AILang integration
- `frontend/src/ailang/AILangDashboard.jsx`: React component for visualizing AILang tasks and agents
- `frontend/src/ailang/hooks/useAILang.js`: React hook for AILang integration

## Installation

### Backend

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/your-repo.git
   cd your-repo
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

## Usage

### Using the AILang Adapter in Python

```python
from ailang_adapter import AILangAdapter

# Initialize the adapter
adapter = AILangAdapter()

# Load an AILang model
model = adapter.load_model("path/to/model.ail")

# Create a task from a template
task = adapter.create_task("CodeReview", {
    "code": "def hello_world():\n    print('Hello, World!')",
    "language": "python",
    "requirements": ["PEP8 compliance", "Security best practices"]
})

# Execute the task
result = await adapter.execute_task(task)

# Get the result
print(result)
```

### Using the AILang Adapter in JavaScript

```javascript
import { AILangAdapter } from '../ailang/ailang-adapter';
import { useAILang } from '../ailang/hooks/useAILang';

// Initialize the adapter
const adapter = new AILangAdapter();

// In a React component
function MyComponent() {
  const { createTask, executeTask, tasks } = useAILang();
  
  const handleCodeReview = async () => {
    const task = await createTask('CodeReview', {
      code: 'function helloWorld() { console.log("Hello, World!"); }',
      language: 'javascript',
      requirements: ['ES6 compliance', 'Security best practices']
    });
    
    await executeTask(task.id);
  };
  
  return (
    <div>
      <button onClick={handleCodeReview}>Review Code</button>
      <AILangDashboard />
    </div>
  );
}
```

### Using the AILang Dashboard

```javascript
import { AILangDashboard } from '../ailang/AILangDashboard';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>AILang Integration</h1>
      </header>
      <main>
        <AILangDashboard />
      </main>
    </div>
  );
}
```

## Monitoring and Auto-Updates

### Running the Monitor

```bash
python backend/tools/ailang_monitor.py
```

Options:
- `--continuous`: Run in continuous mode, checking for updates periodically
- `--interval SECONDS`: Set the check interval in seconds (default: 86400)
- `--token TOKEN`: GitHub API token for authenticated requests

### Running the Auto-Updater

```bash
python backend/tools/ailang_auto_update.py
```

Options:
- `--force`: Force checking for updates
- `--service`: Run as a service
- `--interval SECONDS`: Check interval in seconds (for service mode)
- `--config PATH`: Path to the configuration file

### Installing as a Service

1. Edit the service file to match your environment:
   ```bash
   nano backend/tools/ailang-auto-update.service
   ```

2. Copy the service file to the systemd directory:
   ```bash
   sudo cp backend/tools/ailang-auto-update.service /etc/systemd/system/
   ```

3. Reload systemd:
   ```bash
   sudo systemctl daemon-reload
   ```

4. Enable and start the service:
   ```bash
   sudo systemctl enable ailang-auto-update
   sudo systemctl start ailang-auto-update
   ```

5. Check the status:
   ```bash
   sudo systemctl status ailang-auto-update
   ```

## Configuration

### Auto-Update Configuration

The auto-update system can be configured by editing the `ailang_auto_update_config.json` file:

```json
{
  "auto_update": true,
  "update_on_minor_changes": false,
  "update_on_major_changes": true,
  "update_on_releases": true,
  "check_interval_hours": 24,
  "email_notifications": false,
  "email_recipients": [],
  "slack_notifications": false,
  "slack_webhook": "",
  "github_token": "",
  "test_before_update": true,
  "rollback_on_failure": true
}
```

## AILang Model Definition

AILang models are defined in `.ail` files. Here's a simple example:

```
# Agent System Definition
system {
  name: "Multi-Agent Orchestration System"
  version: "0.1.0"
  description: "A system for orchestrating multiple AI agents to perform complex tasks"
}

# Agent Definitions
agent CodeReviewAgent {
  type: "LLM"
  provider: "OpenAI"
  model: "gpt-4"
  temperature: 0.2
  max_tokens: 2000
  system_prompt: "You are an expert code reviewer. Analyze the provided code and provide constructive feedback."
}

agent SecurityAuditAgent {
  type: "LLM"
  provider: "OpenAI"
  model: "gpt-4"
  temperature: 0.1
  max_tokens: 2000
  system_prompt: "You are a security expert. Analyze the provided code for security vulnerabilities."
}

# Consensus Strategy
consensus_strategy VotingConsensus {
  type: "Voting"
  threshold: 0.6
}

# Task Templates
task_template CodeReview {
  description: "Review code for quality and best practices"
  agents: [CodeReviewAgent, SecurityAuditAgent]
  consensus_strategy: VotingConsensus
  inputs: {
    code: "string",
    language: "string",
    requirements: "string[]"
  }
  output_format: {
    issues: "string[]",
    suggestions: "string[]",
    overall_quality: "number"
  }
}
```

## Development

### Adding New Features to the Adapter

1. Update the parser in `ailang_parser.py` to support new syntax features
2. Add corresponding functionality to the adapter in `adapter.py`
3. Update the version in `version.py`
4. Run tests to ensure compatibility

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- AILang project for creating the domain-specific language
- OpenAI for providing the foundation models used in examples
