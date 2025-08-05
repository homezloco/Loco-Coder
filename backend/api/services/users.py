"""
User service for the WindSurf API.
Implements business logic for user-related operations.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from passlib.context import CryptContext

from ..schemas import UserCreate, UserUpdate, User
from ...schemas.models import User as UserModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    """Service for handling user-related operations."""
    
    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db
    
    async def create_user(self, user_create: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_create: User creation data
            
        Returns:
            The created user
            
        Raises:
            ValueError: If username or email already exists
        """
        # Check if username or email already exists
        query = select(UserModel).where(
            or_(
                UserModel.username == user_create.username,
                UserModel.email == user_create.email
            )
        )
        result = await self.db.execute(query)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            if existing_user.username == user_create.username:
                raise ValueError("Username already exists")
            else:
                raise ValueError("Email already exists")
        
        # Create new user
        hashed_password = pwd_context.hash(user_create.password)
        
        db_user = UserModel(
            id=str(uuid.uuid4()),
            username=user_create.username,
            email=user_create.email,
            password_hash=hashed_password,
            is_active=user_create.is_active,
            is_admin=user_create.is_admin,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(db_user)
        await self.db.commit()
        await self.db.refresh(db_user)
        
        return User.from_orm(db_user)
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """
        Get a user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User if found, None otherwise
        """
        query = select(UserModel).where(UserModel.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if user:
            return User.from_orm(user)
        return None
    
    async def get_user_by_username(self, username: str) -> Optional[UserModel]:
        """
        Get a user by username.
        
        Args:
            username: Username
            
        Returns:
            User model if found, None otherwise
        """
        query = select(UserModel).where(UserModel.username == username)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_users(
        self, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None
    ) -> Tuple[List[User], int]:
        """
        Get users with pagination and optional search.
        
        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return
            search: Optional search string for username or email
            
        Returns:
            Tuple of (list of users, total count)
        """
        # Base query
        query = select(UserModel)
        count_query = select(func.count()).select_from(UserModel)
        
        # Apply search filter if provided
        if search:
            search_filter = or_(
                UserModel.username.ilike(f"%{search}%"),
                UserModel.email.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        
        # Get total count
        result = await self.db.execute(count_query)
        total = result.scalar_one()
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        return [User.from_orm(user) for user in users], total
    
    async def update_user(self, user_id: str, user_update: UserUpdate) -> Optional[User]:
        """
        Update a user.
        
        Args:
            user_id: User ID
            user_update: User update data
            
        Returns:
            Updated user if found, None otherwise
            
        Raises:
            ValueError: If username or email already exists
        """
        # Get user
        query = select(UserModel).where(UserModel.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        # Check if username or email already exists
        if user_update.username and user_update.username != user.username:
            query = select(UserModel).where(UserModel.username == user_update.username)
            result = await self.db.execute(query)
            if result.scalar_one_or_none():
                raise ValueError("Username already exists")
        
        if user_update.email and user_update.email != user.email:
            query = select(UserModel).where(UserModel.email == user_update.email)
            result = await self.db.execute(query)
            if result.scalar_one_or_none():
                raise ValueError("Email already exists")
        
        # Update fields
        update_data: Dict[str, Any] = {}
        
        if user_update.username is not None:
            update_data["username"] = user_update.username
        
        if user_update.email is not None:
            update_data["email"] = user_update.email
        
        if user_update.password is not None:
            update_data["password_hash"] = pwd_context.hash(user_update.password)
        
        if user_update.is_active is not None:
            update_data["is_active"] = user_update.is_active
        
        if user_update.is_admin is not None:
            update_data["is_admin"] = user_update.is_admin
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            for key, value in update_data.items():
                setattr(user, key, value)
            
            await self.db.commit()
            await self.db.refresh(user)
        
        return User.from_orm(user)
    
    async def delete_user(self, user_id: str) -> bool:
        """
        Delete a user.
        
        Args:
            user_id: User ID
            
        Returns:
            True if user was deleted, False if not found
        """
        query = select(UserModel).where(UserModel.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        await self.db.delete(user)
        await self.db.commit()
        
        return True
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against a hash.
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password
            
        Returns:
            True if password matches hash, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """
        Get password hash.
        
        Args:
            password: Plain text password
            
        Returns:
            Password hash
        """
        return pwd_context.hash(password)
