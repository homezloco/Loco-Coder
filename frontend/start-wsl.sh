#!/bin/bash

# Kill any processes using port 5173
echo "Checking for processes on port 5173..."
if lsof -i :5173 >/dev/null 2>&1; then
    echo "Found processes using port 5173, attempting to terminate..."
    kill $(lsof -t -i:5173) 2>/dev/null || true
    sleep 1
fi

# Get the WSL IP address
WSL_IP=$(hostname -I | awk '{print $1}')

echo "Starting Vite development server..."
echo "Available on:"
echo "- http://localhost:5173"
echo "- http://127.0.0.1:5173"
echo "- http://$WSL_IP:5173"

# Start Vite with explicit host settings
HOST=0.0.0.0 npm run dev
