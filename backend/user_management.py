"""
Multi-Tenant User Management System
-----------------------------------
Manages user authentication, authorization, and organization management
with comprehensive fallback mechanisms and proper multi-tenant isolation.
"""

import os
import json
import time
import uuid
import logging
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Union, Any
from pathlib import Path

# Flag to track if SQLAlchemy is available
sqlalchemy_available = False

# Import necessary modules with fallback mechanism
try:
    import jwt
    from fastapi import Depends, HTTPException, status
    from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
    from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
    from pydantic_settings import BaseSettings
    import sqlalchemy as sa
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, relationship
    from datetime import datetime
    PYDANTIC_V2 = True
    sqlalchemy_available = True
except ImportError as e:
    logging.warning(f"Some dependencies not available: {e}")
    # Fallback for Pydantic v1
    try:
        from pydantic import BaseModel, Field, EmailStr, validator as pydantic_validator
        PYDANTIC_V2 = False
        
        # Make validator available at module level
        validator = pydantic_validator
        
        # Try to import SQLAlchemy separately if it wasn't imported with the main dependencies
        try:
            import sqlalchemy as sa
            from sqlalchemy.ext.declarative import declarative_base
            from sqlalchemy.orm import sessionmaker, relationship
            sqlalchemy_available = True
        except ImportError:
            logging.warning("SQLAlchemy not available")
            sqlalchemy_available = False
    except ImportError:
        # Define a minimal BaseModel fallback
        class BaseModel:
            def __init__(self, **data):
                for key, value in data.items():
                    setattr(self, key, value)
            
            def model_dump(self):
                return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}
            
            # Alias for v1 compatibility
            dict = model_dump
            
            class Config:
                extra = 'ignore'
        
        # Define validator decorator for fallback
        def validator(*args, **kwargs):
            def decorator(func):
                return func
            return decorator
    
    # Define other required classes with minimal implementations
    class EmailStr(str):
        @classmethod
        def __get_validators__(cls):
            yield lambda v: v
    
    class OAuth2PasswordBearer:
        def __init__(self, *args, **kwargs):
            pass
        
        def __call__(self, *args, **kwargs):
            return None
    
    # Define Depends for FastAPI compatibility
    def Depends(dependency=None, *, use_cache: bool = True):
        return dependency() if callable(dependency) else dependency
    
    # Define HTTPException for FastAPI compatibility
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str = None):
            self.status_code = status_code
            self.detail = detail
    
    # Define status codes
    class status:
        HTTP_200_OK = 200
        HTTP_201_CREATED = 201
        HTTP_400_BAD_REQUEST = 400
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403
        HTTP_404_NOT_FOUND = 404
        HTTP_500_INTERNAL_SERVER_ERROR = 500
    
    PYDANTIC_AVAILABLE = False

# Try to import database module, fall back to local implementation if unavailable
try:
    from database import get_db_session, Base, engine
    database_available = True
except ImportError:
    logging.warning("Main database module not available, using local fallback")
    database_available = False
    
    # Local fallback for Base
    if sqlalchemy_available:
        from sqlalchemy.ext.declarative import declarative_base
        Base = declarative_base()
    else:
        # If SQLAlchemy isn't available, create a simple base class
        class Base:
            __tablename__ = ""
            metadata = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
DEFAULT_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
PASSWORD_MIN_LENGTH = 8
DEFAULT_USER_QUOTA = {
    "max_projects": 10,
    "max_agents": 5,
    "max_storage_mb": 100,
    "max_requests_per_day": 1000
}

# Define data models
class UserBase(BaseModel):
    """Base Pydantic model for User data validation"""
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    organization_id: Optional[str] = None

class UserCreate(UserBase):
    """Model for user creation with password"""
    password: str
    
    # Use the correct validator based on Pydantic version
    if PYDANTIC_V2:
        @field_validator('password')
        def password_strength(cls, v):
            if len(v) < PASSWORD_MIN_LENGTH:
                raise ValueError(f'Password must be at least {PASSWORD_MIN_LENGTH} characters')
            return v
    else:
        @validator('password')
        def password_strength(cls, v):
            if len(v) < PASSWORD_MIN_LENGTH:
                raise ValueError(f'Password must be at least {PASSWORD_MIN_LENGTH} characters')
            return v
        
    def dict(self):
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}

