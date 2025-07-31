#!/usr/bin/env python
"""
Template manager for Local AI Coding Platform
Provides project templates with fallback mechanisms
"""
import os
import json
import shutil
from pathlib import Path
import time
from typing import Dict, List, Any, Optional
import logging

# Import our custom logger
try:
    from logger import default_logger as logger
except ImportError:
    # Fallback to standard logging if logger module isn't available
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("template_manager")

class TemplateManager:
    """
    Manages project templates with multiple fallback mechanisms:
    1. Primary: File-based templates in templates directory
    2. Fallback: Built-in default templates
    """
    
    def __init__(self, templates_dir: Optional[str] = None):
        """Initialize the template manager with configurable template directory"""
        # Set up template directory
        if templates_dir:
            self.templates_dir = Path(templates_dir)
        else:
            # Use environment variable or default
            env_templates_dir = os.environ.get("TEMPLATES_DIR")
            if env_templates_dir:
                self.templates_dir = Path(env_templates_dir)
            else:
                # Default to templates directory in project root
                self.templates_dir = Path(__file__).parent.parent / "templates"
        
        # Built-in templates as fallback
        self.builtin_templates = {
            "python_basic": {
                "name": "Python Basic",
                "description": "Basic Python script template",
                "language": "python",
                "files": {
                    "main.py": "# Python Basic Template\n\ndef main():\n    print(\"Hello, World!\")\n\nif __name__ == \"__main__\":\n    main()\n"
                }
            },
            "python_api": {
                "name": "Python FastAPI",
                "description": "FastAPI REST API template with error handling and fallbacks",
                "language": "python",
                "files": {
                    "main.py": "from fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\nimport uvicorn\n\napp = FastAPI(title=\"API Template\")\n\nclass Item(BaseModel):\n    name: str\n    value: float\n\n@app.get(\"/\")\ndef read_root():\n    return {\"status\": \"ok\"}\n\n@app.post(\"/items/\")\ndef create_item(item: Item):\n    try:\n        return {\"name\": item.name, \"value\": item.value}\n    except Exception as e:\n        raise HTTPException(status_code=500, detail=str(e))\n\nif __name__ == \"__main__\":\n    uvicorn.run(app, host=\"0.0.0.0\", port=8000)\n",
                    "requirements.txt": "fastapi>=0.68.0\nuvicorn>=0.15.0\npydantic>=1.8.2\n"
                }
            },
            "javascript_basic": {
                "name": "JavaScript Basic",
                "description": "Basic JavaScript template",
                "language": "javascript",
                "files": {
                    "index.js": "// JavaScript Basic Template\n\nconsole.log('Hello, World!');\n\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nmodule.exports = { greet };\n",
                    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <title>JavaScript Basic</title>\n</head>\n<body>\n  <h1>JavaScript Basic Template</h1>\n  <div id=\"output\"></div>\n  <script src=\"index.js\"></script>\n</body>\n</html>\n"
                }
            }
        }
        
        # Ensure templates directory exists
        self._ensure_templates_dir()
    
    def _ensure_templates_dir(self):
        """Ensure the templates directory exists, create if necessary"""
        try:
            self.templates_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Using templates directory: {self.templates_dir}")
        except Exception as e:
            logger.error(f"Failed to create templates directory: {e}")
    
    def get_available_templates(self) -> Dict[str, Dict]:
        """
        Get all available templates with fallback to built-in templates
        
        Returns:
            Dict mapping template IDs to template metadata
        """
        templates = {}
        
        # Load file-based templates
        try:
            file_templates = self._load_file_templates()
            templates.update(file_templates)
            logger.info(f"Loaded {len(file_templates)} templates from file system")
        except Exception as e:
            logger.error(f"Failed to load file templates: {e}")
        
        # Add built-in templates (don't override file templates)
        for template_id, template in self.builtin_templates.items():
            if template_id not in templates:
                templates[template_id] = template
        
        logger.info(f"Total templates available: {len(templates)}")
        return templates
    
    def _load_file_templates(self) -> Dict[str, Dict]:
        """Load templates from the filesystem"""
        templates = {}
        
        # Look for template directories (each with a template.json file)
        for item in self.templates_dir.glob("**/template.json"):
            template_dir = item.parent
            try:
                with open(item, "r") as f:
                    template_data = json.load(f)
                
                # Validate template data
                if not all(key in template_data for key in ["name", "description", "language"]):
                    logger.warning(f"Invalid template data in {item}, skipping")
                    continue
                
                # Use directory name as template ID
                template_id = template_dir.name
                
                # Load template files
                files = {}
                for file_path in template_dir.glob("**/*"):
                    if file_path.is_file() and file_path.name != "template.json":
                        relative_path = file_path.relative_to(template_dir)
                        with open(file_path, "r") as f:
                            files[str(relative_path)] = f.read()
                
                # Add files to template data
                template_data["files"] = files
                templates[template_id] = template_data
                
            except Exception as e:
                logger.error(f"Failed to load template from {template_dir}: {e}")
        
        return templates
    
    def get_template(self, template_id: str) -> Dict[str, Any]:
        """
        Get a specific template with fallback
        
        Args:
            template_id: The ID of the template to get
            
        Returns:
            Template data or error response
        """
        templates = self.get_available_templates()
        
        if template_id in templates:
            return {
                "success": True,
                "template": templates[template_id]
            }
        else:
            # Try to find a similar template as fallback
            language = template_id.split("_")[0] if "_" in template_id else template_id
            fallbacks = [tid for tid in templates if language in tid]
            
            if fallbacks:
                fallback_id = fallbacks[0]
                return {
                    "success": True,
                    "template": templates[fallback_id],
                    "warning": f"Template '{template_id}' not found, using '{fallback_id}' instead"
                }
            else:
                # Use default template as last resort
                return {
                    "success": False,
                    "message": f"Template '{template_id}' not found",
                    "fallback_options": list(templates.keys())
                }
    
    def create_project_from_template(
        self, 
        template_id: str, 
        project_name: str, 
        output_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new project from a template
        
        Args:
            template_id: The ID of the template to use
            project_name: Name of the new project
            output_dir: Directory to create the project in (default: current directory)
            
        Returns:
            Dict with project creation status and path
        """
        # Get template data
        template_result = self.get_template(template_id)
        if not template_result["success"]:
            return template_result
        
        template = template_result["template"]
        
        # Set output directory
        if output_dir:
            project_dir = Path(output_dir) / project_name
        else:
            projects_dir = Path(os.environ.get("PROJECTS_DIR", "./projects"))
            try:
                projects_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.error(f"Failed to create projects directory: {e}")
                return {
                    "success": False,
                    "message": f"Failed to create projects directory: {str(e)}"
                }
            project_dir = projects_dir / project_name
        
        # Check if project directory already exists
        if project_dir.exists():
            return {
                "success": False,
                "message": f"Project directory already exists: {project_dir}"
            }
        
        try:
            # Create project directory
            project_dir.mkdir(parents=True, exist_ok=True)
            
            # Create files from template
            for filename, content in template["files"].items():
                file_path = project_dir / filename
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, "w") as f:
                    f.write(content)
            
            # Create metadata file
            metadata = {
                "name": project_name,
                "created_at": time.time(),
                "template_id": template_id,
                "template_name": template["name"],
                "language": template["language"]
            }
            with open(project_dir / ".project.json", "w") as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Created project from template: {template_id} -> {project_dir}")
            return {
                "success": True,
                "project_dir": str(project_dir),
                "files": list(template["files"].keys()),
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to create project: {e}")
            # Clean up if project creation failed
            try:
                if project_dir.exists():
                    shutil.rmtree(project_dir)
            except Exception:
                pass
            
            return {
                "success": False,
                "message": f"Failed to create project: {str(e)}"
            }

# Create a singleton instance
template_manager = TemplateManager()
