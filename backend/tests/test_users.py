"""
E2E tests for user endpoints.
"""
import pytest
import asyncio
from httpx import AsyncClient
from fastapi import status
from typing import Dict, Generator, AsyncGenerator
import uuid

from ..api.main import app
from ..schemas.database import get_db, init_db
from ..api.dependencies import create_access_token
from ..schemas.models import User as UserModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker

# Test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Test data
test_user_admin = {
    "username": "testadmin",
    "email": "admin@example.com",
    "password": "Admin123!",
    "is_active": True,
    "is_admin": True
}

test_user_regular = {
    "username": "testuser",
    "email": "user@example.com",
    "password": "User123!",
    "is_active": True,
    "is_admin": False
}

test_user_update = {
    "username": "updateduser",
    "email": "updated@example.com",
    "password": "Updated123!"
}

# Override dependency
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="module")
async def setup_db():
    """Setup test database."""
    # Create tables
    async with engine.begin() as conn:
        from ..schemas.models import Base
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test users
    async with TestingSessionLocal() as session:
        # Admin user
        admin_user = UserModel(
            id=str(uuid.uuid4()),
            username=test_user_admin["username"],
            email=test_user_admin["email"],
            password_hash="$2b$12$IKEQb00u5eHhkjnMdxSfb.0gJP4VUrPHjZVdTLJKUkCuUjtdS4MSi",  # hashed "Admin123!"
            is_active=test_user_admin["is_active"],
            is_admin=test_user_admin["is_admin"]
        )
        session.add(admin_user)
        
        # Regular user
        regular_user = UserModel(
            id=str(uuid.uuid4()),
            username=test_user_regular["username"],
            email=test_user_regular["email"],
            password_hash="$2b$12$IKEQb00u5eHhkjnMdxSfb.0gJP4VUrPHjZVdTLJKUkCuUjtdS4MSi",  # hashed "User123!"
            is_active=test_user_regular["is_active"],
            is_admin=test_user_regular["is_admin"]
        )
        session.add(regular_user)
        
        await session.commit()
        
        # Store user IDs for tests
        admin_id = admin_user.id
        regular_id = regular_user.id
    
    yield {"admin_id": admin_id, "regular_id": regular_id}
    
    # Clean up
    async with engine.begin() as conn:
        from ..schemas.models import Base
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
def admin_token(setup_db) -> str:
    """Create admin token."""
    admin_id = setup_db["admin_id"]
    return create_access_token(
        data={"sub": test_user_admin["username"], "user_id": admin_id}
    )

@pytest.fixture
def regular_token(setup_db) -> str:
    """Create regular user token."""
    regular_id = setup_db["regular_id"]
    return create_access_token(
        data={"sub": test_user_regular["username"], "user_id": regular_id}
    )

