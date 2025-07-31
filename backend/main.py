# /project-root/backend/main.py

import os
import json
import time
import logging
from fastapi import FastAPI, HTTPException, Depends, Request, Header, status
from fastapi.responses import JSONResponse

# Import routers
from health_api import add_health_routes
from routers import projects, auth

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Starting Coder AI Platform backend...")

# Import startup manager first for robust initialization of all components
from startup_manager import startup_manager
startup_status = startup_manager.initialize_all()
logger.info(f"Startup completed with status: {startup_status['overall_status']}")

# Now import other components - these will use fallbacks if primary modules failed
from code_execution import code_executor, CodeExecutionResult
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel
import os
import time
from typing import Optional, Dict, Any, List

from ollama_client import OllamaClient
from executor import run_code
from file_manager import file_manager
from health_monitor import health_monitor
from security import rate_limiter, verify_api_key, SecurityConfig
from template_manager import template_manager
from auth_manager import auth_manager

# Try to import our custom logger, fall back to standard logging
try:
    from logger import default_logger as logger
except ImportError:
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger('main')

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Load config from environment or .env
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "codellama:instruct")

# Log the configuration
logger.info(f"Ollama URL: {OLLAMA_URL}")
logger.info(f"Ollama Model: {OLLAMA_MODEL}")

app = FastAPI(
    title="Local AI Coding Platform API",
    description="API for the Local AI Coding Platform with comprehensive fallbacks",
    version="1.0.0"
)

# Add health check routes
app = add_health_routes(app)

# Include routers with proper prefixes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])

# Configure CORS with specific allowed origins
frontend_origins = [
    "http://localhost:5173",    # Default Vite dev server
    "http://127.0.0.1:5173",    # Alternative localhost
    "http://localhost:3000",    # Alternative port
    "http://127.0.0.1:3000",    # Alternative port
    "http://172.28.112.1:5173", # WSL host IP with Vite port
    "http://172.28.112.1:3000", # WSL host IP with alternative port
    "http://localhost:8000",    # Backend direct access
    "http://127.0.0.1:8000",    # Backend direct access
    "http://172.28.112.1:8000"  # Backend through WSL host IP
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Apply rate limiter middleware with robust error handling
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimiterMiddleware(BaseHTTPMiddleware):
    # Class-level storage for rate limiting
    request_logs = {}
    
    async def dispatch(self, request, call_next):
        try:
            # Get client IP with fallbacks for various proxy setups
            client_ip = self.get_client_ip(request)
            
            # Current timestamp
            now = time.time()
            
            # Initialize or get existing timestamp list
            if client_ip not in self.request_logs:
                self.request_logs[client_ip] = []
                
            # Remove timestamps older than 1 minute
            self.request_logs[client_ip] = [t for t in self.request_logs[client_ip] if now - t < 60]
            
            # Check if rate limit exceeded (using default limit)
            max_requests = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "60"))
            if len(self.request_logs[client_ip]) >= max_requests:
                logger.warning(f"Rate limit exceeded for {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"}
                )
                
            # Add current request timestamp
            self.request_logs[client_ip].append(now)
        except Exception as e:
            logger.error(f"Rate limiter error (fallback engaged): {e}")
            # Continue even if rate limiting fails to maintain availability
            pass
        
        # Always process the request even if rate limiting fails
        return await call_next(request)
    
    def get_client_ip(self, request):
        # Try X-Forwarded-For first (standard proxy header)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
            
        # Try Cloudflare-specific headers
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip
            
        # Try X-Real-IP (used by some proxies)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
            
        # Fall back to direct client connection
        try:
            return request.client.host
        except:
            # Ultimate fallback
            return "0.0.0.0"

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add rate limiter middleware
app.add_middleware(RateLimiterMiddleware)

# Include agent API router if available
try:
    from agent_api import router as agent_router
    app.include_router(agent_router)
    logger.info("Multi-agent API endpoints registered")
except Exception as e:
    logger.error(f"Failed to register multi-agent API endpoints: {e}")
    logger.warning("Multi-agent functionality will be unavailable")

