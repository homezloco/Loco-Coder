"""
Authentication routes for the WindSurf API.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
import uuid
from typing import Any

from ..dependencies import get_current_user, get_password_hash, verify_password, create_access_token
from ..services.users import UserService
from ..schemas import UserCreate, UserResponse, Token, EmailSchema
from ...schemas.database import get_db
from ...schemas.models import User as UserModel

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={401: {"description": "Unauthorized"}},
)

# Constants
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user_service = UserService(db)
    user = await user_service.authenticate(
        username=form_data.username,
        password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Register a new user.
    """
    user_service = UserService(db)
    
    # Check if username exists
    existing_user = await user_service.get_by_username(username=user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    existing_email = await user_service.get_by_email(email=user_in.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_data = user_in.model_dump()
    password = user_data.pop("password")
    user_data["password_hash"] = get_password_hash(password)
    user_data["id"] = str(uuid.uuid4())
    user_data["is_active"] = True
    user_data["is_admin"] = False
    
    user = await user_service.create(user_data=user_data)
    return user

@router.post("/password-reset-request", status_code=status.HTTP_200_OK)
async def request_password_reset(
    email_in: EmailSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Request a password reset token.
    """
    user_service = UserService(db)
    user = await user_service.get_by_email(email=email_in.email)
    
    # Always return success to prevent email enumeration
    if user and user.is_active:
        # Generate reset token
        reset_token = str(uuid.uuid4())
        
        # Store token in database or cache (implementation depends on your setup)
        # For simplicity, we'll just log it here
        # In a real app, you'd store this securely and send an email
        
        # Add email sending to background tasks
        # background_tasks.add_task(
        #     send_password_reset_email, user.email, user.username, reset_token
        # )
        
        print(f"Password reset requested for {user.email}. Token: {reset_token}")
    
    return {"message": "If the email exists, a password reset link will be sent"}

@router.post("/reset-password/{token}", status_code=status.HTTP_200_OK)
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Reset password using token.
    """
    # In a real app, you'd verify the token from your database/cache
    # For this example, we'll just return a success message
    
    # This would be the actual implementation:
    # user_service = UserService(db)
    # user = await user_service.get_by_reset_token(token)
    # if not user:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Invalid or expired token"
    #     )
    # 
    # await user_service.update_password(user.id, new_password)
    # await user_service.clear_reset_token(user.id)
    
    return {"message": "Password has been reset successfully"}

@router.post("/refresh-token", response_model=Token)
async def refresh_token(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Refresh access token.
    """
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.username, "user_id": current_user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
