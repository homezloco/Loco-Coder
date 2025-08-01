"""
Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta
import os
from jose import jwt
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# User models
class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    is_superuser: bool = False

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v
    
    @validator('email')
    def email_must_be_valid(cls, v):
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Invalid email format')
        return v.lower()

class UserInDB(UserBase):
    hashed_password: str
    created_at: datetime
    updated_at: datetime

class UserPublic(UserBase):
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class User(UserPublic):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    
class RegisterRequest(UserCreate):
    password_confirm: str
    
    @validator('password_confirm')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

# In-memory user database (replace with a real database in production)
class UserInDB(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: bool = False
    hashed_password: str
    is_superuser: bool = False
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

# In-memory database (replace with a real database in production)
fake_users_db: Dict[str, UserInDB] = {
    "testuser": UserInDB(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        disabled=False,
        hashed_password=pwd_context.hash("testpassword"),
        is_superuser=True
    )
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(username: str) -> Optional[UserInDB]:
    if username in fake_users_db:
        return fake_users_db[username]
    return None

def get_user_by_email(email: str) -> Optional[UserInDB]:
    for user in fake_users_db.values():
        if user.email.lower() == email.lower():
            return user
    return None

def create_user(user_data: UserCreate) -> UserInDB:
    # Check if username already exists
    if get_user(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    hashed_password = pwd_context.hash(user_data.password)
    
    # Create user data
    user_dict = user_data.dict(exclude={"password"})
    user_dict.update({
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    # Create and store user
    user = UserInDB(**user_dict)
    fake_users_db[user.username] = user
    
    return user

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = get_user(username)
    if not user:
        # Try to find by email
        user = get_user_by_email(username)
        if not user:
            return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user

# Initialize logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(tags=["auth"], prefix="/auth")

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: RegisterRequest):
    """
    Register a new user
    """
    try:
        # Create the user (validations happen in the UserCreate model)
        user = create_user(user_data)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=access_token_expires
        )
        
        # Return user data and token
        return {
            **user.dict(exclude={"hashed_password"}),
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not register user. Please check your information and try again."
        )

@router.post("/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is disabled
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    # Convert user to dict and remove sensitive data
    user_dict = user.dict(exclude={"hashed_password"})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user_dict
    }

@router.get("/me")
async def read_users_me(current_user: User = Depends()):
    """
    Get current user information
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return {
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_superuser": current_user.is_superuser,
        "disabled": current_user.disabled
    }

@router.get("/validate")
async def validate_token(authorization: str = Header(None)):
    """
    Validate the current access token
    Returns user information if token is valid
    """
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Missing or invalid authorization header"},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid token payload"},
                headers={"Access-Control-Allow-Origin": "*"}
            )
            
        user = get_user(username=username)
        if user is None:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "User not found"},
                headers={"Access-Control-Allow-Origin": "*"}
            )
            
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "is_superuser": user.is_superuser,
                "disabled": user.disabled
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )
        
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Token has expired"},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except (jwt.JWTError, jwt.PyJWTError) as e:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": f"Invalid token: {str(e)}"},
            headers={"Access-Control-Allow-Origin": "*"}
        )
