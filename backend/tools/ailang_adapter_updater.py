#!/usr/bin/env python
"""
AILang Adapter Updater

This script automatically updates the AILang adapter based on changes detected
in the AILang repository. It can be run manually or triggered by the AILang monitor.
"""

import os
import sys
import json
import shutil
import logging
import argparse
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from ailang_adapter.version import __version__ as current_version

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ailang_adapter_updater.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ailang_adapter_updater")

# Local paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ADAPTER_DIR = PROJECT_ROOT / "ailang_adapter"
BACKUP_DIR = PROJECT_ROOT / "backups" / "ailang_adapter"
MONITOR_DATA_FILE = SCRIPT_DIR / "ailang_monitor_data.json"


class AILangAdapterUpdater:
    """Updates the AILang adapter based on changes in the AILang repository"""
    
    def __init__(self):
        """Initialize the AILang adapter updater"""
        # Ensure backup directory exists
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    
    def backup_current_adapter(self) -> str:
        """
        Create a backup of the current adapter
        
        Returns:
            Path to the backup directory
        """
        timestamp = subprocess.check_output(
            ["date", "+%Y%m%d_%H%M%S"], 
            universal_newlines=True
        ).strip()
        
        backup_path = BACKUP_DIR / f"adapter_backup_{timestamp}_v{current_version}"
        backup_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Backing up current adapter to {backup_path}")
        
        # Copy all Python files from the adapter directory
        for file_path in ADAPTER_DIR.glob("**/*.py"):
            # Get relative path from adapter directory
            rel_path = file_path.relative_to(ADAPTER_DIR)
            # Create target path in backup directory
            target_path = backup_path / rel_path
            # Ensure parent directories exist
            target_path.parent.mkdir(parents=True, exist_ok=True)
            # Copy the file
            shutil.copy2(file_path, target_path)
        
        logger.info(f"Backup completed: {backup_path}")
        return str(backup_path)
    
    def update_parser(self) -> bool:
        """
        Update the AILang parser based on latest syntax
        
        Returns:
            True if the parser was updated, False otherwise
        """
        parser_file = ADAPTER_DIR / "ailang_parser.py"
        
        if not parser_file.exists():
            logger.error(f"Parser file not found: {parser_file}")
            return False
        
        logger.info("Updating AILang parser...")
        
        # In a real implementation, this would analyze the latest AILang syntax
        # and update the parser accordingly. For now, we'll just add support for
        # a hypothetical new syntax feature.
        
        try:
            # Read the current parser file
            with open(parser_file, "r") as f:
                parser_code = f.read()
            
            # Check if we need to update the parser
            if "def parse_import_statement" not in parser_code:
                # Add support for import statements (hypothetical new feature)
                new_parser_code = parser_code.replace(
                    "class AILangParser:",
                    """class AILangParser:
    def parse_import_statement(self, line: str) -> Dict[str, Any]:
        \"\"\"
        Parse an import statement
        
        Args:
            line: Line containing the import statement
            
        Returns:
            Dictionary with import information
        \"\"\"
        # Format: import "path/to/file.ail"
        match = re.match(r'import\\s+"([^"]+)"', line)
        if not match:
            raise ValueError(f"Invalid import statement: {line}")
        
        return {
            "type": "import",
            "path": match.group(1)
        }"""
                )
                
                # Write the updated parser file
                with open(parser_file, "w") as f:
                    f.write(new_parser_code)
                
                logger.info("Added support for import statements to parser")
                return True
            else:
                logger.info("Parser already supports import statements")
                return False
                
        except Exception as e:
            logger.error(f"Error updating parser: {str(e)}")
            return False
    
    def update_model_loader(self) -> bool:
        """
        Update the AILang model loader to handle new features
        
        Returns:
            True if the model loader was updated, False otherwise
        """
        loader_file = ADAPTER_DIR / "model_loader.py"
        
        # Check if the model loader exists
        if not loader_file.exists():
            # Create a new model loader file
            logger.info(f"Creating model loader: {loader_file}")
            
            model_loader_code = """\"\"\"
AILang Model Loader

This module handles loading AILang models, including resolving imports and
validating model structure.
\"\"\"

import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional

from .ailang_parser import AILangParser


class AILangModelLoader:
    \"\"\"Loads AILang models from files\"\"\"
    
    def __init__(self):
        \"\"\"Initialize the AILang model loader\"\"\"
        self.parser = AILangParser()
        self.loaded_models = {}
    
    def load_model(self, model_path: str) -> Dict[str, Any]:
        \"\"\"
        Load an AILang model from a file
        
        Args:
            model_path: Path to the model file
            
        Returns:
            Dictionary with the parsed model
        \"\"\"
        model_path = os.path.abspath(model_path)
        
        # Check if the model has already been loaded
        if model_path in self.loaded_models:
            return self.loaded_models[model_path]
        
        # Read the model file
        with open(model_path, "r") as f:
            model_content = f.read()
        
        # Parse the model
        model = self.parser.parse(model_content)
        
        # Resolve imports
        if "imports" in model:
            for import_info in model["imports"]:
                import_path = import_info["path"]
                # Convert relative path to absolute
                if not os.path.isabs(import_path):
                    import_path = os.path.join(os.path.dirname(model_path), import_path)
                
                # Load the imported model
                imported_model = self.load_model(import_path)
                
                # Merge the imported model into the current model
                self._merge_models(model, imported_model)
        
        # Store the loaded model
        self.loaded_models[model_path] = model
        
        return model
    
    def _merge_models(self, target: Dict[str, Any], source: Dict[str, Any]) -> None:
        \"\"\"
        Merge two models
        
        Args:
            target: Target model to merge into
            source: Source model to merge from
        \"\"\"
        # Merge agents
        if "agents" in source:
            if "agents" not in target:
                target["agents"] = {}
            
            for agent_id, agent in source["agents"].items():
                if agent_id not in target["agents"]:
                    target["agents"][agent_id] = agent
        
        # Merge consensus strategies
        if "consensus_strategies" in source:
            if "consensus_strategies" not in target:
                target["consensus_strategies"] = {}
            
            for strategy_id, strategy in source["consensus_strategies"].items():
                if strategy_id not in target["consensus_strategies"]:
                    target["consensus_strategies"][strategy_id] = strategy
        
        # Merge task templates
        if "task_templates" in source:
            if "task_templates" not in target:
                target["task_templates"] = {}
            
            for template_id, template in source["task_templates"].items():
                if template_id not in target["task_templates"]:
                    target["task_templates"][template_id] = template
"""
            
            try:
                # Create the file
                with open(loader_file, "w") as f:
                    f.write(model_loader_code)
                
                logger.info("Created new model loader with import support")
                return True
            except Exception as e:
                logger.error(f"Error creating model loader: {str(e)}")
                return False
        else:
            # Update existing model loader
            try:
                # Read the current model loader file
                with open(loader_file, "r") as f:
                    loader_code = f.read()
                
                # Check if we need to update the model loader
                if "def _merge_models" not in loader_code:
                    # Add support for merging models
                    new_loader_code = loader_code.replace(
                        "class AILangModelLoader:",
                        """class AILangModelLoader:
    def _merge_models(self, target: Dict[str, Any], source: Dict[str, Any]) -> None:
        \"\"\"
        Merge two models
        
        Args:
            target: Target model to merge into
            source: Source model to merge from
        \"\"\"
        # Merge agents
        if "agents" in source:
            if "agents" not in target:
                target["agents"] = {}
            
            for agent_id, agent in source["agents"].items():
                if agent_id not in target["agents"]:
                    target["agents"][agent_id] = agent
        
        # Merge consensus strategies
        if "consensus_strategies" in source:
            if "consensus_strategies" not in target:
                target["consensus_strategies"] = {}
            
            for strategy_id, strategy in source["consensus_strategies"].items():
                if strategy_id not in target["consensus_strategies"]:
                    target["consensus_strategies"][strategy_id] = strategy
        
        # Merge task templates
        if "task_templates" in source:
            if "task_templates" not in target:
                target["task_templates"] = {}
            
            for template_id, template in source["task_templates"].items():
                if template_id not in target["task_templates"]:
                    target["task_templates"][template_id] = template"""
                    )
                    
                    # Write the updated model loader file
                    with open(loader_file, "w") as f:
                        f.write(new_loader_code)
                    
                    logger.info("Added model merging support to model loader")
                    return True
                else:
                    logger.info("Model loader already supports model merging")
                    return False
                    
            except Exception as e:
                logger.error(f"Error updating model loader: {str(e)}")
                return False
    
    def update_version(self, new_version: str, ailang_compatibility: str) -> bool:
        """
        Update the adapter version
        
        Args:
            new_version: New adapter version
            ailang_compatibility: AILang version this adapter is compatible with
            
        Returns:
            True if the version was updated, False otherwise
        """
        version_file = ADAPTER_DIR / "version.py"
        
        if not version_file.exists():
            logger.error(f"Version file not found: {version_file}")
            return False
        
        try:
            # Read the current version file
            with open(version_file, "r") as f:
                version_code = f.read()
            
            # Update the version
            version_code = re.sub(
                r'__version__\s*=\s*"[^"]+"',
                f'__version__ = "{new_version}"',
                version_code
            )
            
            # Update the AILang compatibility version
            version_code = re.sub(
                r'__ailang_compatibility__\s*=\s*"[^"]+"',
                f'__ailang_compatibility__ = "{ailang_compatibility}"',
                version_code
            )
            
            # Add a new version history entry
            version_history_pattern = r'VERSION_HISTORY\s*=\s*\['
            new_version_entry = f"""VERSION_HISTORY = [
    {{
        "version": "{new_version}",
        "date": "{subprocess.check_output(['date', '+%Y-%m-%d'], universal_newlines=True).strip()}",
        "changes": [
            "Updated parser to support import statements",
            "Added model merging support to model loader",
            "Updated AILang compatibility to {ailang_compatibility}"
        ]
    }},"""
            
            version_code = re.sub(
                version_history_pattern,
                new_version_entry,
                version_code
            )
            
            # Write the updated version file
            with open(version_file, "w") as f:
                f.write(version_code)
            
            logger.info(f"Updated version to {new_version} (AILang compatibility: {ailang_compatibility})")
            return True
            
        except Exception as e:
            logger.error(f"Error updating version: {str(e)}")
            return False
    
    def run_tests(self) -> bool:
        """
        Run tests to ensure the adapter works correctly
        
        Returns:
            True if all tests pass, False otherwise
        """
        logger.info("Running adapter tests...")
        
        try:
            # Change to the project root directory
            os.chdir(PROJECT_ROOT)
            
            # Run pytest on the adapter tests
            result = subprocess.run(
                ["pytest", "-xvs", "tests/test_ailang_integration.py"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("All tests passed")
                return True
            else:
                logger.error(f"Tests failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error running tests: {str(e)}")
            return False
    
    def update_adapter(self, new_version: str, ailang_compatibility: str) -> bool:
        """
        Update the AILang adapter
        
        Args:
            new_version: New adapter version
            ailang_compatibility: AILang version this adapter is compatible with
            
        Returns:
            True if the adapter was updated successfully, False otherwise
        """
        logger.info(f"Updating AILang adapter to version {new_version}...")
        
        # Backup the current adapter
        backup_path = self.backup_current_adapter()
        
        try:
            # Update the parser
            parser_updated = self.update_parser()
            
            # Update the model loader
            loader_updated = self.update_model_loader()
            
            # Update the version
            version_updated = self.update_version(new_version, ailang_compatibility)
            
            # Run tests
            tests_passed = self.run_tests()
            
            if tests_passed:
                logger.info(f"AILang adapter updated successfully to version {new_version}")
                return True
            else:
                logger.error("Tests failed, rolling back to previous version")
                self.rollback(backup_path)
                return False
                
        except Exception as e:
            logger.error(f"Error updating adapter: {str(e)}")
            logger.info("Rolling back to previous version")
            self.rollback(backup_path)
            return False
    
    def rollback(self, backup_path: str) -> None:
        """
        Rollback to a previous version of the adapter
        
        Args:
            backup_path: Path to the backup directory
        """
        logger.info(f"Rolling back to backup: {backup_path}")
        
        try:
            # Remove all Python files from the adapter directory
            for file_path in ADAPTER_DIR.glob("**/*.py"):
                file_path.unlink()
            
            # Copy all Python files from the backup directory
            backup_dir = Path(backup_path)
            for file_path in backup_dir.glob("**/*.py"):
                # Get relative path from backup directory
                rel_path = file_path.relative_to(backup_dir)
                # Create target path in adapter directory
                target_path = ADAPTER_DIR / rel_path
                # Ensure parent directories exist
                target_path.parent.mkdir(parents=True, exist_ok=True)
                # Copy the file
                shutil.copy2(file_path, target_path)
            
            logger.info("Rollback completed successfully")
            
        except Exception as e:
            logger.error(f"Error during rollback: {str(e)}")


def main() -> None:
    """Main function to run the AILang adapter updater"""
    parser = argparse.ArgumentParser(description="Update the AILang adapter")
    parser.add_argument("--version", help="New adapter version")
    parser.add_argument("--ailang-version", help="AILang compatibility version")
    parser.add_argument("--auto", action="store_true", help="Automatically determine versions")
    args = parser.parse_args()
    
    updater = AILangAdapterUpdater()
    
    if args.auto:
        # Determine the new version automatically
        version_parts = current_version.split(".")
        new_version = f"{version_parts[0]}.{version_parts[1]}.{int(version_parts[2]) + 1}"
        
        # Determine the AILang compatibility version
        # In a real implementation, this would be determined by analyzing the
        # AILang repository. For now, we'll just use a fixed version.
        ailang_compatibility = "0.2.0"
        
        logger.info(f"Auto-determined new version: {new_version}")
        logger.info(f"Auto-determined AILang compatibility: {ailang_compatibility}")
    else:
        # Use the provided versions
        if not args.version or not args.ailang_version:
            logger.error("Both --version and --ailang-version are required")
            sys.exit(1)
        
        new_version = args.version
        ailang_compatibility = args.ailang_version
    
    # Update the adapter
    success = updater.update_adapter(new_version, ailang_compatibility)
    
    if success:
        logger.info("Adapter update completed successfully")
        sys.exit(0)
    else:
        logger.error("Adapter update failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
