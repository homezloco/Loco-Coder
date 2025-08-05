/**
 * Additional project scaffolding templates
 */

export const getCssTemplate = () => {
  return `/* Main Styles */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --accent-color: #e74c3c;
  --text-color: #333;
  --light-text: #f8f9fa;
  --dark-bg: #343a40;
  --light-bg: #f8f9fa;
  --border-radius: 4px;
  --box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s ease;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--light-bg);
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  margin-bottom: 1rem;
  line-height: 1.3;
}

h1 {
  font-size: 2.5rem;
}

h2 {
  font-size: 2rem;
}

h3 {
  font-size: 1.75rem;
}

p {
  margin-bottom: 1rem;
}

a {
  color: var(--primary-color);
  text-decoration: none;
  transition: var(--transition);
}

a:hover {
  color: #2980b9;
}

/* Header */
header {
  background-color: var(--primary-color);
  color: var(--light-text);
  padding: 1rem 0;
  box-shadow: var(--box-shadow);
}

header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  margin-bottom: 0;
}

nav ul {
  display: flex;
  list-style: none;
}

nav ul li {
  margin-left: 1.5rem;
}

nav ul li a {
  color: var(--light-text);
  font-weight: 500;
}

nav ul li a:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* Hero Section */
.hero {
  background-color: var(--primary-color);
  color: var(--light-text);
  padding: 4rem 0;
  text-align: center;
}

.hero h2 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.2rem;
  max-width: 600px;
  margin: 0 auto 2rem;
}

/* Sections */
section {
  padding: 4rem 0;
}

section h2 {
  text-align: center;
  margin-bottom: 3rem;
}

/* Features */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background-color: #fff;
  border-radius: var(--border-radius);
  padding: 2rem;
  box-shadow: var(--box-shadow);
  transition: var(--transition);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.feature-card h3 {
  color: var(--primary-color);
}

/* Contact Form */
.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
  font-family: inherit;
  font-size: 1rem;
}

/* Buttons */
.cta-button,
.submit-button {
  display: inline-block;
  background-color: var(--secondary-color);
  color: var(--light-text);
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.cta-button:hover,
.submit-button:hover {
  background-color: #27ae60;
  transform: translateY(-2px);
}

.submit-button {
  background-color: var(--primary-color);
}

.submit-button:hover {
  background-color: #2980b9;
}

/* Footer */
footer {
  background-color: var(--dark-bg);
  color: var(--light-text);
  padding: 2rem 0;
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  header .container {
    flex-direction: column;
  }
  
  nav ul {
    margin-top: 1rem;
  }
  
  nav ul li {
    margin-left: 1rem;
    margin-right: 1rem;
  }
  
  .hero h2 {
    font-size: 2.5rem;
  }
}

@media (max-width: 576px) {
  .hero h2 {
    font-size: 2rem;
  }
  
  .hero p {
    font-size: 1rem;
  }
}`;
};

export const getJsTemplate = (projectName) => {
  return `// Main JavaScript file for ${projectName}

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  console.log('${projectName} application loaded');
  
  // Form handling
  const contactForm = document.querySelector('.contact form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Button interactions
  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    ctaButton.addEventListener('click', () => {
      console.log('CTA button clicked');
      scrollToSection('features');
    });
  }
  
  // Initialize animations
  initAnimations();
});

/**
 * Handle form submissions
 * @param {Event} e - Form submit event
 */
function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  console.log('Form submitted with data:', data);
  
  // Example API call (commented out)
  /*
  fetch('/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      console.log('Success:', result);
      showNotification('Message sent successfully!', 'success');
      e.target.reset();
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('Failed to send message. Please try again.', 'error');
    });
  */
  
  // For demo purposes, just show a success message
  showNotification('Message sent successfully!', 'success');
  e.target.reset();
}

/**
 * Scroll to a specific section
 * @param {string} sectionId - ID of the section to scroll to
 */
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Show a notification to the user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Check if notification container exists, create if not
  let notificationContainer = document.querySelector('.notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = \`
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
      }
      .notification {
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 4px;
        color: white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.16);
        transform: translateX(100%);
        animation: slideIn 0.3s forwards, fadeOut 0.5s 2.5s forwards;
      }
      .notification.success { background-color: #2ecc71; }
      .notification.error { background-color: #e74c3c; }
      .notification.info { background-color: #3498db; }
      @keyframes slideIn {
        to { transform: translateX(0); }
      }
      @keyframes fadeOut {
        to { opacity: 0; }
      }
    \`;
    document.head.appendChild(style);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = \`notification \${type}\`;
  notification.textContent = message;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Remove after animation completes
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Initialize animations for page elements
 */
function initAnimations() {
  // Example: Animate feature cards on scroll
  const featureCards = document.querySelectorAll('.feature-card');
  
  if (featureCards.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });
    
    featureCards.forEach(card => {
      card.style.opacity = 0;
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(card);
    });
  }
}`;
};

