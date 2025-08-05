#!/usr/bin/env python3
"""
Simple HTTP Server for AILang Dashboard

This script serves the standalone AILang dashboard HTML file on port 8080.
It's a simple alternative to running the full frontend development server.

Usage:
    python serve_ailang_dashboard.py

Requirements:
    - Python 3.x (no additional packages needed)
"""

import http.server
import socketserver
import os
import webbrowser
import argparse
from pathlib import Path

# Default port for the dashboard server
DEFAULT_PORT = 8080

def get_project_root():
    """Get the project root directory."""
    # Start from the current directory and go up until we find the frontend directory
    current_dir = Path(os.path.abspath(__file__)).parent
    while current_dir.name != "Coder" and current_dir != current_dir.parent:
        current_dir = current_dir.parent
    return current_dir

def serve_dashboard(port=DEFAULT_PORT):
    """Serve the AILang dashboard on the specified port."""
    # Get the project root directory
    project_root = get_project_root()
    frontend_dir = project_root / "frontend"
    
    # Check if the dashboard HTML file exists
    dashboard_file = frontend_dir / "ailang-dashboard.html"
    if not dashboard_file.exists():
        print(f"Error: Dashboard file not found at {dashboard_file}")
        return
    
    # Change to the frontend directory
    os.chdir(frontend_dir)
    
    # Create a simple HTTP server
    handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            dashboard_url = f"http://localhost:{port}/ailang-dashboard.html"
            print(f"Serving AILang dashboard at {dashboard_url}")
            
            # Open the dashboard in the default browser
            webbrowser.open(dashboard_url)
            
            # Start the server
            print("Press Ctrl+C to stop the server...")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Error: Port {port} is already in use. Try a different port.")
        else:
            print(f"Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve the AILang dashboard")
    parser.add_argument("-p", "--port", type=int, default=DEFAULT_PORT,
                        help=f"Port to serve the dashboard on (default: {DEFAULT_PORT})")
    args = parser.parse_args()
    
    serve_dashboard(args.port)