# Using file_manager singleton instance

# Initialize Ollama client with direct connection to the working URL
logger.info("Initializing Ollama client...")

# Default model to use if not specified
DEFAULT_MODEL = "codellama:instruct"

# Use the confirmed working URL
OLLAMA_URL = "http://172.28.112.1:11434"

# Function to test Ollama connection
def test_ollama_connection(client):
    """Test if the Ollama client can successfully generate a response."""
    try:
        test_prompt = "Respond with 'OK' if you can hear me."
        logger.info(f"Testing Ollama connection with prompt: {test_prompt}")
        
        # Remove timeout parameter from generate() as it's not supported
        response = client.generate(test_prompt)
        
        if not response or not isinstance(response, str):
            logger.warning(f"Unexpected response format: {response}")
            return False
            
        if "OK" in response.upper():
            logger.info("Ollama connection test successful")
            return True
            
        logger.warning(f"Unexpected response content: {response}")
        return False
        
    except Exception as e:
        # Log the error without exc_info to avoid logger issues
        logger.error(f"Ollama connection test failed: {str(e)}")
        return False

# Initialize the Ollama client with the confirmed working URL
try:
    # Get the model name from environment or use default
    model_name = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
    logger.info(f"Initializing Ollama client with URL: {OLLAMA_URL}, Model: {model_name}")
    
    # Initialize the client
    ollama = OllamaClient(
        url=OLLAMA_URL,
        model=model_name,
        timeout=60  # Increased timeout for initial connection
    )
    
    # Get list of available models from Ollama
    try:
        import requests
        response = requests.get(f"{OLLAMA_URL}/api/tags")
        if response.status_code == 200:
            available_models = [m['name'] for m in response.json().get('models', [])]
            logger.info(f"Available Ollama models: {', '.join(available_models) if available_models else 'None'}")
            
            # Check if our model is in the list
            if model_name not in available_models:
                logger.warning(f"Model '{model_name}' not found in available models. Trying anyway...")
    except Exception as e:
        logger.warning(f"Could not fetch available models: {str(e)}")
    
    # Test the connection
    logger.info("Testing Ollama connection...")
    if test_ollama_connection(ollama):
        logger.info(f"✅ Successfully connected to Ollama at {OLLAMA_URL}")
        logger.info(f"✅ Using model: {model_name}")
    else:
        raise ConnectionError("Ollama connection test failed")
        
except Exception as e:
    error_msg = f"❌ Failed to initialize Ollama client: {str(e)}"
    logger.error(error_msg)
    logger.error("\nTroubleshooting tips:")
    logger.error(f"1. Ensure Ollama is running at: {OLLAMA_URL}")
    logger.error("2. Check if the model is downloaded with: ollama pull codellama:instruct")
    logger.error("3. Verify network connectivity between services")
    logger.error("4. Check Ollama server logs for any errors")
    logger.error("5. Make sure the server is accessible from this environment")
    
    # Try to get more detailed error information
    try:
        import requests
        health_check = requests.get(f"{OLLAMA_URL}/api/health")
        logger.info(f"Ollama health check: {health_check.status_code} - {health_check.text}")
    except Exception as health_err:
        logger.error(f"Could not check Ollama health: {str(health_err)}")
    
    raise RuntimeError(error_msg)

class FileRequest(BaseModel):
    filename: str
    content: str

class ChatRequest(BaseModel):
    prompt: str
    
class HealthResponse(BaseModel):
    status: str
    ollama_status: str
    docker_status: str
    database_status: str
    timestamp: float
    response_time: float
    language: str = "python"  # Default to python

class SaveRequest(BaseModel):
    filename: str
    content: str
    
class LoginRequest(BaseModel):
    username: str
    password: str
    
class TokenRequest(BaseModel):
    token: str
    
class UserRequest(BaseModel):
    username: str
    password: str
    is_admin: bool = False
    
class UserUpdateRequest(BaseModel):
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    
class TemplateRequest(BaseModel):
    template_id: str
    project_name: str
    output_dir: Optional[str] = None
    