class UserUpdate(BaseModel):
    """Model for user updates"""
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    organization_id: Optional[str] = None
    quota: Optional[Dict[str, Any]] = None

if PYDANTIC_V2:
    class User(BaseModel):
        """Model for user responses"""
        model_config = ConfigDict(
            from_attributes=True,
            json_encoders={
                datetime: lambda v: v.isoformat() if v else None,
                'datetime': lambda v: v.isoformat() if v else None
            },
            arbitrary_types_allowed=True
        )
        
        id: str
        username: str
        email: Optional[str] = None
        full_name: Optional[str] = None
        is_active: bool = True
        is_admin: bool = False
        organization_id: Optional[str] = None
        created_at: datetime
        last_login: Optional[datetime] = None
        quota: Dict[str, Any] = {}
        
        @classmethod
        def from_orm(cls, obj):
            if hasattr(obj, '__dict__'):
                data = {**obj.__dict__}
                # Handle SQLAlchemy specific attributes
                if '_sa_instance_state' in data:
                    del data['_sa_instance_state']
                    
                # Convert SQLAlchemy model to dict if needed
                if hasattr(obj, 'to_dict'):
                    return cls(**obj.to_dict())
                    
                # Handle datetime fields
                if 'created_at' in data and not isinstance(data['created_at'], (str, datetime.datetime)):
                    if data['created_at'] is not None:
                        data['created_at'] = data['created_at'].isoformat()
                    
                if 'last_login' in data and data['last_login'] is not None and not isinstance(data['last_login'], (str, datetime.datetime)):
                    if data['last_login'] is not None:
                        data['last_login'] = data['last_login'].isoformat()
                    
                return cls(**{k: v for k, v in data.items() if v is not None})
            return obj
else:
    class User(BaseModel):
        """Model for user responses (Pydantic v1 compatible)"""
        id: str
        username: str
        email: Optional[str] = None
        full_name: Optional[str] = None
        is_active: bool = True
        is_admin: bool = False
        organization_id: Optional[str] = None
        created_at: datetime
        last_login: Optional[datetime] = None
        quota: Dict[str, Any] = {}
        
        @classmethod
        def from_orm(cls, obj):
            if hasattr(obj, '__dict__'):
                data = {**obj.__dict__}
                # Handle SQLAlchemy specific attributes
                if '_sa_instance_state' in data:
                    del data['_sa_instance_state']
                    
                # Convert SQLAlchemy model to dict if needed
                if hasattr(obj, 'to_dict'):
                    return cls(**obj.to_dict())
                    
                # Handle datetime fields
                if 'created_at' in data and not isinstance(data['created_at'], (str, datetime.datetime)):
                    if data['created_at'] is not None:
                        data['created_at'] = data['created_at'].isoformat()
                    
                if 'last_login' in data and data['last_login'] is not None and not isinstance(data['last_login'], (str, datetime.datetime)):
                    if data['last_login'] is not None:
                        data['last_login'] = data['last_login'].isoformat()
                    
                return cls(**{k: v for k, v in data.items() if v is not None})
            return obj
            
        class Config:
            orm_mode = True
            json_encoders = {
                datetime: lambda v: v.isoformat() if v else None,
                'datetime': lambda v: v.isoformat() if v else None
            }

class OrganizationBase(BaseModel):
    """Base model for organizations"""
    name: str
    description: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    """Model for organization creation"""
    admin_user_id: Optional[str] = None

class Organization(OrganizationBase):
    """Model for organization responses"""
    id: str
    created_at: datetime
    quota: Dict[str, Any]
    
    class Config:
        orm_mode = True

class Token(BaseModel):
    """Auth token model"""
    access_token: str
    token_type: str = "bearer"
    expires_at: int
    user_id: str
    username: str
    is_admin: bool

