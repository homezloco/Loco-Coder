#!/bin/bash

# Define the port for the frontend (Vite default)
PORT=5173

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

# Install dependencies if node_modules doesn't exist or with force flag if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
else
    echo "Dependencies already installed. Use --reinstall flag to reinstall."
    if [ "$1" == "--reinstall" ]; then
        echo "Reinstalling dependencies..."
        npm install --legacy-peer-deps
    fi
fi

# Start the frontend development server
echo "Starting frontend server on port $PORT..."
npm run dev

# If npm run dev fails, provide fallback
if [ $? -ne 0 ]; then
    echo "Failed to start using npm run dev. Trying alternative method..."
    npx vite --port $PORT
fi