export const getBackendFiles = () => {
  return [
    {
      "path": "backend/requirements.txt",
      "type": "file",
      "language": "text",
      "content": `fastapi==0.95.0
uvicorn==0.21.1
pydantic==1.10.7
sqlalchemy==2.0.9
psycopg2-binary==2.9.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
alembic==1.10.3
pytest==7.3.1
httpx==0.24.0
python-dotenv==1.0.0
`
    },
    {
      "path": "backend/app/main.py",
      "type": "file",
      "language": "python",
      "content": `from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import List

from app.api.api_v1.api import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
]

# Add additional origins from environment variable if available
if settings.CORS_ORIGINS:
    origins.extend([origin.strip() for origin in settings.CORS_ORIGINS.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """Root endpoint that returns API information"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": settings.PROJECT_DESCRIPTION,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

if __name__ == "__main__":
    # For development purposes only
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
`
    },
    {
      "path": "backend/app/core/config.py",
      "type": "file",
      "language": "python",
      "content": `import os
import secrets
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, BaseSettings, PostgresDsn, validator

class Settings(BaseSettings):
    # API configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FastAPI Backend"
    PROJECT_DESCRIPTION: str = "Modern API with FastAPI and SQLAlchemy"
    VERSION: str = "0.1.0"
    
    # CORS configuration
    CORS_ORIGINS: Optional[str] = None
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "app")
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None
    
    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        
        # Try to build PostgreSQL connection string
        try:
            return PostgresDsn.build(
                scheme="postgresql",
                user=values.get("POSTGRES_USER"),
                password=values.get("POSTGRES_PASSWORD"),
                host=values.get("POSTGRES_SERVER"),
                path=f"/{values.get('POSTGRES_DB') or ''}",
            )
        except Exception:
            # Fall back to SQLite for development
            return "sqlite:///./app.db"
    
    # First superuser
    FIRST_SUPERUSER: str = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
`
    }
  ];
};

export const getDockerFiles = () => {
  return [
    {
      "path": "docker-compose.yml",
      "type": "file",
      "language": "yaml",
      "content": `version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      - POSTGRES_SERVER=db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
      - SECRET_KEY=changeme
      - CORS_ORIGINS=http://localhost:3000
    networks:
      - app-network

  db:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
    ports:
      - "5432:5432"
    networks:
      - app-network

networks:
  app-network:

volumes:
  postgres_data:
`
    },
    {
      "path": "frontend/Dockerfile",
      "type": "file",
      "language": "dockerfile",
      "content": `# Build stage
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`
    },
    {
      "path": "backend/Dockerfile",
      "type": "file",
      "language": "dockerfile",
      "content": `FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`
    }
  ];
};

export const getGitHubWorkflowFiles = () => {
  return [
    {
      "path": ".github/workflows/ci.yml",
      "type": "file",
      "language": "yaml",
      "content": `name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  frontend-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci
      
    - name: Run tests
      working-directory: ./frontend
      run: npm test
      
    - name: Build
      working-directory: ./frontend
      run: npm run build

  backend-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        cache: 'pip'
        cache-dependency-path: backend/requirements.txt
        
    - name: Install dependencies
      working-directory: ./backend
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        
    - name: Run tests
      working-directory: ./backend
      env:
        POSTGRES_SERVER: localhost
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: test
      run: pytest
`
    }
  ];
};
