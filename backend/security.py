# /project-root/backend/security.py

import os
import time
import logging
import hashlib
import secrets
import threading
from typing import Dict, Optional, List, Tuple, Any
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security settings with fallbacks - more permissive in development
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_DEVELOPMENT = ENVIRONMENT == "development"

# Rate limiting settings - more permissive in development
DEFAULT_MAX_REQUESTS = "1000" if IS_DEVELOPMENT else "60"
MAX_REQUESTS_PER_MINUTE = int(os.getenv("MAX_REQUESTS_PER_MINUTE", DEFAULT_MAX_REQUESTS))
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "False" if IS_DEVELOPMENT else "True").lower() == "true"

# API Key settings
API_KEY_REQUIRED = os.getenv("API_KEY_REQUIRED", "False").lower() == "true"
API_KEY = os.getenv("API_KEY", secrets.token_hex(16))  # Generate random key if not provided

# Rate limiting data store with thread safety
request_logs: Dict[str, List[float]] = {}
request_logs_lock = threading.Lock()

class SecurityConfig(BaseModel):
    """Security configuration with fallback mechanisms"""
    rate_limit_enabled: bool = RATE_LIMIT_ENABLED
    api_key_required: bool = API_KEY_REQUIRED
    max_requests_per_minute: int = MAX_REQUESTS_PER_MINUTE
    environment: str = ENVIRONMENT

# Initialize API key security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_security_config(request: Request = None) -> SecurityConfig:
    """Get current security configuration with built-in fallbacks
    
    Args:
        request: Optional FastAPI request object passed when used as a dependency
        
    Returns:
        SecurityConfig: Security configuration with fallbacks
    """
    try:
        # The request parameter is ignored but required for FastAPI dependency injection
        return SecurityConfig()
    except Exception as e:
        logger.error(f"Error loading security config: {e}")
        # Fallback to safe defaults
        return SecurityConfig(
            rate_limit_enabled=True,
            api_key_required=False,
            max_requests_per_minute=30,
            environment="development"
        )

async def verify_api_key(api_key: str = Depends(api_key_header), 
                         config: SecurityConfig = Depends(get_security_config)) -> Optional[str]:
    """
    Verify API key if required
    
    Returns:
        str: API key if valid, None if not required or valid key provided
        
    Raises:
        HTTPException: If invalid API key provided when required
    """
    # Skip API key verification if not required
    if not config.api_key_required:
        return None
        
    try:
        if not api_key:
            raise HTTPException(status_code=401, detail="API key required")
            
        # Use constant-time comparison to prevent timing attacks
        if not secrets.compare_digest(api_key, API_KEY):
            raise HTTPException(status_code=401, detail="Invalid API key")
            
        return api_key
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        
        logger.error(f"API key verification error: {e}")
        # Fallback to permissive mode in case of unexpected errors
        # This keeps the service running but logs the security concern
        logger.warning("Using fallback permissive API key verification due to error")
        return None

async def rate_limiter(request: Request, 
                       config: SecurityConfig = Depends(get_security_config)) -> None:
    """
    Thread-safe rate limiting middleware with fallback mechanisms
    
    Args:
        request: The incoming request
        config: Security configuration
        
    Raises:
        HTTPException: If rate limit exceeded
    """
    # Skip rate limiting for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return
        
    # Skip rate limiting if disabled
    if not config.rate_limit_enabled:
        return
        
    try:
        client_ip = get_client_ip(request)
        current_time = time.time()
        
        # Initialize request logs for this IP if not exists
        with request_logs_lock:
            if client_ip not in request_logs:
                request_logs[client_ip] = []
            
            # Remove timestamps older than 1 minute
            request_logs[client_ip] = [
                t for t in request_logs[client_ip] 
                if current_time - t < 60
            ]
            
            # Check if rate limit exceeded
            remaining = max(0, config.max_requests_per_minute - len(request_logs[client_ip]))
            
            # Add current request timestamp
            request_logs[client_ip].append(current_time)
            
            # Set rate limit headers for all responses
            request.state.rate_limit = {
                "limit": config.max_requests_per_minute,
                "remaining": remaining - 1,  # Account for this request
                "reset": int(current_time // 60 * 60 + 60)  # Next minute
            }
            
            if remaining <= 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "rate_limit_exceeded",
                        "message": f"Rate limit exceeded: {config.max_requests_per_minute} requests per minute"
                    },
                    headers={
                        "Access-Control-Allow-Origin": "*",
                        "X-RateLimit-Limit": str(config.max_requests_per_minute),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(current_time // 60 * 60 + 60))
                    }
                )
    except Exception as e:
        logger.warning(f"Rate limiting error: {str(e)}")
        # Allow the request to proceed if there's an error in rate limiting
        if config.environment != "production":
            logger.warning("Rate limiting disabled due to error in development mode")
            return
        raise
            
    except HTTPException:
        # Re-raise HTTP exceptions (like 429) to be handled by FastAPI
        raise
        
        # Log the error but allow the request to proceed
        logger.error(f"Rate limiting error for {client_ip}: {e}")
        logger.warning("Allowing request through due to rate limiter error")

def get_client_ip(request: Request) -> str:
    """
    Get client IP with fallbacks for different proxy setups
    
    Args:
        request: FastAPI request object
        
    Returns:
        str: Client IP address with fallback to 'unknown' if not found
        
    Raises:
        HTTPException: If IP address cannot be determined
    """
    # Try standard headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Get the first IP in case of multiple proxies
        return forwarded_for.split(",")[0].strip()
        
    # Try other common headers
    for header in ["X-Real-IP", "CF-Connecting-IP", "True-Client-IP"]:
        if header in request.headers:
            return request.headers[header]
            
    # Fallback to direct client
    return request.client.host if request.client else "unknown"

def hash_password(password: str) -> str:
    """
    Securely hash a password with salt
    
    Args:
        password: Plain text password
        
    Returns:
        str: Hashed password with salt
    """
    try:
        salt = os.urandom(32)
        hash_obj = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            100000  # Number of iterations
        )
        return f"{salt.hex()}:{hash_obj.hex()}"
    except Exception as e:
        logger.error(f"Password hashing error: {e}")
        # Fallback to a more basic hash if the preferred method fails
        # Still secure but with simpler approach
        fallback_salt = secrets.token_hex(8)
        fallback_hash = hashlib.sha256((fallback_salt + password).encode()).hexdigest()
        return f"fallback:{fallback_salt}:{fallback_hash}"

def verify_password(stored_hash: str, password: str) -> bool:
    """
    Verify password against stored hash
    
    Args:
        stored_hash: Previously hashed password with salt
        password: Plain text password to verify
        
    Returns:
        bool: True if password matches
    """
    try:
        # Check if using fallback format
        if stored_hash.startswith("fallback:"):
            parts = stored_hash.split(":")
            if len(parts) != 3:
                return False
            
            _, salt, hash_value = parts
            check_hash = hashlib.sha256((salt + password).encode()).hexdigest()
            return secrets.compare_digest(check_hash, hash_value)
        else:
            # Standard format
            salt_hex, hash_hex = stored_hash.split(":")
            salt = bytes.fromhex(salt_hex)
            stored_hash_bin = bytes.fromhex(hash_hex)
            
            hash_obj = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt,
                100000  # Same number of iterations as in hash_password
            )
            
            # Use constant-time comparison to prevent timing attacks
            return secrets.compare_digest(hash_obj, stored_hash_bin)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        # In case of any error, authentication fails
        return False
