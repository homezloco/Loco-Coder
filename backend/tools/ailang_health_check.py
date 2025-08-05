#!/usr/bin/env python3
"""
AILang Adapter Health Check Script

This script performs comprehensive health checks on the AILang adapter system
and reports the status in a format suitable for container orchestration platforms.

Usage:
  python ailang_health_check.py [--mode=full|basic] [--format=json|text|prometheus]

Options:
  --mode      Check mode: 'basic' for quick status or 'full' for comprehensive check (default: basic)
  --format    Output format: 'json', 'text', or 'prometheus' metrics (default: json)
  --timeout   Timeout in seconds for checks (default: 5)
"""

import argparse
import json
import logging
import os
import socket
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ailang_health_check")

# Default paths and settings
DEFAULT_CONFIG_PATH = os.environ.get(
    "AILANG_CONFIG_PATH", "/app/backend/config/ailang_config.json"
)
DEFAULT_LOG_PATH = os.environ.get(
    "AILANG_LOG_PATH", "/app/backend/logs/ailang_auto_update.log"
)
DEFAULT_VERSION_PATH = os.environ.get(
    "AILANG_VERSION_PATH", "/app/backend/ailang_adapter/version.json"
)
DEFAULT_API_HOST = os.environ.get("AILANG_API_HOST", "localhost")
DEFAULT_API_PORT = int(os.environ.get("AILANG_API_PORT", "8000"))


