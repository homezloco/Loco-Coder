# AILang Dashboard Integration

This document provides instructions for running and testing the AILang Dashboard integration with the standalone AILang API server.

## Overview

The AILang Dashboard is a React-based web interface that provides monitoring, logging, and management capabilities for the AILang adapter system. It communicates with a backend API server that provides the following endpoints:

- `/api/health` - System health status
- `/api/logs` - System logs
- `/api/version` - Version information
- `/api/update` - Update management

## Setup and Running

### Prerequisites

- Python 3.8+
- Node.js 14+ and npm
- Virtual environment (recommended)

### Backend Setup (Standalone API Server)

Due to some integration issues with the main backend application, we've created a standalone AILang API server that provides all necessary endpoints for the dashboard. This server runs on port 8001 to avoid conflicts with the main backend.

1. **Create and activate a virtual environment**:

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate
```

2. **Install required packages**:

```bash
pip install fastapi uvicorn aiohttp requests colorama
```

3. **Run the standalone API server**:

```bash
# From the backend directory
python -m ailang_api
```

The server will start on `http://localhost:8001`.

### Frontend Setup

1. **Install dependencies**:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

2. **Run the development server**:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Testing the Integration

We've provided two tools to help test the integration:

### 1. Automated Integration Tests

The integration test script checks if all API endpoints are accessible and return data in the expected format:

```bash
# From the backend directory with the virtual environment activated
python tools/test_dashboard_integration.py
```

### 2. User Validation Script

This script guides you through manually validating the frontend dashboard components:

```bash
# From the project root with the virtual environment activated
python tools/validate_dashboard_frontend.py
```

Follow the on-screen instructions to complete the validation.

## Dashboard Features

The AILang Dashboard includes the following features:

1. **System Status Dashboard**
   - Health status indicators
   - Version information
   - System metrics

2. **Logs Viewer**
   - View system logs
   - Filter logs (if implemented)
   - Timestamp display

3. **Version Information**
   - Version details
   - Update status
   - GitHub repository link

4. **Update Management**
   - Check for updates
   - Force update option

5. **Responsive Design**
   - Desktop and mobile views
   - Drawer navigation on desktop
   - Bottom navigation on mobile

## Known Issues

See `backend/docs/known_issues.md` for information about known issues and workarounds, including:

- Pydantic coroutine serialization error in the main backend application
- SQLAlchemy import issue (resolved)

## Deployment

For deployment options, refer to the main README file which includes information about:

- Docker deployment
- Windows service setup
- Linux systemd service

## Troubleshooting

If you encounter any issues:

1. **API server not starting**:
   - Check that port 8001 is not in use
   - Ensure all dependencies are installed
   - Check the console for error messages

2. **Frontend not connecting to API**:
   - Verify the API server is running
   - Check CORS settings if running on different domains/ports
   - Inspect browser console for network errors

3. **Dashboard components not displaying data**:
   - Check browser console for JavaScript errors
   - Verify API responses using the browser's network inspector
   - Run the integration test script to validate API endpoints

## Contributing

If you'd like to contribute to the AILang Dashboard:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests to ensure everything works
5. Submit a pull request
