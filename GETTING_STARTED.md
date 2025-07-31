# Getting Started with Local AI Coding Platform

This guide will help you set up and run the Local AI Coding Platform on your machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Python 3.10+](https://www.python.org/downloads/)
- [Node.js 16+](https://nodejs.org/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Ollama](https://ollama.ai/) (for local LLM functionality)

## Option 1: Running Components Individually

### Step 1: Start Ollama (Optional but recommended for AI features)

Download and install Ollama from [ollama.ai](https://ollama.ai/), then run:

```bash
# Pull the CodeLlama model (one-time setup)
ollama pull codellama:instruct

# Run the Ollama server
ollama run codellama:instruct
```

### Step 2: Set Up the Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at [http://localhost:8000](http://localhost:8000).

### Step 3: Set Up the Frontend

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend application will be available at [http://localhost:3000](http://localhost:3000).

## Option 2: Using Docker Compose

For a one-command setup that includes all components:

```bash
# From the project root
docker-compose up
```

This will start:
- Backend API on [http://localhost:8000](http://localhost:8000)
- Frontend on [http://localhost:3000](http://localhost:3000) 
- Ollama service (pre-configured)

## Fallback Mechanisms

This platform incorporates multiple fallback mechanisms:

1. **API Connectivity**: Frontend gracefully handles backend API failures
2. **Code Execution**: Falls back to local execution if Docker is unavailable
3. **AI Integration**: Provides static responses if Ollama service is unreachable
4. **File Management**: Ensures data integrity with automatic backups

## Configuration Options

You can customize the platform by modifying the `.env` file:

```
# Backend settings
OLLAMA_URL=http://localhost:11434  # Change if Ollama runs elsewhere
OLLAMA_MODEL=codellama:instruct    # Use a different model if preferred

# Frontend settings  
REACT_APP_API_URL=http://localhost:8000  # Change if backend runs on different host/port
```

## Development Tips

- **Adding New Languages**: Extend `executor.py` to support additional programming languages
- **Customizing the Editor**: Modify `Editor.jsx` to adjust Monaco editor settings
- **API Extensions**: Add new routes to `main.py` to extend backend functionality

## Troubleshooting

### Common Issues

1. **Docker Issues**:
   - Ensure Docker daemon is running
   - Check for port conflicts with existing services

2. **Ollama Connection Failures**:
   - Verify Ollama is running with `ollama ps`
   - Check network connectivity to the Ollama service

3. **Dependencies**:
   - If you encounter module errors, verify all packages are installed:
     - Backend: `pip install -r requirements.txt`
     - Frontend: `npm install`

For more assistance, check the main README.md file or open an issue on the project repository.