@pytest.mark.asyncio
async def test_create_user(setup_db, admin_token):
    """Test creating a new user."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create new user as admin
        new_user = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "NewUser123!",
            "is_active": True,
            "is_admin": False
        }
        
        response = await client.post(
            "/users/",
            json=new_user,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["username"] == new_user["username"]
        assert data["email"] == new_user["email"]
        assert "id" in data
        assert "password" not in data

@pytest.mark.asyncio
async def test_create_user_unauthorized(setup_db, regular_token):
    """Test creating a user without admin privileges."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Try to create new user as regular user
        new_user = {
            "username": "newuser2",
            "email": "new2@example.com",
            "password": "NewUser123!",
            "is_active": True,
            "is_admin": False
        }
        
        response = await client.post(
            "/users/",
            json=new_user,
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_get_users(setup_db, admin_token):
    """Test getting all users."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/users/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 2  # At least admin and regular user

@pytest.mark.asyncio
async def test_get_users_unauthorized(setup_db, regular_token):
    """Test getting all users without admin privileges."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/users/",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_get_current_user(setup_db, regular_token):
    """Test getting current user info."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == test_user_regular["username"]
        assert data["email"] == test_user_regular["email"]

@pytest.mark.asyncio
async def test_get_user_by_id(setup_db, admin_token):
    """Test getting a specific user by ID."""
    regular_id = setup_db["regular_id"]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            f"/users/{regular_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == test_user_regular["username"]
        assert data["email"] == test_user_regular["email"]

@pytest.mark.asyncio
async def test_get_user_by_id_unauthorized(setup_db, regular_token):
    """Test getting another user by ID without admin privileges."""
    admin_id = setup_db["admin_id"]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            f"/users/{admin_id}",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_update_user(setup_db, admin_token):
    """Test updating a user."""
    regular_id = setup_db["regular_id"]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.put(
            f"/users/{regular_id}",
            json=test_user_update,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == test_user_update["username"]
        assert data["email"] == test_user_update["email"]

@pytest.mark.asyncio
async def test_update_user_unauthorized(setup_db, regular_token):
    """Test updating another user without admin privileges."""
    admin_id = setup_db["admin_id"]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.put(
            f"/users/{admin_id}",
            json=test_user_update,
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_delete_user(setup_db, admin_token):
    """Test deleting a user."""
    # First create a user to delete
    async with AsyncClient(app=app, base_url="http://test") as client:
        new_user = {
            "username": "todelete",
            "email": "delete@example.com",
            "password": "Delete123!",
            "is_active": True,
            "is_admin": False
        }
        
        create_response = await client.post(
            "/users/",
            json=new_user,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == status.HTTP_201_CREATED
        user_id = create_response.json()["id"]
        
        # Now delete the user
        delete_response = await client.delete(
            f"/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify user is deleted
        get_response = await client.get(
            f"/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_delete_user_unauthorized(setup_db, regular_token):
    """Test deleting a user without admin privileges."""
    admin_id = setup_db["admin_id"]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.delete(
            f"/users/{admin_id}",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_login_valid_credentials():
    """Test login with valid credentials."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            data={
                "username": test_user_regular["username"],
                "password": test_user_regular["password"]
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials():
    """Test login with invalid credentials."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            data={
                "username": test_user_regular["username"],
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_login_inactive_user(setup_db, admin_token):
    """Test login with inactive user."""
    # First create an inactive user
    async with AsyncClient(app=app, base_url="http://test") as client:
        new_user = {
            "username": "inactive",
            "email": "inactive@example.com",
            "password": "Inactive123!",
            "is_active": False,
            "is_admin": False
        }
        
        create_response = await client.post(
            "/users/",
            json=new_user,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == status.HTTP_201_CREATED
        
        # Try to login with inactive user
        response = await client.post(
            "/auth/login",
            data={
                "username": new_user["username"],
                "password": new_user["password"]
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_update_own_profile(setup_db, regular_token):
    """Test updating own user profile."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        update_data = {
            "username": "updatedprofile",
            "email": "updatedprofile@example.com"
        }
        
        response = await client.put(
            "/users/me",
            json=update_data,
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == update_data["username"]
        assert data["email"] == update_data["email"]

@pytest.mark.asyncio
async def test_change_password(setup_db, regular_token):
    """Test changing own password."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        password_data = {
            "current_password": test_user_regular["password"],
            "new_password": "NewPassword123!"
        }
        
        response = await client.post(
            "/users/me/change-password",
            json=password_data,
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify login with new password works
        login_response = await client.post(
            "/auth/login",
            data={
                "username": test_user_regular["username"],
                "password": password_data["new_password"]
            }
        )
        
        assert login_response.status_code == status.HTTP_200_OK

@pytest.mark.asyncio
async def test_register_new_user():
    """Test registering a new user."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        new_user = {
            "username": "registeruser",
            "email": "register@example.com",
            "password": "Register123!"
        }
        
        response = await client.post(
            "/auth/register",
            json=new_user
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["username"] == new_user["username"]
        assert data["email"] == new_user["email"]
        assert "id" in data
        assert "password" not in data

@pytest.mark.asyncio
async def test_register_duplicate_username():
    """Test registering with duplicate username."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        duplicate_user = {
            "username": test_user_regular["username"],
            "email": "unique@example.com",
            "password": "Unique123!"
        }
        
        response = await client.post(
            "/auth/register",
            json=duplicate_user
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.asyncio
async def test_register_duplicate_email():
    """Test registering with duplicate email."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        duplicate_user = {
            "username": "uniqueuser",
            "email": test_user_regular["email"],
            "password": "Unique123!"
        }
        
        response = await client.post(
            "/auth/register",
            json=duplicate_user
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.asyncio
async def test_request_password_reset():
    """Test requesting password reset."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/password-reset-request",
            json={"email": test_user_regular["email"]}
        )
        
        # Should return success even if email doesn't exist (for security)
        assert response.status_code == status.HTTP_200_OK

@pytest.mark.asyncio
async def test_validate_token_no_auth():
    """Test accessing protected endpoint without token."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_validate_token_invalid_token():
    """Test accessing protected endpoint with invalid token."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/users/me",
            headers={"Authorization": "Bearer invalidtoken123"}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

if __name__ == "__main__":
    pytest.main(["-v", "test_users.py"])
