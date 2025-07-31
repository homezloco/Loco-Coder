@echo off
:: Startup script for Local AI Coding Platform (Windows version)
setlocal enabledelayedexpansion

:: Terminal colors (Windows CMD)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

:: Print banner
echo %BLUE%
echo   _                     _      _    _____          _ _               ____  _         _    __                   
echo  ^| ^|    ___   ___ __ _^| ^|    / \  ^|_   _^|   ___  ^| ^| ^| __ _ _ __ __^|___ \^| ^|_   _  / \  / _\_   _  __ _       
echo  ^| ^|   / _ \ / __/ _` ^| ^|   / _ \   ^| ^|    / _ \ ^| ^| ^|/ _` ^| '_ `__ \__) ^| ^| ^| ^| ^|/ _ \ \ \ ^| ^| ^| ^|/ _` ^|  
echo  ^| ^|__^| (_) ^| (_^| (_^| ^| ^|  / ___ \  ^| ^|   ^| (_) ^|^| ^| ^| (_^| ^| ^| ^| ^| ^| / __/^| ^| ^|_^| / ___ \_\ \^| ^|_^| ^| (_^| ^|     
echo  ^|_____\___/ \___\__,_^|_^| /_/   \_\ ^|_^|    \___/ ^|_^|_^|\__,_^|_^| ^|_^| ^|_____^|^|_^|\__, /_/   \_\__/\__,_^|\__, ^|     
echo                                                                               ^|___/                 ^|___/      
echo %NC%
echo %GREEN%Local AI Coding Platform - Startup Script (Windows)%NC%

:: Function to handle errors with fallback
:run_with_fallback
    call %*
    if !errorlevel! neq 0 (
        echo %YELLOW%Command '%*' failed with status !errorlevel!. Attempting fallback...%NC%
        exit /b !errorlevel!
    )
    exit /b 0

:: Check for Docker
echo %BLUE%Checking for Docker...%NC%
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%Docker not found. Will run components individually.%NC%
    set "USE_DOCKER=false"
) else (
    echo %GREEN%Docker found!%NC%
    set "USE_DOCKER=true"
)

:: Check for Docker Compose
if "%USE_DOCKER%"=="true" (
    echo %BLUE%Checking for Docker Compose...%NC%
    docker compose version >nul 2>&1 || docker-compose --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo %YELLOW%Docker Compose not found. Will run Docker containers individually.%NC%
        set "HAS_DOCKER_COMPOSE=false"
    ) else (
        echo %GREEN%Docker Compose found!%NC%
        set "HAS_DOCKER_COMPOSE=true"
    )
)

:: Check for Ollama
echo %BLUE%Checking for Ollama...%NC%
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%Ollama not found. AI features will use fallback responses.%NC%
    set "HAS_OLLAMA=false"
) else (
    echo %GREEN%Ollama found!%NC%
    set "HAS_OLLAMA=true"
)

:: Start Ollama if available
if "%HAS_OLLAMA%"=="true" (
    echo %BLUE%Starting Ollama with CodeLlama model...%NC%
    
    :: Check if model exists
    ollama list | findstr "codellama" >nul
    if %errorlevel% neq 0 (
        echo %YELLOW%CodeLlama model not found. Pulling now (this may take a while)...%NC%
        call :run_with_fallback ollama pull codellama:instruct
    )
    
    :: Start Ollama in background
    echo %GREEN%Starting Ollama service...%NC%
    start "" ollama serve
    timeout /t 2 >nul
) else (
    echo %YELLOW%Skipping Ollama startup (not installed).%NC%
)

:: Main execution flow with fallback mechanisms
echo %BLUE%Starting Local AI Coding Platform...%NC%

:: Decide how to start the project based on available tools
if "%USE_DOCKER%"=="true" (
    if "%HAS_DOCKER_COMPOSE%"=="true" (
        call :start_with_docker_compose
        if %errorlevel% neq 0 (
            echo %YELLOW%Docker Compose failed. Trying individual containers...%NC%
            call :start_with_docker_individual
            if %errorlevel% neq 0 (
                echo %YELLOW%Docker containers failed. Falling back to local execution...%NC%
                call :start_without_docker
            )
        )
    ) else (
        call :start_with_docker_individual
        if %errorlevel% neq 0 (
            echo %YELLOW%Docker containers failed. Falling back to local execution...%NC%
            call :start_without_docker
        )
    )
) else (
    call :start_without_docker
)

:: Final message
echo %GREEN%Local AI Coding Platform started successfully!%NC%
echo %GREEN%Access the platform at: http://localhost:3000%NC%
echo %GREEN%API available at: http://localhost:8000%NC%
goto :eof

:: Function to start with Docker Compose
:start_with_docker_compose
    echo %BLUE%Starting all services with Docker Compose...%NC%
    
    :: Pull images first
    echo %BLUE%Pulling required Docker images...%NC%
    docker-compose pull
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    :: Start services
    echo %BLUE%Starting services...%NC%
    docker-compose up --build
    exit /b %errorlevel%

:: Function to start with individual Docker containers
:start_with_docker_individual
    echo %BLUE%Starting services with individual Docker containers...%NC%
    
    :: Create network
    echo %BLUE%Creating Docker network...%NC%
    docker network create coder-network
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    :: Start Backend
    echo %BLUE%Building and starting backend container...%NC%
    docker build -t coder-backend ./backend
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    docker run -d --name coder-backend --network coder-network -p 8000:8000 -v "%cd%\projects:/app/projects" coder-backend
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    :: Start Frontend
    echo %BLUE%Building and starting frontend container...%NC%
    docker build -t coder-frontend ./frontend
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    docker run -d --name coder-frontend --network coder-network -p 3000:3000 coder-frontend
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    echo %GREEN%Services started! Frontend available at: http://localhost:3000%NC%
    exit /b 0

:: Function to start without Docker
:start_without_docker
    echo %BLUE%Starting services locally without Docker...%NC%
    
    :: Start backend
    echo %BLUE%Installing backend dependencies...%NC%
    cd backend
    pip install -r requirements.txt
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    :: Start backend in background
    echo %BLUE%Starting backend server...%NC%
    start "" python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
    cd ..
    
    :: Wait for backend
    echo %BLUE%Waiting for backend to start...%NC%
    timeout /t 3 >nul
    
    :: Start frontend
    echo %BLUE%Installing frontend dependencies...%NC%
    cd frontend
    call npm install
    if %errorlevel% neq 0 exit /b %errorlevel%
    
    :: Start frontend
    echo %BLUE%Starting frontend development server...%NC%
    call npm run dev
    exit /b %errorlevel%
