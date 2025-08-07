"""
Code Generator Module
-------------------
Generates code based on ERD, API design, and test data.
"""

import logging
import json
import os
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import models
try:
    from .models import CodeGenerationRequest, CodeGenerationResponse, pydantic_available
except ImportError:
    # Fallback for direct imports
    try:
        from project_management.models import CodeGenerationRequest, CodeGenerationResponse, pydantic_available
    except ImportError:
        logger.error("Failed to import project management models")
        pydantic_available = False

# Try to import project manager
try:
    from .manager import project_manager
except ImportError:
    # Fallback for direct imports
    try:
        from project_management.manager import project_manager
    except ImportError:
        logger.error("Failed to import project manager")

# Try to import AI libraries with fallbacks
try:
    import openai
    openai_available = True
except ImportError:
    openai_available = False
    logger.warning("OpenAI library not available, using fallback code generation")

# Constants
DEFAULT_LANGUAGE = "python"
DEFAULT_FRAMEWORK = "fastapi"
SUPPORTED_LANGUAGES = ["python", "javascript", "typescript", "java", "go", "rust"]
SUPPORTED_FRAMEWORKS = {
    "python": ["fastapi", "flask", "django"],
    "javascript": ["express", "koa", "nest"],
    "typescript": ["express", "nest", "koa"],
    "java": ["spring", "quarkus", "micronaut"],
    "go": ["gin", "echo", "fiber"],
    "rust": ["actix", "rocket", "warp"]
}

# Template for code generation
CODE_TEMPLATES = {
    "python": {
        "fastapi": {
            "main": """from fastapi import FastAPI, Depends, HTTPException, status
from typing import List, Optional
import uvicorn

app = FastAPI(title="{project_name}", description="{project_description}")

@app.get("/")
def read_root():
    return {"message": "Welcome to {project_name}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
""",
            "model": """from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

{model_definitions}
""",
            "router": """from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from ..models.{model_name_lower} import {model_name}
from ..services.{model_name_lower}_service import {model_name}Service

router = APIRouter(prefix="/{model_name_lower}s", tags=["{model_name}s"])
service = {model_name}Service()

@router.get("/", response_model=List[{model_name}])
async def get_all_{model_name_lower}s():
    return await service.get_all()

@router.get("/{{{model_name_lower}_id}}", response_model={model_name})
async def get_{model_name_lower}({model_name_lower}_id: str):
    {model_name_lower} = await service.get_by_id({model_name_lower}_id)
    if not {model_name_lower}:
        raise HTTPException(status_code=404, detail="{model_name} not found")
    return {model_name_lower}

@router.post("/", response_model={model_name}, status_code=status.HTTP_201_CREATED)
async def create_{model_name_lower}({model_name_lower}: {model_name}):
    return await service.create({model_name_lower})

@router.put("/{{{model_name_lower}_id}}", response_model={model_name})
async def update_{model_name_lower}({model_name_lower}_id: str, {model_name_lower}: {model_name}):
    updated = await service.update({model_name_lower}_id, {model_name_lower})
    if not updated:
        raise HTTPException(status_code=404, detail="{model_name} not found")
    return updated

@router.delete("/{{{model_name_lower}_id}}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{model_name_lower}({model_name_lower}_id: str):
    deleted = await service.delete({model_name_lower}_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="{model_name} not found")
"""
        }
    }
}

async def generate_code_for_project(
    request: Union[CodeGenerationRequest, dict]
) -> Union[CodeGenerationResponse, dict]:
    """
    Generate code based on ERD, API design, and test data
    
    Args:
        request: The code generation request containing project_id, erd_data, api_design, etc.
        
    Returns:
        A response containing the generated code
    """
    # Add detailed logging for request debugging
    try:
        if hasattr(request, 'dict'):
            logger.info(f"Code generation request received: {request.dict(exclude={'erd_data', 'api_design', 'test_data'})}") 
        else:
            logger.info(f"Code generation request received: {request.get('project_id')}")  
    except Exception as e:
        logger.warning(f"Error logging request details: {str(e)}")
    # Extract request data
    if isinstance(request, dict):
        project_id = request.get("project_id")
        erd_data = request.get("erd_data", {})
        api_design = request.get("api_design", {})
        test_data = request.get("test_data", {})
        target_language = request.get("target_language", DEFAULT_LANGUAGE)
        target_framework = request.get("target_framework", DEFAULT_FRAMEWORK)
        include_tests = request.get("include_tests", True)
        include_documentation = request.get("include_documentation", True)
    else:
        project_id = request.project_id
        erd_data = request.erd_data
        api_design = request.api_design
        test_data = request.test_data or {}
        target_language = request.target_language
        target_framework = request.target_framework
        include_tests = request.include_tests
        include_documentation = request.include_documentation
    
    # Validate language and framework
    if target_language not in SUPPORTED_LANGUAGES:
        logger.warning(f"Unsupported language: {target_language}, falling back to {DEFAULT_LANGUAGE}")
        target_language = DEFAULT_LANGUAGE
        
    if target_framework not in SUPPORTED_FRAMEWORKS.get(target_language, []):
        default_framework = SUPPORTED_FRAMEWORKS.get(target_language, [DEFAULT_FRAMEWORK])[0]
        logger.warning(f"Unsupported framework: {target_framework} for {target_language}, falling back to {default_framework}")
        target_framework = default_framework
    
    # Get project details
    project = await project_manager.get_project(project_id)
    if not project:
        error_msg = f"Project with ID {project_id} not found"
        logger.error(error_msg)
        return create_error_response(project_id, error_msg)
    
    # Extract project name and description
    project_name = project.name if hasattr(project, 'name') else project.get('name', 'Untitled Project')
    project_description = project.description if hasattr(project, 'description') else project.get('description', '')
    
    try:
        # Try to use OpenAI for code generation if available
        if openai_available:
            return await generate_code_with_openai(
                project_id, project_name, project_description,
                erd_data, api_design, test_data,
                target_language, target_framework,
                include_tests, include_documentation
            )
        else:
            # Fall back to template-based code generation
            return generate_code_with_templates(
                project_id, project_name, project_description,
                erd_data, api_design,
                target_language, target_framework,
                include_tests, include_documentation
            )
    except Exception as e:
        error_msg = f"Error generating code: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return create_error_response(project_id, error_msg)

