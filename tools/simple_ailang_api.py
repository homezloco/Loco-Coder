#!/usr/bin/env python3
"""
Simple AILang API Server

This is a minimal API server that provides mock data for the AILang dashboard.
It doesn't use Pydantic to avoid serialization issues with coroutines.

Usage:
    python simple_ailang_api.py

The server runs on port 8001 by default.
"""

import json
import http.server
import socketserver
import time
import random
import datetime
import argparse
from urllib.parse import urlparse, parse_qs

# Default port for the API server
DEFAULT_PORT = 8001

class SimpleAILangAPIHandler(http.server.BaseHTTPRequestHandler):
    """Simple HTTP request handler for AILang API."""
    
    def _set_headers(self, content_type="application/json"):
        """Set response headers."""
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")  # Enable CORS
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight."""
        self._set_headers()
    
    def do_GET(self):
        """Handle GET requests."""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        # Handle root endpoint
        if path == "/":
            self._set_headers()
            response = {"status": "ok", "message": "AILang API Server is running"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle health endpoint
        elif path == "/api/health":
            self._set_headers()
            response = {
                "status": "healthy",
                "details": {
                    "cpu_usage": random.randint(10, 40),
                    "memory_usage": random.randint(20, 60),
                    "disk_usage": random.randint(30, 70)
                }
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle logs endpoint
        elif path == "/api/logs":
            self._set_headers()
            query = parse_qs(parsed_url.query)
            lines = int(query.get("lines", ["10"])[0])
            
            log_levels = ["INFO", "WARNING", "ERROR", "DEBUG"]
            log_messages = [
                "AILang model loaded successfully",
                "Processing agent task",
                "Failed to connect to external service",
                "Task completed in 1.2s",
                "Memory usage above threshold",
                "New model version available",
                "Agent response received",
                "Cache hit ratio: 78%",
                "API request processed",
                "Background task scheduled"
            ]
            
            logs = []
            for i in range(lines):
                timestamp = (datetime.datetime.now() - 
                           datetime.timedelta(minutes=i*5)).strftime("%Y-%m-%d %H:%M:%S")
                level = random.choice(log_levels)
                message = random.choice(log_messages)
                logs.append({
                    "timestamp": timestamp,
                    "level": level,
                    "message": message
                })
            
            response = {"logs": logs}
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle version endpoint
        elif path == "/api/version":
            self._set_headers()
            response = {
                "version": "0.3.2",
                "last_updated": (datetime.datetime.now() - 
                               datetime.timedelta(days=3)).strftime("%Y-%m-%d"),
                "update_available": random.choice([True, False])
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle update endpoint
        elif path == "/api/update":
            self._set_headers()
            response = {
                "status": "success",
                "message": "Update process started",
                "details": {
                    "previous_version": "0.3.1",
                    "new_version": "0.3.2",
                    "update_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle unknown endpoints
        else:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"error": "Not found", "path": path}
            self.wfile.write(json.dumps(response).encode())
            return

def run_server(port=DEFAULT_PORT):
    """Run the API server on the specified port."""
    server_address = ("", port)
    
    try:
        with socketserver.TCPServer(server_address, SimpleAILangAPIHandler) as httpd:
            print(f"Starting AILang API server on port {port}...")
            print(f"API endpoints available at:")
            print(f"  http://localhost:{port}/")
            print(f"  http://localhost:{port}/api/health")
            print(f"  http://localhost:{port}/api/logs")
            print(f"  http://localhost:{port}/api/version")
            print(f"  http://localhost:{port}/api/update")
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
    parser = argparse.ArgumentParser(description="Simple AILang API Server")
    parser.add_argument("-p", "--port", type=int, default=DEFAULT_PORT,
                        help=f"Port to run the server on (default: {DEFAULT_PORT})")
    args = parser.parse_args()
    
    run_server(args.port)
