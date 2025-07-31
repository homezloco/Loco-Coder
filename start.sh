#!/bin/bash

# Master startup script with fallbacks for both frontend and backend

# Set default environment variables with fallbacks
export BACKEND_PORT=${BACKEND_PORT:-8000}
export FRONTEND_PORT=${FRONTEND_PORT:-3000}
export BACKEND_HOST=${BACKEND_HOST:-0.0.0.0}
export NODE_ENV=${NODE_ENV:-development}

# Create logs directory if it doesn't exist
mkdir -p ./logs

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Coder application with fallback mechanisms${NC}"
echo -e "${YELLOW}Checking system requirements...${NC}"

# Function to start backend with fallbacks
start_backend() {
  echo -e "${GREEN}Starting backend server...${NC}"
  cd backend || { echo -e "${RED}Backend directory not found, cannot start backend${NC}"; return 1; }
  
  # Check if virtual environment exists, create if not
  if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv || python -m venv venv || { echo -e "${RED}Failed to create virtual environment${NC}"; return 1; }
  fi
  
  # Activate virtual environment with fallbacks
  source venv/bin/activate || . venv/bin/activate || { echo -e "${RED}Failed to activate virtual environment${NC}"; return 1; }
  
  # Install dependencies if requirements.txt exists
  if [ -f "requirements.txt" ]; then
    echo -e "${YELLOW}Installing/updating Python dependencies...${NC}"
    pip install -r requirements.txt || { echo -e "${RED}Failed to install dependencies${NC}"; }
  fi
  
  # Start the backend server with fallbacks
  echo -e "${GREEN}Launching FastAPI backend on port $BACKEND_PORT${NC}"
  uvicorn main:app --reload --host $BACKEND_HOST --port $BACKEND_PORT &
  BACKEND_PID=$!
  
  # Check if backend started successfully
  sleep 2
  if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}Backend started successfully (PID: $BACKEND_PID)${NC}"
  else
    echo -e "${RED}Backend failed to start, attempting fallback...${NC}"
    python -m uvicorn main:app --reload --host $BACKEND_HOST --port $BACKEND_PORT &
    BACKEND_PID=$!
  fi
  
  cd ..
  return 0
}

# Function to start frontend with fallbacks
start_frontend() {
  echo -e "${GREEN}Starting frontend server...${NC}"
  cd frontend || { echo -e "${RED}Frontend directory not found, cannot start frontend${NC}"; return 1; }
  
  # Check for dependencies and install if needed
  if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install --legacy-peer-deps || { echo -e "${RED}Failed to install frontend dependencies${NC}"; return 1; }
  fi
  
  # Start the frontend server with fallbacks
  echo -e "${GREEN}Launching frontend on port $FRONTEND_PORT${NC}"
  npm run dev -- --port=$FRONTEND_PORT --host &
  FRONTEND_PID=$!
  
  # Check if frontend started successfully
  sleep 5
  if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}Frontend started successfully (PID: $FRONTEND_PID)${NC}"
  else
    echo -e "${RED}Frontend failed to start with npm, attempting fallback...${NC}"
    npx vite --port=$FRONTEND_PORT --host &
    FRONTEND_PID=$!
  fi
  
  cd ..
  return 0
}

# Main execution
echo -e "${YELLOW}Starting services with fallback mechanisms...${NC}"
start_backend
BACKEND_STATUS=$?

start_frontend
FRONTEND_STATUS=$?

# Check overall status and display URLs
if [ $BACKEND_STATUS -eq 0 ]; then
  echo -e "${GREEN}Backend available at:${NC} http://$BACKEND_HOST:$BACKEND_PORT"
else
  echo -e "${RED}Backend failed to start properly${NC}"
fi

if [ $FRONTEND_STATUS -eq 0 ]; then
  echo -e "${GREEN}Frontend available at:${NC} http://localhost:$FRONTEND_PORT"
  echo -e "${YELLOW}If localhost doesn't work, check your terminal for alternative URLs${NC}"
else
  echo -e "${RED}Frontend failed to start properly${NC}"
fi

echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for user to terminate
wait