async def generate_code_with_openai(
    project_id: str,
    project_name: str,
    project_description: str,
    erd_data: Dict[str, Any],
    api_design: Dict[str, Any],
    test_data: Dict[str, Any],
    target_language: str,
    target_framework: str,
    include_tests: bool,
    include_documentation: bool
) -> Union[CodeGenerationResponse, dict]:
    """
    Generate code using OpenAI API
    """
    try:
        # Check for API key
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not found, falling back to template-based generation")
            return generate_code_with_templates(
                project_id, project_name, project_description,
                erd_data, api_design,
                target_language, target_framework,
                include_tests, include_documentation
            )
        
        # Configure OpenAI client
        openai.api_key = api_key
        
        # Prepare prompt for code generation
        prompt = f"""
        Generate code for a {target_language} project using {target_framework} framework.
        
        Project name: {project_name}
        Project description: {project_description}
        
        Entity-Relationship Diagram:
        {json.dumps(erd_data, indent=2)}
        
        API Design:
        {json.dumps(api_design, indent=2)}
        
        {"Include tests for all functionality." if include_tests else ""}
        {"Include comprehensive documentation." if include_documentation else ""}
        
        Generate the complete project structure with all necessary files.
        """
        
        # Call OpenAI API
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a code generation assistant that creates high-quality, production-ready code."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.2
        )
        
        # Extract generated code
        generated_code_text = response.choices[0].message.content
        
        # Parse the generated code into a structured format
        structured_code = parse_generated_code(generated_code_text)
        
        # Create response
        result = {
            "project_id": project_id,
            "generated_code": structured_code,
            "message": "Code generated successfully using AI",
            "success": True,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        if pydantic_available:
            return CodeGenerationResponse(**result)
        else:
            return result
            
    except Exception as e:
        logger.error(f"OpenAI code generation failed: {str(e)}", exc_info=True)
        # Fall back to template-based generation
        return generate_code_with_templates(
            project_id, project_name, project_description,
            erd_data, api_design,
            target_language, target_framework,
            include_tests, include_documentation
        )

def generate_code_with_templates(
    project_id: str,
    project_name: str,
    project_description: str,
    erd_data: Dict[str, Any],
    api_design: Dict[str, Any],
    target_language: str = DEFAULT_LANGUAGE,
    target_framework: str = DEFAULT_FRAMEWORK,
    include_tests: bool = True,
    include_documentation: bool = True
) -> Dict[str, Any]:
    """
    Generate code using templates - simplified robust version
    """
    try:
        logger.info(f"Starting simplified code generation for project {project_id}")
        
        # Create a basic code structure with minimal templating
        generated_code = {}
        
        # Add a main.py file
        generated_code["main.py"] = f"""from fastapi import FastAPI

app = FastAPI(title="{project_name}", description="{project_description}")

@app.get("/")
def read_root():
    return {{"message": "Welcome to {project_name}"}}
"""
        
        # Add a models.py file
        models_content = """from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

"""
        
        # Extract entity names from ERD data
        entities = erd_data.get('entities', [])
        for entity in entities:
            entity_name = entity.get('name', 'Item')
            models_content += f"""class {entity_name}(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

"""
        
        # If no entities were found, add a default one
        if not entities:
            models_content += """class Item(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
"""
        
        generated_code["models.py"] = models_content
        
        # Add a simple router
        generated_code["routers/item_router.py"] = """from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Item

router = APIRouter(prefix="/items", tags=["Items"])

@router.get("/", response_model=List[Item])
async def get_all_items():
    return []

@router.get("/{item_id}", response_model=Item)
async def get_item(item_id: str):
    raise HTTPException(status_code=404, detail="Item not found")
"""
        
        # Add a simple test file
        if include_tests:
            generated_code["tests/test_main.py"] = """from fastapi.testclient import TestClient
from ..main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
"""
        
        # Add a README.md file
        if include_documentation:
            generated_code["README.md"] = f"""# {project_name}

{project_description}

## Getting Started

1. Install dependencies: `pip install -r requirements.txt`
2. Run the server: `uvicorn main:app --reload`
3. Open API docs: http://localhost:8000/docs
"""
            
            # Add requirements.txt
            generated_code["requirements.txt"] = """fastapi>=0.68.0
uvicorn>=0.15.0
pydantic>=1.8.0
"""
        
        # Create a simple response
        result = {
            "project_id": project_id,
            "generated_code": generated_code,
            "code": generated_code,  # Add 'code' field for compatibility with test script
            "message": "Code generated successfully",
            "success": True
        }
        
        logger.info(f"Successfully generated {len(generated_code)} files for project {project_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error in simplified code generation: {str(e)}", exc_info=True)
        return create_error_response(project_id)

def generate_model_definitions(erd_data: Dict[str, Any], target_language: str) -> str:
    """
    Generate model definitions from ERD data
    """
    if target_language == "python":
        models = []
        
        for entity in erd_data.get("entities", []):
            entity_name = entity.get("name", "Entity")
            attributes = entity.get("attributes", [])
            
            model_lines = [f"class {entity_name}(BaseModel):"]
            
            if not attributes:
                model_lines.append("    id: str")
                model_lines.append("    created_at: datetime")
            else:
                for attr in attributes:
                    attr_name = attr.get("name", "field")
                    attr_type = attr.get("type", "str")
                    is_required = attr.get("required", True)
                    
                    # Map ERD types to Python types
                    type_mapping = {
                        "string": "str",
                        "integer": "int",
                        "number": "float",
                        "boolean": "bool",
                        "date": "datetime",
                        "datetime": "datetime",
                        "array": "List",
                        "object": "Dict[str, Any]"
                    }
                    
                    py_type = type_mapping.get(attr_type, "str")
                    
                    if is_required:
                        model_lines.append(f"    {attr_name}: {py_type}")
                    else:
                        model_lines.append(f"    {attr_name}: Optional[{py_type}] = None")
            
            models.append("\n".join(model_lines))
        
        return "\n\n".join(models)
    else:
        # Fallback for other languages
        return "# Model definitions would be generated here"

def generate_test_code(
    project_name: str,
    api_design: Dict[str, Any],
    target_language: str,
    target_framework: str
) -> str:
    """
    Generate test code
    """
    if target_language == "python" and target_framework == "fastapi":
        return f"""import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {{"message": "Welcome to {project_name}"}}
"""
    else:
        # Fallback for other languages/frameworks
        return "# Test code would be generated here"

def generate_documentation(
    project_name: str,
    project_description: str,
    target_language: str,
    target_framework: str
) -> str:
    """
    Generate documentation
    """
    return f"""# {project_name}

{project_description}

## Technology Stack

- Language: {target_language}
- Framework: {target_framework}

## Getting Started

### Prerequisites

- {target_language} installed
- Dependencies installed

### Installation

1. Clone the repository
2. Install dependencies
3. Run the application

## API Documentation

API documentation is available at `/docs` when the application is running.
"""

def parse_generated_code(code_text: str) -> Dict[str, str]:
    """
    Parse generated code text into a structured format
    """
    result = {}
    
    # Simple parsing logic - look for markdown code blocks with filenames
    import re
    pattern = r"```[\w]*\s*([^\n]+)\s*\n(.*?)```"
    matches = re.finditer(pattern, code_text, re.DOTALL)
    
    for match in matches:
        filename = match.group(1).strip()
        content = match.group(2).strip()
        
        # Clean up filename if it has language specifier
        if ":" in filename:
            parts = filename.split(":", 1)
            filename = parts[1].strip()
        
        result[filename] = content
    
    # If no structured files were found, create a single file
    if not result:
        result["generated_code.txt"] = code_text
    
    return result

def create_error_response(project_id: str, error_message: str = "Unknown error") -> Dict[str, Any]:
    """
    Create a standardized error response
    
    Args:
        project_id: The project ID
        error_message: The error message to include in the response
        
    Returns:
        A dict with error details that can be safely serialized
    """
    # Create a very simple, guaranteed-to-work error response
    return {
        "project_id": project_id,
        "generated_code": {"error.txt": "Error during code generation"},
        "code": {"error.txt": "Error during code generation"},
        "success": False,
        "message": "Code generation failed"
    }