class OpenFolderRequest(BaseModel):
    folder_path: str

class ProjectFileRequest(BaseModel):
    project_id: str
    file_path: str
    
class WriteProjectFileRequest(BaseModel):
    project_id: str
    file_path: str
    content: str

@app.get("/")
async def read_root(api_key: str = Depends(verify_api_key)):
    return {
        "status": "ok", 
        "message": "Local AI Coding Platform API", 
        "version": "1.0.0"
    }


# ---------- Authentication Endpoints ----------

@app.post("/auth/login")
async def login(request: LoginRequest):
    """Login user and get authentication token"""
    result = auth_manager.login(request.username, request.password)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    return result

@app.get("/auth/validate")
async def validate_token(authorization: str = Header(None)):
    """
    Validate authentication token and return user information
    
    This endpoint is used by the frontend to validate the user's session
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split(" ")[1]
    result = auth_manager.verify_token(token)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=401,
            detail=result.get("message", "Invalid token"),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return {
        "username": result["username"],
        "is_admin": result.get("is_admin", False),
        "permissive_mode": result.get("permissive_mode", False)
    }

@app.post("/auth/verify")
async def verify_token(request: TokenRequest):
    """Verify authentication token"""
    result = auth_manager.verify_token(request.token)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    return result

@app.post("/auth/logout")
async def logout(request: TokenRequest):
    """Logout and invalidate token"""
    return auth_manager.logout(request.token)

# Admin endpoint for user management - requires admin token
async def verify_admin_token(token: str = Depends(verify_api_key)):
    """Verify token belongs to admin user"""
    result = auth_manager.verify_token(token)
    if not result["success"] or not result.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return token

@app.post("/auth/users/create")
async def create_user(request: UserRequest, token: str = Depends(verify_admin_token)):
    """Create a new user (admin only)"""
    result = auth_manager.create_user(request.username, request.password, request.is_admin)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.get("/auth/users")
async def list_users(token: str = Depends(verify_admin_token)):
    """List all users (admin only)"""
    return auth_manager.list_users()

@app.put("/auth/users/{username}")
async def update_user(username: str, request: UserUpdateRequest, token: str = Depends(verify_admin_token)):
    """Update a user (admin only)"""
    data = {}
    if request.password is not None:
        data["password"] = request.password
    if request.is_admin is not None:
        data["is_admin"] = request.is_admin
    
    result = auth_manager.update_user(username, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.delete("/auth/users/{username}")
async def delete_user(username: str, token: str = Depends(verify_admin_token)):
    """Delete a user (admin only)"""
    result = auth_manager.delete_user(username)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# ---------- Template Management Endpoints ----------

@app.get("/templates")
async def get_templates(api_key: str = Depends(verify_api_key)):
    """Get all available project templates"""
    try:
        templates = template_manager.get_available_templates()
        return {"success": True, "templates": templates}
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates/{template_id}")
async def get_template(template_id: str, api_key: str = Depends(verify_api_key)):
    """Get a specific project template"""
    try:
        result = template_manager.get_template(template_id)
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        return result
    except Exception as e:
        logger.error(f"Error getting template {template_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create_project")
async def create_project(request: TemplateRequest, api_key: str = Depends(verify_api_key)):
    """Create a new project from a template"""
    try:
        result = template_manager.create_project_from_template(
            template_id=request.template_id,
            project_name=request.project_name,
            output_dir=request.output_dir
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.api_route("/health", methods=["GET", "HEAD"], response_model=HealthResponse)
async def health_check():
    """Comprehensive health check with fallbacks for all system components"""
    try:
        # Run health check
        result = health_monitor.check_health()
        return result
    except Exception as e:
        logger.error(f"Health check error: {e}")
        # Provide a minimal response with fallback data
        return HealthResponse(
            status="degraded",
            ollama_status="unknown",
            docker_status="unknown",
            database_status="unknown",
            timestamp=time.time(),
            response_time=0.0,
            language="python"
        )

@app.post("/chat")
async def chat(request: ChatRequest, api_key: str = Depends(verify_api_key)):
    # Get preferred model from request or use default
    preferred_model = getattr(request, "model", None) or "ollama"
    
    # Extract any fallback preferences from request
    fallback_enabled = getattr(request, "use_fallbacks", True)
    model_priority = getattr(request, "model_priority", [])
    
    # Track errors for diagnostic info
    errors = {}
    
    # Try Ollama first (default provider)
    if preferred_model == "ollama" or not preferred_model or fallback_enabled:
        try:
            logger.info(f"Attempting to use Ollama for chat response with prompt: {request.prompt[:100]}...")
            
            # Get model from request or use the one from the client
            model = getattr(request, "model", None) or ollama.model
            
            # Configure generation options with explicit timeout and optimized parameters
            generation_options = {
                "temperature": min(max(float(getattr(request, "temperature", 0.7)), 0.1), 1.0),  # Clamp between 0.1 and 1.0
                "top_p": min(max(float(getattr(request, "top_p", 0.9)), 0.1), 1.0),  # Clamp between 0.1 and 1.0
                "num_ctx": min(int(getattr(request, "num_ctx", 2048)), 4096),  # Cap context length
                "stream": False,
                "timeout": 300  # 5 minute timeout for generation
            }
            
            # Log the request details
            logger.info(f"Ollama request - Model: {model}, Options: {generation_options}")
            
            # Make the request with increased timeout and better error handling
            start_time = time.time()
            
            try:
                # First try with the specified model
                response = ollama.generate(
                    request.prompt,
                    model=model,
                    options=generation_options
                )
            except Exception as model_error:
                # If model-specific error, try with default model as fallback
                logger.warning(f"Model-specific error with {model}, trying default model: {model_error}")
                response = ollama.generate(
                    request.prompt,
                    model=None,  # Use default model
                    options=generation_options
                )
            
            elapsed = time.time() - start_time
            
            if not response or not isinstance(response, str):
                raise ValueError(f"Invalid response format from Ollama: {response}")
            
            logger.info(f"Ollama response received in {elapsed:.2f}s")
            
            return {
                "text": response,
                "provider": "ollama",
                "model": model,
                "status": "success",
                "metrics": {
                    "response_time_seconds": round(elapsed, 2),
                    "tokens_generated": len(response.split())  # Approximate
                }
            }
            
        except Exception as e:
            error_message = str(e)
            errors["ollama"] = error_message
            logger.error(f"Ollama chat failed: {error_message}", exc_info=True)
            
            # Add more context to the error for debugging
            if "timeout" in error_message.lower() or "timed out" in error_message.lower():
                errors["ollama"] = "Request timed out. The model may be busy or the prompt is too long. " \
                                  "Try a shorter prompt or wait a moment and try again."
            elif any(conn_err in error_message.lower() for conn_err in ["connection", "connect", "refused"]):
                errors["ollama"] = "Could not connect to Ollama service. Please ensure Ollama is running and accessible."
            elif "model" in error_message.lower() and "not found" in error_message.lower():
                errors["ollama"] = f"Model not found. Available models: {ollama.list_models()}"
            
            logger.warning(f"Falling back to next provider due to: {error_message}")
    
    # Try OpenAI if configured (fallback #1)
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if (preferred_model == "openai" or fallback_enabled) and openai_api_key:
        try:
            # Only import if needed
            import openai
            openai.api_key = openai_api_key
            
            logger.info("Attempting to use OpenAI for chat response")
            openai_response = openai.chat.completions.create(
                model="gpt-3.5-turbo",  # Can be configured
                messages=[{"role": "user", "content": request.prompt}],
                max_tokens=2048
            )
            
            # Extract text from OpenAI response
            response_text = openai_response.choices[0].message.content
            
            return {
                "text": response_text,
                "provider": "openai",
                "model": "gpt-3.5-turbo",
                "status": "success"
            }
        except Exception as e:
            error_message = str(e)
            errors["openai"] = error_message
            logger.warning(f"OpenAI chat failed: {error_message}")
    
    # Try embedded local fallback model (final fallback)
    try:
        # Simplified local generation if all else fails
        logger.info("Attempting to use embedded fallback model for chat response")
        
        # Just a basic response generator as ultimate fallback
        import re
        from datetime import datetime
        
        prompt = request.prompt.lower()
        response_text = ""
        
        # Very basic pattern matching as last resort
        if re.search(r'(hello|hi|hey|greetings)', prompt):
            response_text = f"Hello! I'm a simple fallback AI assistant. (Generated at {datetime.now().strftime('%H:%M:%S')})"
        elif re.search(r'(help|assist|support)', prompt):
            response_text = "I'm operating in fallback mode. Both Ollama and OpenAI are currently unavailable. Please check your configuration and connectivity."
        elif re.search(r'(code|program|function|class)', prompt):
            response_text = "I'm sorry, code generation requires the primary AI models which are currently unavailable. Please check your connection to Ollama or OpenAI services."
        else:
            response_text = "I'm currently operating in fallback mode with limited capabilities. External AI services are unavailable."
        
        return {
            "text": response_text,
            "provider": "local_fallback",
            "model": "basic_responder",
            "status": "degraded"
        }
    except Exception as e:
        # All fallbacks failed - return comprehensive error
        error_message = str(e)
        errors["local_fallback"] = error_message
        logger.error(f"All chat fallbacks failed: {errors}")
    
    # Compile available diagnostics
    diagnostic_info = {
        "ollama_status": "failed" if "ollama" in errors else "not_attempted",
        "openai_status": "failed" if "openai" in errors else "not_configured" if not openai_api_key else "not_attempted",
        "errors": errors
    }
    
    # Return a user-friendly response with specific troubleshooting steps
    return {
        "text": "All AI services are currently unavailable. Please try the following steps:\n\n" +
              "1. For Ollama: Ensure the service is running with `ollama serve`\n" +
              "2. For OpenAI: Check your API key configuration\n" +
              "3. Check your network connection\n\n" +
              "Detailed diagnostics have been logged to help troubleshoot this issue.",
        "status": "error",
        "diagnostics": diagnostic_info
    }

@app.post("/execute")
async def execute_code(request: FileRequest, api_key: str = Depends(verify_api_key)):
    """Execute code with multiple fallback mechanisms"""
    try:
        # Extract the language from filename extension or use provided language
        language = "python"  # Default
        if request.filename:
            ext = os.path.splitext(request.filename)[1].lower()
            if ext == ".js" or ext == ".jsx":
                language = "javascript"
            elif ext == ".py":
                language = "python"
        
        # Use our robust code executor with fallbacks
        result = code_executor.execute_code(request.content, language)
        
        # Return the structured result
        return result.to_dict()
    except Exception as e:
        logger.error(f"Error in execute endpoint: {e}")
        
        # Return a fallback response rather than failing completely
        return {
            "output": "",
            "error": f"Error executing code: {str(e)}\n\nPlease check your code and try again.",
            "execution_time": 0.0,
            "success": False,
            "method_used": "error_fallback"
        }

@app.post("/save")
async def save_file(request: FileRequest, api_key: str = Depends(verify_api_key)):
    try:
        # file_manager.save_file returns a tuple (success, path)
        success, path = file_manager.save_file(request.filename, request.content)
        
        if not success:
            # If saving wasn't fully successful but we have a fallback path
            logger.warning(f"File saving fallback activated for {request.filename} -> {path}")
            return {
                "success": False, 
                "path": path,
                "filename": request.filename,
                "message": "File saved using fallback mechanism. Your changes may not persist across restarts."
            }
            
        # If completely successful, return success response
        return {
            "success": True,
            "path": path,
            "filename": request.filename,
            "message": "File saved successfully"
        }
    except Exception as e:
        # Log the complete exception for debugging
        logger.error(f"Error saving file {request.filename}: {str(e)}")
        
        # Return a user-friendly error with fallback information
        return {
            "success": False,
            "error": str(e),
            "filename": request.filename,
            "message": "Failed to save file. System will attempt to recover your changes on next save."
        }

@app.get("/files")
async def files(api_key: str = Depends(verify_api_key)):
    try:
        # Use the file_manager singleton to get files list
        file_list = file_manager.load_files()
        return {"files": file_list}
    except Exception as e:
        # Fallback for file listing
        logger.error(f"Error in files endpoint: {e}")
        return {"files": [], "error": str(e), "message": "Failed to list files. Using empty list as fallback."}

@app.get("/load/{filename}", response_class=PlainTextResponse)
async def load_file(filename: str, api_key: str = Depends(verify_api_key)):
    try:
        # file_manager.load_file returns a tuple (success, content)
        success, content = file_manager.load_file(filename)
        
        if not success:
            # If loading wasn't successful but we have an error message
            logger.warning(f"File loading fallback activated for {filename}")
            return content  # Return the error message or partial content
            
        # If successful, return the content directly
        return content
    except Exception as e:
        # Log the complete exception for debugging
        logger.error(f"Error loading file {filename}: {str(e)}")
        
        # Return a user-friendly error message
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to load file: {filename}. Please try again or check if the file exists."
        )

# ---------- Project Folder Management Endpoints ----------

@app.post("/project/open_folder")
async def open_folder(request: OpenFolderRequest, api_key: str = Depends(verify_api_key)):
    """
    Open a folder as a project and scan all its files recursively.
    This implements VS Code-like project folder opening experience.
    """
    try:
        start_time = time.time()
        result = file_manager.open_folder(request.folder_path)
        response_time = time.time() - start_time
        
        # Add response time metric
        result["response_time"] = response_time
        
        if not result.get("success", False):
            logger.warning(f"Error opening folder: {result.get('error', 'Unknown error')}")
            return JSONResponse(status_code=400, content=result)
            
        return result
    except Exception as e:
        logger.error(f"Error in open_folder endpoint: {e}")
        return JSONResponse(
            status_code=500, 
            content={
                "success": False, 
                "error": str(e), 
                "message": "Failed to open folder. Please try another location."
            }
        )

@app.get("/project/{project_id}/files")
async def get_project_files(project_id: str, api_key: str = Depends(verify_api_key)):
    """
    Get a list of all files in an opened project.
    """
    try:
        result = file_manager.get_project_files(project_id)
        
        if not result.get("success", False):
            logger.warning(f"Error getting project files: {result.get('error', 'Unknown error')}")
            return JSONResponse(status_code=404, content=result)
            
        return result
    except Exception as e:
        logger.error(f"Error in get_project_files endpoint: {e}")
        return JSONResponse(
            status_code=500, 
            content={
                "success": False, 
                "error": str(e), 
                "message": "Failed to get project files."
            }
        )

@app.post("/project/file/read")
async def read_project_file(request: ProjectFileRequest, api_key: str = Depends(verify_api_key)):
    """
    Read a file from an opened project.
    """
    try:
        result = file_manager.read_project_file(request.project_id, request.file_path)
        
        if not result.get("success", False):
            logger.warning(f"Error reading project file: {result.get('error', 'Unknown error')}")
            return JSONResponse(status_code=404, content=result)
            
        return result
    except Exception as e:
        logger.error(f"Error in read_project_file endpoint: {e}")
        return JSONResponse(
            status_code=500, 
            content={
                "success": False, 
                "error": str(e), 
                "message": "Failed to read project file."
            }
        )

@app.post("/project/file/write")
async def write_project_file(request: WriteProjectFileRequest, api_key: str = Depends(verify_api_key)):
    """
    Write content to a file in an opened project.
    """
    try:
        result = file_manager.write_project_file(request.project_id, request.file_path, request.content)
        
        if not result.get("success", False):
            logger.warning(f"Error writing project file: {result.get('error', 'Unknown error')}")
            return JSONResponse(status_code=400, content=result)
            
        return result
    except Exception as e:
        logger.error(f"Error in write_project_file endpoint: {e}")
        return JSONResponse(
            status_code=500, 
            content={
                "success": False, 
                "error": str(e), 
                "message": "Failed to write project file."
            }
        )
