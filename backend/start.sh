#!/bin/bash

# Define the port for the backend
PORT=8000

# Kill any process running on the port
echo "Checking for processes on port $PORT..."
PID=$(lsof -t -i:$PORT)
if [ -n "$PID" ]; then
    echo "Killing process $PID on port $PORT..."
    kill -9 $PID
    echo "Process killed."
else
    echo "No process found on port $PORT."
fi

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created."
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the backend server with fallback mechanisms
echo "Starting backend server on port $PORT..."
uvicorn main:app --reload --host 0.0.0.0 --port $PORT

# Deactivate virtual environment on exit
deactivate
