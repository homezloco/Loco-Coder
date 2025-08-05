# Local AI-Powered Coding Platform

A self-hosted, local-first AI-powered coding platform inspired by Replit and Cursor. This project provides a fully functional web-based coding environment with integrated AI assistance, multi-agent consensus decision making, code execution, and file management features.

## 🚀 Key Features

* **Browser-Based Code Editing** - Monaco Editor with syntax highlighting, code completion, and keyboard shortcuts
* **Local AI Chat Assistant** - Powered by Ollama with CodeLlama model for code generation and assistance
* **Multi-Agent Consensus System** - Orchestrate multiple AI agents with configurable consensus strategies and complete fallback chain
* **Isolated Code Execution** - Run Python and JavaScript code in secure Docker containers
* **File Management System** - Create, save, load, and organize project files with search capabilities
* **Responsive UI** - Split pane interface with resizable editor, terminal, and chat panels
* **Comprehensive Fallbacks** - Resilient architecture with multiple layers of fallbacks for all critical services
* **Degraded Mode Operation** - System continues to function even when some components are unavailable
* **Multi-language Support** - Execute Python, JavaScript, HTML, CSS, and more with language-specific fallbacks

## 📋 Architecture Overview

![Architecture Diagram](https://via.placeholder.com/800x400?text=Local+AI+Coding+Platform+Architecture)

### Backend (Python/FastAPI)

* **FastAPI REST API** - Efficient and modern Python backend
* **Ollama Client** - Connects to local LLM with robust retry logic
* **Agent Orchestrator** - Manages multiple AI agents with consensus decision-making strategies
* **Docker SDK** - Executes code in isolated containers with resource limits
* **File Manager** - Handles project storage with backups and security checks
* **Database** - Production-ready PostgreSQL with automatic cascade fallbacks to SQLite and JSON file storage
* **Security** - Rate limiting, input validation, and secure file handling

### Frontend (React)

* **React 18** - Modern component-based UI architecture
* **Monaco Editor** - VS Code's editor component with extensive features
* **Split Panes** - Resizable UI layout for optimal workspace management
* **Terminal Output** - Real-time display of code execution results
* **Chat Interface** - AI assistant with message formatting and code extraction
* **File Browser** - Visual file management with grouping and search/load projects
* **Robust API Client** - Automatic retries with exponential backoff and multiple endpoint attempts

## 🛡️ Comprehensive Fallback Mechanisms

This platform is designed with robustness as a core principle, implementing multiple layers of fallbacks for all critical components:

### Code Execution Fallbacks

1. **Primary**: Backend subprocess execution with proper isolation and timeouts
2. **Fallback 1**: Restricted subprocess with limited permissions
3. **Fallback 2**: In-process execution with safety constraints
4. **Fallback 3**: Client-side execution (JavaScript in browser, Python with Pyodide)
5. **Fallback 4**: Preview mode for HTML/CSS when execution isn't possible

### API Connectivity Fallbacks

1. **Primary**: Direct API client communication with backend
2. **Fallback 1**: Raw fetch requests to multiple endpoint URLs
3. **Fallback 2**: Automatic retry with exponential backoff
4. **Fallback 3**: Cache response data when backend is unavailable

### Database Fallbacks

1. **Primary**: PostgreSQL or MySQL database
2. **Fallback 1**: SQLite local database
3. **Fallback 2**: In-memory database
4. **Fallback 3**: Local JSON file storage

### AI Assistant Fallbacks

1. **Primary**: Local Ollama with CodeLlama model
2. **Fallback 1**: Alternative local model (if available)
3. **Fallback 2**: Template-based responses for common queries
4. **Fallback 3**: Basic syntax assistance without AI

### Multi-Agent System Fallbacks

1. **Primary**: Multiple distributed API agents with configurable consensus strategies
2. **Fallback 1**: Backup API endpoints for each registered agent
3. **Fallback 2**: Local model fallback when external APIs are unavailable
4. **Fallback 3**: Rule-based response synthesis for critical scenarios
5. **Fallback 4**: Offline queuing with automatic retry when connectivity returns
6. **Fallback 5**: Cached previous responses with confidence metrics

### Status Handling

- **Healthy**: All systems operational
- **Degraded**: Core functionality available with some services using fallbacks
- **Critical**: Minimal functionality available, emergency fallbacks active

This multi-layered approach ensures that the platform remains operational even when facing connectivity issues, service outages, or resource constraints.

---

## File Structure
```
/project-root
│
├── backend/
│   ├── main.py                # FastAPI app
│   ├── ollama_client.py       # Connect to local Ollama API
│   ├── executor.py            # Run code in Docker
│   ├── file_manager.py        # Save/load project files
│   ├── agent_orchestrator.py  # Multi-agent consensus system
│   ├── agent_api.py           # Multi-agent API endpoints
│   └── requirements.txt       # Backend dependencies
│
├── frontend/
│   ├── public/
│   │   └── index.html         # HTML entrypoint
│   ├── src/
│   │   ├── index.js           # React entrypoint
│   │   ├── App.jsx            # Main React component
│   │   ├── App.css            # Basic styling
│   │   ├── Editor.jsx         # Monaco editor component
│   │   ├── Terminal.jsx       # Code output display
│   │   ├── FileBrowser.jsx    # File management UI
│   │   ├── ChatPanel.jsx      # AI chat assistant
│   │   ├── AgentConsensusPanel.jsx # Multi-agent UI
│   │   ├── api.js             # API helper functions
│   │   └── agent-consensus-api.js # Multi-agent API client
│   └── package.json           # Frontend dependencies
│
├── docker/
│   ├── Dockerfile             # Sandbox runtime for code execution
│   └── run.sh                 # Entrypoint for sandbox container
│
├── .env                       # Environment variables
├── docker-compose.yml         # Local orchestration
└── README.md                  # This file
```

---

## 🚦 Getting Started

For quick setup instructions, see [GETTING_STARTED.md](./GETTING_STARTED.md)

### Prerequisites

* **Python 3.10+** - For the FastAPI backend
* **Node.js 16+** - For the React frontend
* **Docker** - For containerized execution (with fallback to local execution)
* **Ollama** - For local LLM functionality (with fallback responses if unavailable)

### Quick Installation

#### Option 1: Windows Setup
```batch
git clone https://github.com/yourusername/local-ai-coding-platform.git
cd local-ai-coding-platform
run.bat
```

#### Option 2: Unix/Linux/Mac Setup
```bash
git clone https://github.com/yourusername/local-ai-coding-platform.git
cd local-ai-coding-platform
chmod +x run.sh
./run.sh
```

#### Option 3: Manual Setup

1. Start Ollama (optional but recommended for AI features)
   ```bash
   ollama pull codellama:instruct
   ollama run codellama:instruct
   ```

2. Start the backend
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. Start the frontend
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## ⚙️ Configuration

Configure the application by modifying the `.env` file:

```
# Ollama settings with fallback mechanism
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=codellama:instruct
OLLAMA_TIMEOUT=10
OLLAMA_MAX_RETRIES=3

# Backend settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Frontend settings
REACT_APP_API_URL=http://localhost:8000

# Project settings with fallback directories
PROJECT_DIR=./projects
BACKUP_DIR=./backups
TEMP_DIR=./temp

# Docker execution settings with resource limits
DOCKER_MEMORY_LIMIT=512m
DOCKER_CPU_LIMIT=1.0
DOCKER_TIMEOUT=30

# Database configuration with cascade fallbacks
DB_TYPE=postgres    # Options: postgres, sqlite, json
DB_PATH=./data/coder.db    # SQLite database path
JSON_DB_PATH=./data/db.json    # JSON fallback database path

# PostgreSQL configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coder
DB_USER=postgres
DB_PASSWORD=yourpassword
DATABASE_URL=    # Optional: full connection string (overrides individual settings)

# PostgreSQL connection pooling
DB_POOL_MIN=1
DB_POOL_MAX=10

# Database fault tolerance settings
DB_MAX_RETRIES=3
DB_RETRY_DELAY=0.5

```

## AILang Adapter System

A comprehensive system for integrating, monitoring, and automatically updating the AILang domain-specific language adapter within a Python/FastAPI backend and React frontend multi-agent orchestration system.

## Overview

The AILang Adapter System provides tools to maintain compatibility between your application and the evolving AILang domain-specific language. It consists of several components:

### Backend Components

1. **AILang Python Adapter**: Interprets AILang model definitions for use in Python applications
2. **AILang Monitoring Script**: Monitors the AILang GitHub repository for changes
3. **AILang Adapter Updater**: Automatically updates the adapter based on detected changes
4. **AILang Auto Update Integration**: Combines monitoring and updating for seamless automation

### Frontend Components

1. **AILang JavaScript Adapter**: Interprets AILang model definitions for use in React applications
2. **AILang React Components**: UI components for visualizing and interacting with AILang models
3. **AILang Dashboard**: Web interface for monitoring adapter status and logs

### Deployment Options

1. **Linux Service**: Systemd service for continuous background operation
2. **Windows Scripts**: Batch and PowerShell scripts for Windows environments
3. **Docker Containers**: Containerized deployment for consistent operation across platforms

## Installation

### Backend Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Frontend Installation

1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Build the frontend:
   ```bash
   npm run build
   ```

## Usage

### Python Adapter Usage

```python
from backend.ailang_adapter.adapter import AILangAdapter

# Initialize the adapter
adapter = AILangAdapter()

# Load an AILang model definition
model = adapter.load_model("path/to/model.ailang")

# Execute a task defined in the model
result = model.execute_task("task_name", {
    "input_param": "value"
})

print(result)
```

### JavaScript Adapter Usage

```javascript
import { AILangAdapter } from './ailang_adapter';

// Initialize the adapter
const adapter = new AILangAdapter();

// Load an AILang model definition
adapter.loadModel('path/to/model.ailang')
  .then(model => {
    // Execute a task defined in the model
    return model.executeTask('task_name', {
      inputParam: 'value'
    });
  })
  .then(result => {
    console.log(result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## Monitoring and Auto-Update

### Linux Service

1. Install the systemd service:
   ```bash
   sudo cp backend/tools/ailang-auto-update.service /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

2. Start the service:
   ```bash
   sudo systemctl start ailang-auto-update
   sudo systemctl enable ailang-auto-update
   ```

3. Check service status:
   ```bash
   sudo systemctl status ailang-auto-update
   ```

### Windows Scripts

#### Using Batch Script

1. Run the batch script manually:
   ```cmd
   cd backend\tools
   ailang_auto_update.bat
   ```

2. Set up a scheduled task:
   ```cmd
   schtasks /create /tn "AILang Auto Update" /tr "C:\path\to\ailang_auto_update.bat" /sc daily /st 03:00
   ```

#### Using PowerShell Script

1. Run the script once:
   ```powershell
   .\ailang_auto_update.ps1 -RunOnce
   ```

2. Install as a Windows service:
   ```powershell
   .\ailang_auto_update.ps1 -Install
   ```

3. Start the service:
   ```powershell
   .\ailang_auto_update.ps1 -Start
   ```

4. Check service status:
   ```powershell
   .\ailang_auto_update.ps1 -Status
   ```

### Docker Deployment

1. Build and start the containers:
   ```bash
   docker-compose -f docker-compose.ailang.yml up -d
   ```

2. Check container logs:
   ```bash
   docker-compose -f docker-compose.ailang.yml logs -f
   ```

3. Access the dashboard:
   ```
   http://localhost:8080
   ```

## Configuration

The auto-update system can be configured using a JSON configuration file. By default, it looks for `backend/config/ailang_config.json`:

```json
{
  "github": {
    "repo_owner": "ailang-org",
    "repo_name": "ailang",
    "token": "your_github_token"
  },
  "update_policy": {
    "update_on_minor_changes": true,
    "update_on_major_changes": true,
    "update_on_releases": true
  },
  "notifications": {
    "email": {
      "enabled": true,
      "recipient": "your_email@example.com",
      "smtp_server": "smtp.gmail.com",
      "smtp_port": 587,
      "smtp_username": "your_username",
      "smtp_password": "your_password"
    },
    "slack": {
      "enabled": true,
      "webhook_url": "your_slack_webhook_url"
    }
  },
  "logging": {
    "level": "INFO",
    "file": "backend/logs/ailang_auto_update.log"
  },
  "check_interval": 86400
}
```

## Example AILang Model Definition

```
// Example AILang model for agent orchestration
model AgentOrchestrator {
  // Define agent types
  agent ResearchAgent {
    capabilities: ["web_search", "document_analysis", "information_extraction"];
    provider: "openai";
    model: "gpt-4";
  }
  
  agent CodingAgent {
    capabilities: ["code_generation", "code_review", "debugging"];
    provider: "openai";
    model: "gpt-4";
    fallback_provider: "anthropic";
    fallback_model: "claude-2";
  }
  
  // Define tasks
  task research_topic {
    input: {
      topic: string,
      depth: number = 3
    };
    agent: ResearchAgent;
    steps: [
      "Search for information about {topic}",
      "Analyze top {depth} results",
      "Extract key insights"
    ];
    output: {
      insights: array,
      sources: array
    };
  }
  
  task generate_code {
    input: {
      language: string,
      requirements: string,
      tests: boolean = true
    };
    agent: CodingAgent;
    steps: [
      "Analyze requirements",
      "Generate code in {language}",
      "If {tests}, generate unit tests"
    ];
    output: {
      code: string,
      tests: string,
      explanation: string
    };
  }
  
  // Define workflow
  workflow build_project {
    input: {
      project_name: string,
      description: string
    };
    steps: [
      {
        task: research_topic,
        input: {
          topic: "{description}",
          depth: 5
        },
        output: "research_results"
      },
      {
        task: generate_code,
        input: {
          language: "python",
          requirements: "{description}\nResearch insights: {research_results.insights}",
          tests: true
        },
        output: "implementation"
      }
    ];
    output: {
      project_name: "{project_name}",
      research: "{research_results}",
      implementation: "{implementation}"
    };
  }
}
```

## Development

### Adding New Features to the Adapter

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for your changes
5. Submit a pull request

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### Common Issues

1. **Adapter fails to update**
   - Check the logs in `backend/logs/ailang_auto_update.log`
   - Verify GitHub API access and token validity
   - Ensure the adapter has write permissions to its directory

2. **Service fails to start**
   - Check system logs: `journalctl -u ailang-auto-update`
   - Verify Python environment and dependencies
   - Check file permissions

3. **Dashboard not showing data**
   - Verify the backend service is running
   - Check browser console for errors
   - Ensure API endpoints are accessible

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- AILang project contributors
- OpenAI for API integration
- The open-source community for various tools and libraries used in this project