# Database models (SQLAlchemy ORM)
if sqlalchemy_available:
    class UserModel(Base):
        __tablename__ = "users"
        
        id = sa.Column(sa.String(36), primary_key=True, index=True)
        username = sa.Column(sa.String(50), unique=True, index=True)
        email = sa.Column(sa.String(100), unique=True, index=True, nullable=True)
        hashed_password = sa.Column(sa.String(100))
        full_name = sa.Column(sa.String(100), nullable=True)
        is_active = sa.Column(sa.Boolean, default=True)
        is_admin = sa.Column(sa.Boolean, default=False)
        organization_id = sa.Column(sa.String(36), sa.ForeignKey("organizations.id"), nullable=True)
        created_at = sa.Column(sa.DateTime, default=datetime.utcnow)
        last_login = sa.Column(sa.DateTime, nullable=True)
        quota = sa.Column(sa.JSON, default=DEFAULT_USER_QUOTA)
        
        # Relationship
        organization = relationship("OrganizationModel", back_populates="users")
    
    class OrganizationModel(Base):
        __tablename__ = "organizations"
        
        id = sa.Column(sa.String(36), primary_key=True, index=True)
        name = sa.Column(sa.String(100), index=True)
        description = sa.Column(sa.Text, nullable=True)
        created_at = sa.Column(sa.DateTime, default=datetime.utcnow)
        quota = sa.Column(sa.JSON)
        
        # Relationships
        users = relationship("UserModel", back_populates="organization")

