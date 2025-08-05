@echo off
:: AILang Auto Update Windows Service Script
:: This script runs the AILang auto-update process as a background service on Windows
:: It can be scheduled using Windows Task Scheduler

setlocal enabledelayedexpansion

:: Configuration
set PYTHON_PATH=python
set PROJECT_ROOT=%~dp0..\..
set SCRIPT_PATH=%PROJECT_ROOT%\backend\tools\ailang_auto_update.py
set LOG_PATH=%PROJECT_ROOT%\backend\logs\ailang_auto_update.log

:: Create logs directory if it doesn't exist
if not exist "%PROJECT_ROOT%\backend\logs" mkdir "%PROJECT_ROOT%\backend\logs"

echo [%date% %time%] Starting AILang Auto Update Service >> "%LOG_PATH%"

:: Check if Python is available
%PYTHON_PATH% --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: Python not found. Please ensure Python is installed and in PATH. >> "%LOG_PATH%"
    echo Python not found. Please ensure Python is installed and in PATH.
    exit /b 1
)

:: Check if the script exists
if not exist "%SCRIPT_PATH%" (
    echo [%date% %time%] ERROR: AILang Auto Update script not found at %SCRIPT_PATH% >> "%LOG_PATH%"
    echo AILang Auto Update script not found at %SCRIPT_PATH%
    exit /b 1
)

:: Run the auto-update script
echo [%date% %time%] Running AILang Auto Update script... >> "%LOG_PATH%"
cd "%PROJECT_ROOT%\backend"
%PYTHON_PATH% "%SCRIPT_PATH%" --force >> "%LOG_PATH%" 2>&1

:: Check the result
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: AILang Auto Update failed with exit code %errorlevel% >> "%LOG_PATH%"
    echo AILang Auto Update failed. Check the log at %LOG_PATH% for details.
    exit /b %errorlevel%
) else (
    echo [%date% %time%] AILang Auto Update completed successfully >> "%LOG_PATH%"
    echo AILang Auto Update completed successfully.
)

exit /b 0
