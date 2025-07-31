#!/bin/bash
# Startup script for Local AI Coding Platform

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "  _                     _      _    _____          _ _               ____  _         _    __                   "
echo " | |    ___   ___ __ _| |    / \  |_   _|   ___  | | | __ _ _ __ __|___ \| |_   _  / \  / _\_   _  __ _       "
echo " | |   / _ \ / __/ _\` | |   / _ \   | |    / _ \ | | |/ _\` | '_ \`__ \__) | | | | |/ _ \ \\ \\ | | | |/ _\` |  "
echo " | |__| (_) | (_| (_| | |  / ___ \  | |   | (_) || | | (_| | | | | | / __/| | |_| / ___ \_\ \| |_| | (_| |     "
echo " |_____\___/ \___\__,_|_| /_/   \_\ |_|    \___/ |_|_|\__,_|_| |_| |_____||_|\__, /_/   \_\__/\__,_|\__, |     "
echo "                                                                              |___/                 |___/      "
echo -e "${NC}"
echo -e "${GREEN}Local AI Coding Platform - Startup Script${NC}\n"

# Function to handle errors with fallback
function run_with_fallback() {
    "$@"
    local status=$?
    if [ $status -ne 0 ]; then
        echo -e "${YELLOW}Command '$*' failed with status $status. Attempting fallback...${NC}"
        return $status
    fi
    return 0
}

# Check for Docker
echo -e "${BLUE}Checking for Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Will run components individually.${NC}"
    USE_DOCKER=false
else
    echo -e "${GREEN}Docker found!${NC}"
    USE_DOCKER=true
fi

# Check for Docker Compose
if $USE_DOCKER; then
    echo -e "${BLUE}Checking for Docker Compose...${NC}"
    if docker compose version &> /dev/null || docker-compose --version &> /dev/null; then
        echo -e "${GREEN}Docker Compose found!${NC}"
        HAS_DOCKER_COMPOSE=true
    else
        echo -e "${YELLOW}Docker Compose not found. Will run Docker containers individually.${NC}"
        HAS_DOCKER_COMPOSE=false
    fi
fi

# Check for Ollama
echo -e "${BLUE}Checking for Ollama...${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama not found. AI features will use fallback responses.${NC}"
    HAS_OLLAMA=false
else
    echo -e "${GREEN}Ollama found!${NC}"
    HAS_OLLAMA=true
fi

# Function to start Ollama
start_ollama() {
    if $HAS_OLLAMA; then
        echo -e "${BLUE}Starting Ollama with CodeLlama model...${NC}"
        # Check if model exists
        if ! ollama list | grep -q "codellama"; then
            echo -e "${YELLOW}CodeLlama model not found. Pulling now (this may take a while)...${NC}"
            run_with_fallback ollama pull codellama:instruct
        fi
        
        # Start Ollama in background
        echo -e "${GREEN}Starting Ollama service...${NC}"
        run_with_fallback ollama serve &
        sleep 2
    else
        echo -e "${YELLOW}Skipping Ollama startup (not installed).${NC}"
    fi
}

# Function to start the project with Docker Compose
start_with_docker_compose() {
    echo -e "${BLUE}Starting all services with Docker Compose...${NC}"
    
    # Pull images first to avoid timeout issues
    echo -e "${BLUE}Pulling required Docker images...${NC}"
    run_with_fallback docker-compose pull
    
    # Start the services
    echo -e "${BLUE}Starting services...${NC}"
    run_with_fallback docker-compose up --build
}

# Function to start the project with individual Docker containers
start_with_docker_individual() {
    echo -e "${BLUE}Starting services with individual Docker containers...${NC}"
    
    # Create a network
    echo -e "${BLUE}Creating Docker network...${NC}"
    run_with_fallback docker network create coder-network
    
    # Start Backend
    echo -e "${BLUE}Building and starting backend container...${NC}"
    run_with_fallback docker build -t coder-backend ./backend
    run_with_fallback docker run -d --name coder-backend \
        --network coder-network \
        -p 8000:8000 \
        -v "$(pwd)/projects:/app/projects" \
        coder-backend
    
    # Start Frontend
    echo -e "${BLUE}Building and starting frontend container...${NC}"
    run_with_fallback docker build -t coder-frontend ./frontend
    run_with_fallback docker run -d --name coder-frontend \
        --network coder-network \
        -p 3000:3000 \
        coder-frontend
        
    echo -e "${GREEN}Services started! Frontend available at: http://localhost:3000${NC}"
}

# Function to start without Docker
start_without_docker() {
    echo -e "${BLUE}Starting services locally without Docker...${NC}"
    
    # Start backend
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd backend || exit
    run_with_fallback pip install -r requirements.txt
    
    # Start backend in background
    echo -e "${BLUE}Starting backend server...${NC}"
    run_with_fallback python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    cd ..
    
    # Wait for backend to be ready
    echo -e "${BLUE}Waiting for backend to start...${NC}"
    sleep 3
    
    # Start frontend
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd frontend || exit
    run_with_fallback npm install
    
    # Start frontend in foreground
    echo -e "${BLUE}Starting frontend development server...${NC}"
    run_with_fallback npm run dev
}

# Main execution flow with fallback mechanisms
echo -e "${BLUE}Starting Local AI Coding Platform...${NC}"

# Start Ollama if available (needed for AI features)
start_ollama

# Decide how to start the project based on available tools
if $USE_DOCKER; then
    if $HAS_DOCKER_COMPOSE; then
        start_with_docker_compose
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}Docker Compose failed. Trying individual containers...${NC}"
            start_with_docker_individual
            if [ $? -ne 0 ]; then
                echo -e "${YELLOW}Docker containers failed. Falling back to local execution...${NC}"
                start_without_docker
            fi
        fi
    else
        start_with_docker_individual
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}Docker containers failed. Falling back to local execution...${NC}"
            start_without_docker
        fi
    fi
else
    start_without_docker
fi

# Final message
echo -e "${GREEN}Local AI Coding Platform started successfully!${NC}"
echo -e "${GREEN}Access the platform at: http://localhost:3000${NC}"
echo -e "${GREEN}API available at: http://localhost:8000${NC}"
