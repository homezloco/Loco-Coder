#!/usr/bin/env python
"""
AILang Development Monitor

This script monitors the AILang GitHub repository for updates and notifies when
the adapter might need updates to stay compatible with the latest AILang version.
"""

import os
import sys
import json
import time
import logging
import argparse
import datetime
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import requests
from requests.exceptions import RequestException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ailang_monitor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ailang_monitor")

# GitHub API constants
GITHUB_API_URL = "https://api.github.com"
AILANG_REPO = "ailang-org/ailang"  # Replace with actual repo when AILang is public
GITHUB_HEADERS = {
    "Accept": "application/vnd.github.v3+json"
}

# Local paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ADAPTER_DIR = PROJECT_ROOT / "ailang_adapter"
MONITOR_DATA_FILE = SCRIPT_DIR / "ailang_monitor_data.json"

# Default check interval (in seconds)
DEFAULT_CHECK_INTERVAL = 86400  # 24 hours


class AILangMonitor:
    """Monitor AILang development and detect changes that might affect the adapter"""
    
    def __init__(self, token: Optional[str] = None):
        """
        Initialize the AILang monitor
        
        Args:
            token: GitHub API token (optional)
        """
        self.headers = GITHUB_HEADERS.copy()
        if token:
            self.headers["Authorization"] = f"token {token}"
        
        # Load previous monitor data if it exists
        self.data = self._load_monitor_data()
    
    def _load_monitor_data(self) -> Dict[str, Any]:
        """Load monitor data from file"""
        if MONITOR_DATA_FILE.exists():
            try:
                with open(MONITOR_DATA_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error loading monitor data: {str(e)}")
        
        # Return default data if file doesn't exist or has errors
        return {
            "last_check": None,
            "last_commit_sha": None,
            "last_release_tag": None,
            "watched_files": [
                "docs/syntax.md",
                "examples/*.ail",
                "src/parser/*"
            ]
        }
    
    def _save_monitor_data(self) -> None:
        """Save monitor data to file"""
        try:
            with open(MONITOR_DATA_FILE, "w") as f:
                json.dump(self.data, f, indent=2)
        except IOError as e:
            logger.error(f"Error saving monitor data: {str(e)}")
    
    def get_latest_commit(self) -> Optional[Dict[str, Any]]:
        """Get the latest commit from the AILang repository"""
        try:
            url = f"{GITHUB_API_URL}/repos/{AILANG_REPO}/commits"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            commits = response.json()
            if commits and isinstance(commits, list) and len(commits) > 0:
                return commits[0]
            return None
        
        except RequestException as e:
            logger.error(f"Error fetching latest commit: {str(e)}")
            return None
    
    def get_latest_release(self) -> Optional[Dict[str, Any]]:
        """Get the latest release from the AILang repository"""
        try:
            url = f"{GITHUB_API_URL}/repos/{AILANG_REPO}/releases/latest"
            response = requests.get(url, headers=self.headers)
            
            # If there are no releases yet, the API returns 404
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            return response.json()
        
        except RequestException as e:
            logger.error(f"Error fetching latest release: {str(e)}")
            return None
    
    def get_file_changes(self, since_commit: str) -> List[Dict[str, Any]]:
        """
        Get files changed since a specific commit
        
        Args:
            since_commit: Commit SHA to compare against
            
        Returns:
            List of changed files
        """
        try:
            url = f"{GITHUB_API_URL}/repos/{AILANG_REPO}/compare/{since_commit}...HEAD"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            return data.get("files", [])
        
        except RequestException as e:
            logger.error(f"Error fetching file changes: {str(e)}")
            return []
    
    def check_for_updates(self) -> Tuple[bool, List[str]]:
        """
        Check for updates to the AILang repository
        
        Returns:
            Tuple of (needs_update, reasons)
        """
        needs_update = False
        update_reasons = []
        
        # Get the latest commit
        latest_commit = self.get_latest_commit()
        if not latest_commit:
            logger.warning("Could not fetch latest commit information")
            return False, ["Could not fetch latest commit information"]
        
        latest_commit_sha = latest_commit.get("sha")
        last_commit_sha = self.data.get("last_commit_sha")
        
        # If this is the first check or the commit hasn't changed, no update needed
        if not last_commit_sha:
            logger.info("First check, setting baseline commit")
            self.data["last_commit_sha"] = latest_commit_sha
            self._save_monitor_data()
            return False, ["First check, setting baseline"]
        
        if latest_commit_sha == last_commit_sha:
            logger.info("No new commits since last check")
            return False, ["No new commits"]
        
        # Get file changes since last checked commit
        changed_files = self.get_file_changes(last_commit_sha)
        
        # Check if any watched files were changed
        watched_patterns = self.data.get("watched_files", [])
        important_changes = []
        
        for file_change in changed_files:
            filename = file_change.get("filename", "")
            
            # Check if the file matches any watched pattern
            for pattern in watched_patterns:
                if "*" in pattern:
                    # Simple wildcard matching
                    prefix = pattern.split("*")[0]
                    if filename.startswith(prefix):
                        important_changes.append(filename)
                        break
                elif filename == pattern:
                    important_changes.append(filename)
                    break
        
        if important_changes:
            needs_update = True
            reason = f"Important files changed: {', '.join(important_changes)}"
            update_reasons.append(reason)
        
        # Check for new releases
        latest_release = self.get_latest_release()
        if latest_release:
            latest_tag = latest_release.get("tag_name")
            last_tag = self.data.get("last_release_tag")
            
            if latest_tag and latest_tag != last_tag:
                needs_update = True
                reason = f"New release: {latest_tag}"
                update_reasons.append(reason)
                self.data["last_release_tag"] = latest_tag
        
        # Update the last checked commit
        self.data["last_commit_sha"] = latest_commit_sha
        self.data["last_check"] = datetime.datetime.now().isoformat()
        self._save_monitor_data()
        
        return needs_update, update_reasons
    
    def analyze_compatibility(self) -> Dict[str, Any]:
        """
        Analyze compatibility between AILang and our adapter
        
        Returns:
            Dict with compatibility analysis
        """
        # Get the latest AILang syntax documentation
        try:
            url = f"https://raw.githubusercontent.com/{AILANG_REPO}/main/docs/syntax.md"
            response = requests.get(url)
            response.raise_for_status()
            syntax_doc = response.text
            
            # Check for syntax features we don't support yet
            unsupported_features = []
            
            # This is a simplified check - in a real implementation,
            # you would parse the syntax doc and compare with adapter capabilities
            keywords = ["agent", "task", "consensus", "parameters", "fallback"]
            for keyword in keywords:
                if keyword in syntax_doc and f"{keyword} {{" not in syntax_doc:
                    unsupported_features.append(f"New {keyword} syntax")
            
            return {
                "syntax_doc_length": len(syntax_doc),
                "unsupported_features": unsupported_features,
                "adapter_version": self._get_adapter_version()
            }
            
        except RequestException as e:
            logger.error(f"Error fetching syntax documentation: {str(e)}")
            return {
                "error": str(e),
                "adapter_version": self._get_adapter_version()
            }
    
    def _get_adapter_version(self) -> str:
        """Get the current adapter version"""
        version_file = ADAPTER_DIR / "version.py"
        if version_file.exists():
            try:
                with open(version_file, "r") as f:
                    for line in f:
                        if line.startswith("__version__"):
                            return line.split("=")[1].strip().strip('"\'')
            except IOError:
                pass
        
        return "unknown"
    
    def send_notification(self, reasons: List[str]) -> None:
        """
        Send a notification about needed updates
        
        Args:
            reasons: List of reasons why an update is needed
        """
        message = "AILang adapter may need updates:\n\n"
        message += "\n".join(f"- {reason}" for reason in reasons)
        
        logger.info(message)
        
        # Here you could implement additional notification methods:
        # - Send email
        # - Create a GitHub issue
        # - Send a Slack message
        # - etc.


def main() -> None:
    """Main function to run the AILang monitor"""
    parser = argparse.ArgumentParser(description="Monitor AILang development")
    parser.add_argument("--token", help="GitHub API token")
    parser.add_argument("--interval", type=int, default=DEFAULT_CHECK_INTERVAL,
                        help=f"Check interval in seconds (default: {DEFAULT_CHECK_INTERVAL})")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()
    
    monitor = AILangMonitor(token=args.token)
    
    if args.once:
        logger.info("Running AILang monitor once")
        needs_update, reasons = monitor.check_for_updates()
        
        if needs_update:
            logger.info("AILang adapter may need updates")
            monitor.send_notification(reasons)
            
            # Run compatibility analysis
            compatibility = monitor.analyze_compatibility()
            logger.info(f"Compatibility analysis: {json.dumps(compatibility, indent=2)}")
        else:
            logger.info("No updates needed")
    else:
        logger.info(f"Starting AILang monitor with interval {args.interval} seconds")
        
        while True:
            try:
                needs_update, reasons = monitor.check_for_updates()
                
                if needs_update:
                    logger.info("AILang adapter may need updates")
                    monitor.send_notification(reasons)
                    
                    # Run compatibility analysis
                    compatibility = monitor.analyze_compatibility()
                    logger.info(f"Compatibility analysis: {json.dumps(compatibility, indent=2)}")
                else:
                    logger.info("No updates needed")
                
                # Sleep until next check
                logger.info(f"Sleeping for {args.interval} seconds")
                time.sleep(args.interval)
                
            except KeyboardInterrupt:
                logger.info("AILang monitor stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in AILang monitor: {str(e)}")
                # Sleep for a shorter time on error
                time.sleep(min(args.interval, 3600))


if __name__ == "__main__":
    main()