class HealthCheck:
    """Main health check class for AILang adapter system."""

    def __init__(
        self,
        config_path: str = DEFAULT_CONFIG_PATH,
        log_path: str = DEFAULT_LOG_PATH,
        version_path: str = DEFAULT_VERSION_PATH,
        api_host: str = DEFAULT_API_HOST,
        api_port: int = DEFAULT_API_PORT,
        timeout: int = 5,
    ):
        """Initialize the health check with paths and settings."""
        self.config_path = Path(config_path)
        self.log_path = Path(log_path)
        self.version_path = Path(version_path)
        self.api_host = api_host
        self.api_port = api_port
        self.timeout = timeout
        self.status = {
            "timestamp": datetime.now().isoformat(),
            "status": "unknown",
            "components": {},
            "details": {},
        }

    def check_filesystem(self) -> Dict:
        """Check if required files and directories exist and are accessible."""
        result = {"status": "ok", "details": {}}

        # Check config file
        if not self.config_path.exists():
            result["status"] = "warning"
            result["details"]["config"] = "Config file not found"
        else:
            try:
                with open(self.config_path, "r") as f:
                    config = json.load(f)
                result["details"]["config"] = "Config file valid"
            except (json.JSONDecodeError, IOError) as e:
                result["status"] = "error"
                result["details"]["config"] = f"Config file error: {str(e)}"

        # Check log file and directory
        log_dir = self.log_path.parent
        if not log_dir.exists():
            result["status"] = "warning"
            result["details"]["logs_dir"] = "Log directory not found"
        elif not os.access(log_dir, os.W_OK):
            result["status"] = "error"
            result["details"]["logs_dir"] = "Log directory not writable"
        else:
            result["details"]["logs_dir"] = "Log directory accessible"

        # Check version file
        if not self.version_path.exists():
            result["status"] = "warning"
            result["details"]["version"] = "Version file not found"
        else:
            try:
                with open(self.version_path, "r") as f:
                    version_data = json.load(f)
                result["details"]["version"] = f"Version: {version_data.get('version', 'unknown')}"
            except (json.JSONDecodeError, IOError) as e:
                result["status"] = "warning"
                result["details"]["version"] = f"Version file error: {str(e)}"

        return result

    def check_process(self) -> Dict:
        """Check if the AILang adapter process is running."""
        result = {"status": "ok", "details": {}}

        # Check for process using port
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((self.api_host, self.api_port))
            sock.close()
            result["details"]["process"] = "Service is listening on port"
        except (socket.timeout, ConnectionRefusedError):
            result["status"] = "error"
            result["details"]["process"] = f"Service not listening on {self.api_host}:{self.api_port}"
        except Exception as e:
            result["status"] = "error"
            result["details"]["process"] = f"Error checking process: {str(e)}"

        return result

    def check_logs(self) -> Dict:
        """Check log file for errors and activity."""
        result = {"status": "ok", "details": {}}

        if not self.log_path.exists():
            result["status"] = "warning"
            result["details"]["log_file"] = "Log file not found"
            return result

        try:
            # Check log file modification time
            mtime = datetime.fromtimestamp(self.log_path.stat().st_mtime)
            age = datetime.now() - mtime
            
            if age > timedelta(days=2):
                result["status"] = "warning"
                result["details"]["log_activity"] = f"Log file not updated in {age.days} days"
            else:
                result["details"]["log_activity"] = f"Log last updated {age.seconds // 3600} hours ago"

            # Check for errors in the last 20 lines
            error_count = 0
            with open(self.log_path, "r") as f:
                # Get last 20 lines
                lines = f.readlines()[-20:]
                for line in lines:
                    if "ERROR" in line or "CRITICAL" in line:
                        error_count += 1

            if error_count > 5:
                result["status"] = "error"
                result["details"]["log_errors"] = f"Found {error_count} errors in recent logs"
            elif error_count > 0:
                result["status"] = "warning"
                result["details"]["log_errors"] = f"Found {error_count} errors in recent logs"
            else:
                result["details"]["log_errors"] = "No recent errors in logs"

        except Exception as e:
            result["status"] = "warning"
            result["details"]["logs"] = f"Error checking logs: {str(e)}"

        return result

    def check_version(self) -> Dict:
        """Check version file for compatibility information."""
        result = {"status": "ok", "details": {}}

        if not self.version_path.exists():
            result["status"] = "warning"
            result["details"]["version"] = "Version file not found"
            return result

        try:
            with open(self.version_path, "r") as f:
                version_data = json.load(f)
            
            version = version_data.get("version", "unknown")
            last_update = version_data.get("last_update", "unknown")
            ailang_version = version_data.get("ailang_version", "unknown")
            
            result["details"]["adapter_version"] = f"Adapter version: {version}"
            result["details"]["ailang_version"] = f"AILang version: {ailang_version}"
            result["details"]["last_update"] = f"Last update: {last_update}"
            
            # Check if update is too old (more than 30 days)
            if last_update != "unknown":
                try:
                    update_date = datetime.fromisoformat(last_update)
                    age = datetime.now() - update_date
                    if age > timedelta(days=30):
                        result["status"] = "warning"
                        result["details"]["update_age"] = f"Adapter not updated in {age.days} days"
                except (ValueError, TypeError):
                    result["details"]["update_age"] = "Could not parse last update date"
            
        except (json.JSONDecodeError, IOError) as e:
            result["status"] = "warning"
            result["details"]["version"] = f"Version file error: {str(e)}"

        return result

    def check_api(self) -> Dict:
        """Check if the API is responsive."""
        result = {"status": "ok", "details": {}}

        try:
            # Simple socket connection to check if API is up
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            
            start_time = time.time()
            sock.connect((self.api_host, self.api_port))
            response_time = time.time() - start_time
            
            sock.close()
            
            result["details"]["api"] = "API is responsive"
            result["details"]["response_time"] = f"{response_time:.3f} seconds"
            
            if response_time > 1.0:
                result["status"] = "warning"
                result["details"]["performance"] = "API response time is slow"
                
        except socket.timeout:
            result["status"] = "error"
            result["details"]["api"] = "API timeout"
        except ConnectionRefusedError:
            result["status"] = "error"
            result["details"]["api"] = "API connection refused"
        except Exception as e:
            result["status"] = "error"
            result["details"]["api"] = f"API check error: {str(e)}"

        return result

    def run_basic_check(self) -> Dict:
        """Run basic health checks."""
        self.status["components"]["filesystem"] = self.check_filesystem()
        self.status["components"]["process"] = self.check_process()
        
        # Determine overall status
        if any(comp["status"] == "error" for comp in self.status["components"].values()):
            self.status["status"] = "error"
        elif any(comp["status"] == "warning" for comp in self.status["components"].values()):
            self.status["status"] = "warning"
        else:
            self.status["status"] = "ok"
            
        return self.status

    def run_full_check(self) -> Dict:
        """Run comprehensive health checks."""
        # Run basic checks first
        self.run_basic_check()
        
        # Add additional checks
        self.status["components"]["logs"] = self.check_logs()
        self.status["components"]["version"] = self.check_version()
        self.status["components"]["api"] = self.check_api()
        
        # Determine overall status
        if any(comp["status"] == "error" for comp in self.status["components"].values()):
            self.status["status"] = "error"
        elif any(comp["status"] == "warning" for comp in self.status["components"].values()):
            self.status["status"] = "warning"
        else:
            self.status["status"] = "ok"
            
        return self.status

    def format_output(self, format_type: str) -> str:
        """Format the health check results in the specified format."""
        if format_type == "json":
            return json.dumps(self.status, indent=2)
        
        elif format_type == "text":
            lines = [
                f"AILang Adapter Health Check - {datetime.now().isoformat()}",
                f"Overall Status: {self.status['status'].upper()}",
                "-" * 50
            ]
            
            for component_name, component_data in self.status["components"].items():
                lines.append(f"{component_name.upper()}: {component_data['status'].upper()}")
                for detail_name, detail_value in component_data["details"].items():
                    lines.append(f"  - {detail_name}: {detail_value}")
                lines.append("")
                
            return "\n".join(lines)
        
        elif format_type == "prometheus":
            metrics = []
            
            # Overall status metric
            status_value = 0
            if self.status["status"] == "ok":
                status_value = 2
            elif self.status["status"] == "warning":
                status_value = 1
            
            metrics.append(f'ailang_health_status{{component="overall"}} {status_value}')
            
            # Component status metrics
            for component_name, component_data in self.status["components"].items():
                status_value = 0
                if component_data["status"] == "ok":
                    status_value = 2
                elif component_data["status"] == "warning":
                    status_value = 1
                
                metrics.append(f'ailang_health_status{{component="{component_name}"}} {status_value}')
            
            # Response time if available
            if "api" in self.status["components"] and "response_time" in self.status["components"]["api"]["details"]:
                try:
                    response_time = float(self.status["components"]["api"]["details"]["response_time"].split()[0])
                    metrics.append(f'ailang_api_response_time_seconds {response_time}')
                except (ValueError, IndexError):
                    pass
            
            return "\n".join(metrics)
        
        else:
            return f"Unsupported format: {format_type}"


