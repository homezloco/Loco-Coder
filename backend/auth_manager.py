#!/usr/bin/env python
"""
Authentication manager for Local AI Coding Platform
Provides user authentication with multiple fallback mechanisms
"""
import os
import json
import time
import secrets
import hashlib
import base64
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
import logging
from datetime import datetime, timedelta
import threading

# Try to import our custom logger, fall back to standard logging
try:
    from logger import default_logger as logger
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("auth_manager")

class AuthManager:
    """
    Manages user authentication with multiple fallback mechanisms:
    1. Primary: File-based user storage with secure password hashing
    2. Fallback 1: Environment-based superuser credentials
    3. Fallback 2: Local development mode with default credentials
    4. Fallback 3: Permissive mode for emergencies (can be disabled)
    """
    
    def __init__(self, config_dir: Optional[str] = None, enable_permissive_mode: bool = True):
        """Initialize authentication manager with configurable settings"""
        # Set up configuration directory
        if config_dir:
            self.config_dir = Path(config_dir)
        else:
            # Use environment variable or default
            env_config_dir = os.environ.get("AUTH_CONFIG_DIR")
            if env_config_dir:
                self.config_dir = Path(env_config_dir)
            else:
                # Default to config directory in project root
                self.config_dir = Path(__file__).parent.parent / "config" / "auth"
        
        # User credentials file
        self.users_file = self.config_dir / "users.json"
        
        # Token settings
        self.token_expiry_hours = int(os.environ.get("TOKEN_EXPIRY_HOURS", "24"))
        self.token_secret = os.environ.get("TOKEN_SECRET", secrets.token_hex(32))
        
        # Active tokens cache
        self.active_tokens = {}
        self.token_lock = threading.Lock()
        
        # Permissive mode settings
        self.enable_permissive_mode = enable_permissive_mode
        self.permissive_mode_active = False
        
        # Environment-based superuser (for fallback)
        self.env_username = os.environ.get("AUTH_SUPERUSER")
        self.env_password = os.environ.get("AUTH_PASSWORD")
        
        # Development mode default credentials
        self.dev_mode = os.environ.get("DEV_MODE", "false").lower() == "true"
        self.dev_username = "admin"
        self.dev_password = "adminpass"
        
        # Ensure config directory exists
        self._ensure_config_dir()
        
        # Initialize user store
        self._init_user_store()
    
    def _ensure_config_dir(self):
        """Ensure the configuration directory exists"""
        try:
            self.config_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Using auth configuration directory: {self.config_dir}")
        except Exception as e:
            logger.error(f"Failed to create auth config directory: {e}")
    
    def _init_user_store(self):
        """Initialize the user store, create default admin if needed"""
        if not self.users_file.exists():
            # Create with default admin user
            default_users = {
                "admin": {
                    "password_hash": self._hash_password("adminpass"),
                    "is_admin": True,
                    "created_at": time.time()
                }
            }
            
            try:
                with open(self.users_file, "w") as f:
                    json.dump(default_users, f, indent=2)
                logger.info("Created default user store with admin user")
            except Exception as e:
                logger.error(f"Failed to create user store: {e}")
        else:
            logger.info("Using existing user store")
    
    def _load_users(self) -> Dict[str, Dict[str, Any]]:
        """Load users from file with fallback options"""
        users = {}
        
        # Try to load from file
        try:
            if self.users_file.exists():
                with open(self.users_file, "r") as f:
                    users = json.load(f)
                logger.debug(f"Loaded {len(users)} users from file")
            else:
                logger.warning("User store file not found")
        except Exception as e:
            logger.error(f"Failed to load users: {e}")
        
        # Add environment-based superuser if defined (doesn't overwrite existing)
        if self.env_username and self.env_password and self.env_username not in users:
            users[self.env_username] = {
                "password_hash": self._hash_password(self.env_password),
                "is_admin": True,
                "created_at": time.time(),
                "source": "env"
            }
            logger.info(f"Added environment-based superuser: {self.env_username}")
        
        # Add development mode user if in dev mode (doesn't overwrite existing)
        if self.dev_mode and self.dev_username not in users:
            users[self.dev_username] = {
                "password_hash": self._hash_password(self.dev_password),
                "is_admin": True,
                "created_at": time.time(),
                "source": "dev_mode"
            }
            logger.info("Added development mode user")
        
        return users
    
    def _save_users(self, users: Dict[str, Dict[str, Any]]) -> bool:
        """Save users to file with error handling"""
        try:
            # Remove any environment or dev mode users before saving
            users_to_save = {
                username: data
                for username, data in users.items()
                if data.get("source") not in ["env", "dev_mode"]
            }
            
            # Save to file
            with open(self.users_file, "w") as f:
                json.dump(users_to_save, f, indent=2)
            logger.debug(f"Saved {len(users_to_save)} users to file")
            return True
        except Exception as e:
            logger.error(f"Failed to save users: {e}")
            return False
    
    def _hash_password(self, password: str) -> str:
        """
        Hash password using SHA-256 with salt
        
        For a production system, use a more robust algorithm like bcrypt,
        but this provides a reasonable fallback with salt
        """
        salt = secrets.token_hex(16)
        pwdhash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
        return f"{salt}${pwdhash}"
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against stored hash"""
        try:
            salt, stored_hash = password_hash.split("$")
            calculated_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
            return calculated_hash == stored_hash
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def _generate_token(self, username: str) -> str:
        """Generate authentication token for user"""
        # Create token data
        expiry = datetime.now() + timedelta(hours=self.token_expiry_hours)
        token_data = {
            "username": username,
            "exp": expiry.timestamp(),
            "created": time.time()
        }
        
        # Generate random token
        token = secrets.token_urlsafe(32)
        
        # Store in active tokens
        with self.token_lock:
            self.active_tokens[token] = token_data
        
        return token
    
    def _validate_token(self, token: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate authentication token
        
        Returns:
            Tuple of (is_valid, username, error_message)
        """
        with self.token_lock:
            if token not in self.active_tokens:
                return False, None, "Invalid token"
            
            token_data = self.active_tokens[token]
            
            # Check expiration
            if token_data["exp"] < time.time():
                del self.active_tokens[token]
                return False, None, "Token expired"
            
            return True, token_data["username"], None
    
    def login(self, username: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user and generate token
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Dict with authentication result and token if successful
        """
        # Check for permissive mode first
        if self.permissive_mode_active and self.enable_permissive_mode:
            logger.warning(f"Permissive mode login for: {username}")
            token = self._generate_token(username)
            return {
                "success": True,
                "token": token,
                "username": username,
                "is_admin": True,
                "permissive_mode": True,
                "expires_in": self.token_expiry_hours * 3600
            }
        
        # Load users
        users = self._load_users()
        
        # Check if user exists
        if username not in users:
            logger.warning(f"Login attempt for non-existent user: {username}")
            return {
                "success": False,
                "message": "Invalid username or password"
            }
        
        # Verify password
        user_data = users[username]
        if not self._verify_password(password, user_data["password_hash"]):
            logger.warning(f"Failed login attempt for user: {username}")
            return {
                "success": False,
                "message": "Invalid username or password"
            }
        
        # Generate token
        token = self._generate_token(username)
        logger.info(f"Successful login for user: {username}")
        
        return {
            "success": True,
            "token": token,
            "username": username,
            "is_admin": user_data.get("is_admin", False),
            "expires_in": self.token_expiry_hours * 3600
        }
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify authentication token
        
        Args:
            token: Authentication token to verify
            
        Returns:
            Dict with verification result
        """
        # Check for permissive mode
        if self.permissive_mode_active and self.enable_permissive_mode:
            logger.warning("Permissive mode token verification")
            return {
                "success": True,
                "username": "permissive_user",
                "is_admin": True,
                "permissive_mode": True
            }
        
        # Validate token
        is_valid, username, error = self._validate_token(token)
        
        if not is_valid:
            return {
                "success": False,
                "message": error or "Invalid token"
            }
        
        # Load user data
        users = self._load_users()
        user_data = users.get(username, {})
        
        return {
            "success": True,
            "username": username,
            "is_admin": user_data.get("is_admin", False)
        }
    
    def logout(self, token: str) -> Dict[str, Any]:
        """
        Invalidate authentication token
        
        Args:
            token: Authentication token to invalidate
            
        Returns:
            Dict with logout result
        """
        with self.token_lock:
            if token in self.active_tokens:
                del self.active_tokens[token]
                logger.info(f"Logged out token for user")
                return {
                    "success": True,
                    "message": "Logged out successfully"
                }
            
            return {
                "success": False,
                "message": "Invalid token"
            }
    
    def create_user(self, username: str, password: str, is_admin: bool = False) -> Dict[str, Any]:
        """
        Create a new user
        
        Args:
            username: New user's username
            password: New user's password
            is_admin: Whether the new user should be an admin
            
        Returns:
            Dict with user creation result
        """
        # Load users
        users = self._load_users()
        
        # Check if user already exists
        if username in users:
            logger.warning(f"Attempted to create existing user: {username}")
            return {
                "success": False,
                "message": "Username already exists"
            }
        
        # Create user
        users[username] = {
            "password_hash": self._hash_password(password),
            "is_admin": is_admin,
            "created_at": time.time()
        }
        
        # Save users
        if self._save_users(users):
            logger.info(f"Created new user: {username}, is_admin: {is_admin}")
            return {
                "success": True,
                "username": username,
                "is_admin": is_admin
            }
        else:
            return {
                "success": False,
                "message": "Failed to save user data"
            }
    
    def update_user(self, username: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user data
        
        Args:
            username: Username of user to update
            data: Dict with data to update (password, is_admin)
            
        Returns:
            Dict with update result
        """
        # Load users
        users = self._load_users()
        
        # Check if user exists
        if username not in users:
            logger.warning(f"Attempted to update non-existent user: {username}")
            return {
                "success": False,
                "message": "User not found"
            }
        
        user_data = users[username]
        
        # Update password if provided
        if "password" in data:
            user_data["password_hash"] = self._hash_password(data["password"])
        
        # Update is_admin if provided
        if "is_admin" in data:
            user_data["is_admin"] = bool(data["is_admin"])
        
        # Update other fields
        for key, value in data.items():
            if key not in ["password", "password_hash"]:
                user_data[key] = value
        
        # Save users
        if self._save_users(users):
            logger.info(f"Updated user: {username}")
            return {
                "success": True,
                "username": username
            }
        else:
            return {
                "success": False,
                "message": "Failed to save user data"
            }
    
    def delete_user(self, username: str) -> Dict[str, Any]:
        """
        Delete a user
        
        Args:
            username: Username of user to delete
            
        Returns:
            Dict with deletion result
        """
        # Load users
        users = self._load_users()
        
        # Check if user exists
        if username not in users:
            logger.warning(f"Attempted to delete non-existent user: {username}")
            return {
                "success": False,
                "message": "User not found"
            }
        
        # Check if user is from environment or dev mode
        user_data = users[username]
        if user_data.get("source") in ["env", "dev_mode"]:
            logger.warning(f"Attempted to delete protected user: {username}")
            return {
                "success": False,
                "message": "Cannot delete protected user"
            }
        
        # Delete user
        del users[username]
        
        # Save users
        if self._save_users(users):
            logger.info(f"Deleted user: {username}")
            
            # Invalidate any active tokens for this user
            with self.token_lock:
                for token, token_data in list(self.active_tokens.items()):
                    if token_data["username"] == username:
                        del self.active_tokens[token]
            
            return {
                "success": True,
                "message": "User deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to save user data"
            }
    
    def list_users(self) -> Dict[str, Any]:
        """
        List all users
        
        Returns:
            Dict with list of users (without password hashes)
        """
        # Load users
        users = self._load_users()
        
        # Remove sensitive data
        safe_users = {}
        for username, user_data in users.items():
            safe_users[username] = {
                k: v for k, v in user_data.items() 
                if k not in ["password_hash"]
            }
        
        return {
            "success": True,
            "users": safe_users
        }
    
    def enable_permissive_mode(self) -> Dict[str, Any]:
        """
        Enable permissive mode for emergency access
        
        Returns:
            Dict with result
        """
        if not self.enable_permissive_mode:
            logger.warning("Attempted to enable permissive mode when disabled")
            return {
                "success": False,
                "message": "Permissive mode is disabled by configuration"
            }
        
        self.permissive_mode_active = True
        logger.warning("Permissive mode enabled")
        
        return {
            "success": True,
            "message": "Permissive mode enabled"
        }
    
    def disable_permissive_mode(self) -> Dict[str, Any]:
        """
        Disable permissive mode
        
        Returns:
            Dict with result
        """
        self.permissive_mode_active = False
        logger.info("Permissive mode disabled")
        
        return {
            "success": True,
            "message": "Permissive mode disabled"
        }
    
    def cleanup_expired_tokens(self) -> int:
        """
        Clean up expired tokens
        
        Returns:
            Number of tokens removed
        """
        with self.token_lock:
            current_time = time.time()
            expired_tokens = [
                token for token, data in self.active_tokens.items()
                if data["exp"] < current_time
            ]
            
            for token in expired_tokens:
                del self.active_tokens[token]
            
            if expired_tokens:
                logger.debug(f"Cleaned up {len(expired_tokens)} expired tokens")
            
            return len(expired_tokens)

# Create a singleton instance
auth_manager = AuthManager()