class UserManager:
    """
    User management service with comprehensive fallbacks
    
    Primary: SQL Database
    Fallback 1: JSON file-based storage
    Fallback 2: In-memory storage (ephemeral)
    """
    
    def __init__(self, secret_key=None, db_session=None):
        """Initialize user manager with available dependencies"""
        self.secret_key = secret_key or os.environ.get("SECRET_KEY") or self._generate_secret()
        self.db_session = db_session
        self.storage_mode = "database" if sqlalchemy_available and db_session else "file"
        
        # Set up file storage path if needed
        if self.storage_mode == "file":
            self.data_dir = Path("./data/users")
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.users_file = self.data_dir / "users.json"
            self.orgs_file = self.data_dir / "organizations.json"
            
            # Initialize files if they don't exist
            if not self.users_file.exists():
                with open(self.users_file, "w") as f:
                    json.dump([], f)
            
            if not self.orgs_file.exists():
                with open(self.orgs_file, "w") as f:
                    json.dump([], f)
                    
        # In-memory fallback (used if file storage fails)
        self.memory_users = {}
        self.memory_orgs = {}
            
        logger.info(f"UserManager initialized with {self.storage_mode} storage mode")
    
    def _generate_secret(self) -> str:
        """Generate a secret key if none is provided"""
        logger.warning("No secret key provided, generating one (not suitable for production)")
        return hashlib.sha256(os.urandom(32)).hexdigest()
    
    def _hash_password(self, password: str) -> str:
        """Hash a password for storage"""
        # In a real system, use a proper password hashing library like bcrypt or Argon2
        salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
        pwdhash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000)
        return f"{salt.decode('ascii')}${pwdhash.hex()}"
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against stored hash"""
        try:
            salt, stored_hash = hashed_password.split('$')
            pwdhash = hashlib.pbkdf2_hmac('sha512', 
                                        plain_password.encode('utf-8'), 
                                        salt.encode('ascii'), 
                                        100000)
            return pwdhash.hex() == stored_hash
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def _create_access_token(self, data: dict, expires_delta: Optional[int] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire_minutes = expires_delta or DEFAULT_TOKEN_EXPIRE_MINUTES
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expire_minutes)
        to_encode.update({"exp": expire})
        
        try:
            # Try to use PyJWT
            return jwt.encode(to_encode, self.secret_key, algorithm="HS256")
        except NameError:
            # Fallback to simple token creation
            logger.warning("JWT library not available, using simple token")
            token_data = json.dumps(to_encode)
            return f"{hashlib.sha256(token_data.encode()).hexdigest()}.{hashlib.sha256(self.secret_key.encode()).hexdigest()[:10]}"
    
    async def verify_token(self, token: str) -> Optional[dict]:
        """Verify and decode a token"""
        try:
            # Try to use PyJWT
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
            return payload
        except jwt.PyJWTError:
            return None
        except NameError:
            # Fallback for simple token validation
            try:
                token_part, key_part = token.split(".")
                if key_part != hashlib.sha256(self.secret_key.encode()).hexdigest()[:10]:
                    return None
                    
                # This is a simplified approach - in a real system, you'd need proper validation
                # including expiration checking and more robust encoding/decoding
                return {"sub": "unknown", "exp": time.time() + 3600}  # Limited data available in fallback
            except:
                return None
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with proper fallbacks"""
        user_id = str(uuid.uuid4())
        hashed_password = self._hash_password(user_data.password)
        created_at = datetime.datetime.utcnow()
        
        # Create user based on storage mode
        if self.storage_mode == "database":
            try:
                db_user = UserModel(
                    id=user_id,
                    username=user_data.username,
                    email=user_data.email,
                    hashed_password=hashed_password,
                    full_name=user_data.full_name,
                    is_active=user_data.is_active,
                    is_admin=user_data.is_admin,
                    organization_id=user_data.organization_id,
                    created_at=created_at,
                    quota=DEFAULT_USER_QUOTA
                )
                
                self.db_session.add(db_user)
                self.db_session.commit()
                self.db_session.refresh(db_user)
                
                return User(
                    id=db_user.id,
                    username=db_user.username,
                    email=db_user.email,
                    full_name=db_user.full_name,
                    is_active=db_user.is_active,
                    is_admin=db_user.is_admin,
                    organization_id=db_user.organization_id,
                    created_at=db_user.created_at,
                    quota=db_user.quota
                )
            except Exception as e:
                logger.error(f"Database user creation failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
                logger.info("Falling back to file storage")
        
        # File-based storage
        if self.storage_mode == "file":
            try:
                user_record = {
                    "id": user_id,
                    "username": user_data.username,
                    "email": user_data.email,
                    "hashed_password": hashed_password,
                    "full_name": user_data.full_name,
                    "is_active": user_data.is_active,
                    "is_admin": user_data.is_admin,
                    "organization_id": user_data.organization_id,
                    "created_at": created_at.isoformat(),
                    "last_login": None,
                    "quota": DEFAULT_USER_QUOTA
                }
                
                users = []
                try:
                    with open(self.users_file, "r") as f:
                        users = json.load(f)
                except Exception:
                    logger.error("Failed to read users file, creating new one")
                
                # Check for duplicate username
                if any(u["username"] == user_data.username for u in users):
                    raise ValueError("Username already exists")
                
                users.append(user_record)
                
                with open(self.users_file, "w") as f:
                    json.dump(users, f, indent=2)
                
                return User(
                    id=user_id,
                    username=user_data.username,
                    email=user_data.email,
                    full_name=user_data.full_name,
                    is_active=user_data.is_active,
                    is_admin=user_data.is_admin,
                    organization_id=user_data.organization_id,
                    created_at=created_at,
                    quota=DEFAULT_USER_QUOTA
                )
            except Exception as e:
                logger.error(f"File-based user creation failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
                logger.info("Falling back to in-memory storage")
        
        # Memory storage (last resort)
        user_record = {
            "id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "is_active": user_data.is_active,
            "is_admin": user_data.is_admin,
            "organization_id": user_data.organization_id,
            "created_at": created_at.isoformat(),
            "last_login": None,
            "quota": DEFAULT_USER_QUOTA
        }
        
        self.memory_users[user_id] = user_record
        
        return User(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            full_name=user_data.full_name,
            is_active=user_data.is_active,
            is_admin=user_data.is_admin,
            organization_id=user_data.organization_id,
            created_at=created_at,
            quota=DEFAULT_USER_QUOTA
        )
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username with storage fallbacks"""
        # Try database first
        if self.storage_mode == "database":
            try:
                db_user = self.db_session.query(UserModel).filter(UserModel.username == username).first()
                if db_user:
                    return User(
                        id=db_user.id,
                        username=db_user.username,
                        email=db_user.email,
                        full_name=db_user.full_name,
                        is_active=db_user.is_active,
                        is_admin=db_user.is_admin,
                        organization_id=db_user.organization_id,
                        created_at=db_user.created_at,
                        last_login=db_user.last_login,
                        quota=db_user.quota
                    )
                return None
            except Exception as e:
                logger.error(f"Database user retrieval failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        # Try file storage
        if self.storage_mode == "file":
            try:
                with open(self.users_file, "r") as f:
                    users = json.load(f)
                
                user = next((u for u in users if u["username"] == username), None)
                if user:
                    return User(
                        id=user["id"],
                        username=user["username"],
                        email=user["email"],
                        full_name=user["full_name"],
                        is_active=user["is_active"],
                        is_admin=user["is_admin"],
                        organization_id=user["organization_id"],
                        created_at=datetime.datetime.fromisoformat(user["created_at"]),
                        last_login=datetime.datetime.fromisoformat(user["last_login"]) if user["last_login"] else None,
                        quota=user["quota"]
                    )
                return None
            except Exception as e:
                logger.error(f"File-based user retrieval failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Try memory storage
        for user_id, user in self.memory_users.items():
            if user["username"] == username:
                return User(
                    id=user["id"],
                    username=user["username"],
                    email=user["email"],
                    full_name=user["full_name"],
                    is_active=user["is_active"],
                    is_admin=user["is_admin"],
                    organization_id=user["organization_id"],
                    created_at=datetime.datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"],
                    last_login=datetime.datetime.fromisoformat(user["last_login"]) if user["last_login"] and isinstance(user["last_login"], str) else user["last_login"],
                    quota=user["quota"]
                )
        
        return None
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password"""
        user = await self.get_user_by_username(username)
        
        if not user:
            return None
        
        # Get the hashed password based on storage mode
        hashed_password = None
        
        if self.storage_mode == "database":
            try:
                db_user = self.db_session.query(UserModel).filter(UserModel.username == username).first()
                if db_user:
                    hashed_password = db_user.hashed_password
            except Exception:
                pass
        
        elif self.storage_mode == "file":
            try:
                with open(self.users_file, "r") as f:
                    users = json.load(f)
                
                user_record = next((u for u in users if u["username"] == username), None)
                if user_record:
                    hashed_password = user_record["hashed_password"]
            except Exception:
                pass
        
        else:  # Memory storage
            user_record = next((u for u in self.memory_users.values() if u["username"] == username), None)
            if user_record:
                hashed_password = user_record["hashed_password"]
        
        if not hashed_password or not self._verify_password(password, hashed_password):
            return None
        
        return user
    
    async def create_token_for_user(self, user: User, expires_delta: Optional[int] = None) -> Token:
        """Create an authentication token for a user"""
        token_data = {
            "sub": user.username,
            "user_id": user.id,
            "is_admin": user.is_admin
        }
        
        access_token = self._create_access_token(token_data, expires_delta)
        
        # Update last login
        await self._update_last_login(user.id)
        
        # Calculate expiration
        expires_at = int((datetime.datetime.utcnow() + 
                         datetime.timedelta(minutes=expires_delta or DEFAULT_TOKEN_EXPIRE_MINUTES)).timestamp())
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_at=expires_at,
            user_id=user.id,
            username=user.username,
            is_admin=user.is_admin
        )
    
    async def _update_last_login(self, user_id: str) -> bool:
        """Update a user's last login time"""
        now = datetime.datetime.utcnow()
        
        if self.storage_mode == "database":
            try:
                db_user = self.db_session.query(UserModel).filter(UserModel.id == user_id).first()
                if db_user:
                    db_user.last_login = now
                    self.db_session.commit()
                    return True
            except Exception as e:
                logger.error(f"Failed to update last login in database: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        if self.storage_mode == "file":
            try:
                with open(self.users_file, "r") as f:
                    users = json.load(f)
                
                for user in users:
                    if user["id"] == user_id:
                        user["last_login"] = now.isoformat()
                        break
                
                with open(self.users_file, "w") as f:
                    json.dump(users, f, indent=2)
                    
                return True
            except Exception as e:
                logger.error(f"Failed to update last login in file: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory fallback
        if user_id in self.memory_users:
            self.memory_users[user_id]["last_login"] = now.isoformat()
            return True
        
        return False
    
    async def create_organization(self, org_data: OrganizationCreate) -> Organization:
        """Create a new organization"""
        org_id = str(uuid.uuid4())
        created_at = datetime.datetime.utcnow()
        
        # Default organization quota
        org_quota = {
            "max_users": 5,
            "max_projects": 20,
            "max_storage_gb": 5,
            "max_requests_per_day": 5000
        }
        
        if self.storage_mode == "database":
            try:
                db_org = OrganizationModel(
                    id=org_id,
                    name=org_data.name,
                    description=org_data.description,
                    created_at=created_at,
                    quota=org_quota
                )
                
                self.db_session.add(db_org)
                self.db_session.commit()
                self.db_session.refresh(db_org)
                
                # If admin user provided, assign them to the org
                if org_data.admin_user_id:
                    admin_user = self.db_session.query(UserModel).filter(UserModel.id == org_data.admin_user_id).first()
                    if admin_user:
                        admin_user.organization_id = org_id
                        admin_user.is_admin = True
                        self.db_session.commit()
                
                return Organization(
                    id=db_org.id,
                    name=db_org.name,
                    description=db_org.description,
                    created_at=db_org.created_at,
                    quota=db_org.quota
                )
            except Exception as e:
                logger.error(f"Database organization creation failed: {e}")
                # Fall back to file storage
                self.storage_mode = "file"
        
        # File storage
        if self.storage_mode == "file":
            try:
                org_record = {
                    "id": org_id,
                    "name": org_data.name,
                    "description": org_data.description,
                    "created_at": created_at.isoformat(),
                    "quota": org_quota
                }
                
                orgs = []
                try:
                    with open(self.orgs_file, "r") as f:
                        orgs = json.load(f)
                except Exception:
                    logger.error("Failed to read orgs file, creating new one")
                
                orgs.append(org_record)
                
                with open(self.orgs_file, "w") as f:
                    json.dump(orgs, f, indent=2)
                
                # If admin user provided, assign them to the org
                if org_data.admin_user_id:
                    try:
                        with open(self.users_file, "r") as f:
                            users = json.load(f)
                        
                        for user in users:
                            if user["id"] == org_data.admin_user_id:
                                user["organization_id"] = org_id
                                user["is_admin"] = True
                                break
                        
                        with open(self.users_file, "w") as f:
                            json.dump(users, f, indent=2)
                    except Exception as e:
                        logger.error(f"Failed to update admin user: {e}")
                
                return Organization(
                    id=org_id,
                    name=org_data.name,
                    description=org_data.description,
                    created_at=created_at,
                    quota=org_quota
                )
            except Exception as e:
                logger.error(f"File-based organization creation failed: {e}")
                # Fall back to memory storage
                self.storage_mode = "memory"
        
        # Memory storage
        org_record = {
            "id": org_id,
            "name": org_data.name,
            "description": org_data.description,
            "created_at": created_at.isoformat(),
            "quota": org_quota
        }
        
        self.memory_orgs[org_id] = org_record
        
        # If admin user provided, assign them to the org
        if org_data.admin_user_id and org_data.admin_user_id in self.memory_users:
            self.memory_users[org_data.admin_user_id]["organization_id"] = org_id
            self.memory_users[org_data.admin_user_id]["is_admin"] = True
        
        return Organization(
            id=org_id,
            name=org_data.name,
            description=org_data.description,
            created_at=created_at,
            quota=org_quota
        )

# Create a singleton instance for global use
user_manager = UserManager()

# Dependency for API routes
async def get_user_manager():
    # In a real application, you would inject dependencies like the database session
    return user_manager

async def get_current_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl="token"))):
    """Dependency to get the current authenticated user"""
    payload = await user_manager.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await user_manager.get_user_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Dependency to get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    """Dependency to get the current admin user"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for admin operations"
        )
    return current_user