def main():
    """Main entry point for the health check script."""
    parser = argparse.ArgumentParser(description="AILang Adapter Health Check")
    parser.add_argument(
        "--mode",
        choices=["basic", "full"],
        default="basic",
        help="Check mode: 'basic' for quick status or 'full' for comprehensive check",
    )
    parser.add_argument(
        "--format",
        choices=["json", "text", "prometheus"],
        default="json",
        help="Output format: 'json', 'text', or 'prometheus' metrics",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=5,
        help="Timeout in seconds for checks",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=DEFAULT_CONFIG_PATH,
        help="Path to config file",
    )
    parser.add_argument(
        "--log-path",
        type=str,
        default=DEFAULT_LOG_PATH,
        help="Path to log file",
    )
    parser.add_argument(
        "--version-path",
        type=str,
        default=DEFAULT_VERSION_PATH,
        help="Path to version file",
    )
    parser.add_argument(
        "--api-host",
        type=str,
        default=DEFAULT_API_HOST,
        help="API host to check",
    )
    parser.add_argument(
        "--api-port",
        type=int,
        default=DEFAULT_API_PORT,
        help="API port to check",
    )
    
    args = parser.parse_args()
    
    health_check = HealthCheck(
        config_path=args.config,
        log_path=args.log_path,
        version_path=args.version_path,
        api_host=args.api_host,
        api_port=args.api_port,
        timeout=args.timeout,
    )
    
    if args.mode == "basic":
        health_check.run_basic_check()
    else:
        health_check.run_full_check()
    
    output = health_check.format_output(args.format)
    print(output)
    
    # Exit with appropriate status code
    if health_check.status["status"] == "error":
        sys.exit(1)
    elif health_check.status["status"] == "warning":
        sys.exit(0)  # Warning doesn't fail the check for orchestration platforms
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
