# WindSurf Backend

This is the backend API for the WindSurf AI Coding Platform, built with FastAPI, SQLAlchemy, and Alembic.

## Architecture Overview

The WindSurf backend follows a structured architecture inspired by AutoBE patterns:

1. **Waterfall Development Model**: Requirements → ERD → API Design → Test → Implementation
2. **Compiler-Enhanced Validation**: Using Pydantic for schema validation
3. **Separation of Concerns**: Clear boundaries between routes, services, and models
4. **Comprehensive Testing**: E2E test functions for all API endpoints
5. **Documentation Generation**: Auto-generated API docs from FastAPI/OpenAPI
6. **Database Schema Management**: SQLAlchemy + Alembic for migrations

## Directory Structure

```
backend/
├── api/                     # API implementation
│   ├── routes/              # API endpoints
│   │   ├── users.py         # User endpoints
│   │   └── auth.py          # Authentication endpoints
│   ├── services/            # Business logic
│   │   └── users.py         # User service
│   ├── dependencies.py      # FastAPI dependencies
│   ├── schemas.py           # Pydantic models
│   └── main.py              # Main FastAPI app
├── schemas/                 # Database schemas
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # Database connection
│   ├── alembic.ini          # Alembic config
│   └── migrations/          # Migration scripts
├── tests/                   # E2E tests
│   └── test_users.py        # User endpoint tests
├── docs/                    # Documentation
│   └── database_guide.md    # Database management guide
├── requirements.txt         # Dependencies
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Python 3.8+
- PostgreSQL (or SQLite as fallback)
- Virtual environment (recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/windsurf.git
   cd windsurf/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   # Create .env file
   echo "DATABASE_URL=postgresql+asyncpg://user:password@localhost/windsurf" > .env
   echo "SECRET_KEY=your-secret-key" >> .env
   ```

5. Run database migrations:
   ```bash
   cd schemas
   alembic upgrade head
   ```

### Running the API

```bash
uvicorn api.main:app --reload
```

The API will be available at http://localhost:8000

### API Documentation

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

## Development Workflow

The WindSurf backend follows the Waterfall Development Model:

1. **Requirements Analysis**:
   - Define user stories and requirements
   - Document in `/docs`

2. **ERD Design**:
   - Design database schema
   - Create entity relationship diagrams
   - Document in `/docs`

3. **API Design**:
   - Define API endpoints and schemas
   - Create Pydantic models in `api/schemas.py`

4. **Test Development**:
   - Write E2E tests for all endpoints
   - Store in `/tests` directory

5. **Implementation**:
   - Implement SQLAlchemy models
   - Implement API routes and services
   - Ensure separation of concerns

## Database Management

The backend uses SQLAlchemy ORM with Alembic for migrations. See the [Database Guide](docs/database_guide.md) for detailed information on:

- Database connection setup
- Model definition
- Migration creation and application
- Best practices
- Fallback mechanisms

## Testing

Run tests with pytest:

```bash
pytest
```

For more verbose output:

```bash
pytest -v
```

## Authentication

The API uses JWT-based authentication:

- `/auth/login`: Get access token
- `/auth/register`: Register new user
- `/auth/refresh-token`: Refresh access token
- `/auth/password-reset-request`: Request password reset
- `/auth/reset-password/{token}`: Reset password with token

## Fallback Mechanisms

The WindSurf backend implements several fallback mechanisms for robustness:

1. **Database Fallbacks**:
   - Connection retries with exponential backoff
   - SQLite fallback when PostgreSQL is unavailable
   - Read-only mode when writes fail

2. **Authentication Fallbacks**:
   - Multiple token storage options (cookies, localStorage)
   - Token refresh mechanisms
   - Grace period for expired tokens

3. **API Fallbacks**:
   - Graceful degradation for unavailable services
   - Caching for frequently accessed data
   - Circuit breakers for external dependencies

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests for your changes
4. Run the test suite
5. Submit a pull request

## License

[MIT License](LICENSE)
