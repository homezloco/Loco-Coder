# PowerShell script to start the Coder application with fallbacks
# This script handles port conflicts and ensures all components start properly

# Configuration
$backendPorts = @(8000, 8001, 8002, 8003)
$frontendPorts = @(3000, 3001, 3002, 3003)
$backendProcess = $null
$frontendProcess = $null

Write-Host "`e[1;36mStarting Coder application with fallback mechanisms`e[0m"
Write-Host "`e[1;36mChecking system requirements...`e[0m"

# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $connections -ne $null
}

# Function to stop processes using specific ports
function Stop-ProcessesOnPorts {
    param($ports)
    foreach ($port in $ports) {
        try {
            $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($process in $processes) {
                $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
                if ($processInfo) {
                    Write-Host "`e[1;33mStopping process $($processInfo.ProcessName) (ID: $process) using port $port`e[0m"
                    Stop-Process -Id $process -Force
                    Start-Sleep -Seconds 1
                }
            }
        } catch {}
    }
}

# Check and activate Python virtual environment
if (-not (Test-Path -Path ".\venv\Scripts\activate.ps1")) {
    Write-Host "`e[1;33mCreating Python virtual environment...`e[0m"
    python -m venv venv
}

Write-Host "`e[1;36mActivating virtual environment...`e[0m"
try {
    & .\venv\Scripts\activate.ps1
} catch {
    Write-Host "`e[1;31mFailed to activate virtual environment. Continuing without it...`e[0m"
}

# Install dependencies
Write-Host "`e[1;36mInstalling/updating Python dependencies...`e[0m"
pip install -r requirements.txt

# Clean up any processes using our target ports
Write-Host "`e[1;36mCleaning up any existing processes using our ports...`e[0m"
Stop-ProcessesOnPorts -ports ($backendPorts + $frontendPorts)

# Start backend server with port fallbacks
$backendStarted = $false
$backendPort = 0

foreach ($port in $backendPorts) {
    if (-not (Test-PortInUse $port)) {
        Write-Host "`e[1;36mLaunching FastAPI backend on port $port`e[0m"
        $backendPort = $port
        try {
            $backendProcess = Start-Process -FilePath "python" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port $port --reload" -PassThru -WindowStyle Normal
            $backendStarted = $true
            break
        } catch {
            Write-Host "`e[1;31mFailed to start backend on port $port`e[0m"
        }
    } else {
        Write-Host "`e[1;33mPort $port is in use, trying next port...`e[0m"
    }
}

if (-not $backendStarted) {
    Write-Host "`e[1;31mAll backend ports are in use. Please free up one of these ports: $($backendPorts -join ', ')`e[0m"
    exit 1
}

# Start frontend server with port fallbacks
$frontendStarted = $false
$frontendPort = 0

Write-Host "`e[1;36mStarting frontend server...`e[0m"
Push-Location -Path ".\frontend"
try {
    foreach ($port in $frontendPorts) {
        if (-not (Test-PortInUse $port)) {
            Write-Host "`e[1;36mLaunching frontend on port $port`e[0m"
            $frontendPort = $port
            try {
                $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run dev -- --port $port" -PassThru -WindowStyle Normal
                $frontendStarted = $true
                break
            } catch {
                Write-Host "`e[1;31mFailed to start frontend on port $port`e[0m"
            }
        } else {
            Write-Host "`e[1;33mPort $port is in use, trying next port...`e[0m"
        }
    }
} finally {
    Pop-Location
}

if (-not $frontendStarted) {
    Write-Host "`e[1;31mAll frontend ports are in use. Please free up one of these ports: $($frontendPorts -join ', ')`e[0m"
    if ($backendProcess) { Stop-Process -Id $backendProcess.Id -Force }
    exit 1
}

# Final success message with URLs
Write-Host "`e[1;32m-------------------------------------------------------------`e[0m"
Write-Host "`e[1;32mCoder Platform started successfully!`e[0m"
Write-Host "`e[1;32m-------------------------------------------------------------`e[0m"
Write-Host "`e[1;36mBackend available at:`e[0m http://localhost:$backendPort"
Write-Host "`e[1;36mFrontend available at:`e[0m http://localhost:$frontendPort"
Write-Host "`e[1;36mDirect Menu (guaranteed access):`e[0m http://localhost:$frontendPort/direct-menu.html" 
Write-Host "`e[1;36mFramed App (guaranteed menu):`e[0m http://localhost:$frontendPort/framed-app.html"
Write-Host "`e[1;32m-------------------------------------------------------------`e[0m"
Write-Host "`e[1;36mKeyboard shortcuts:`e[0m"
Write-Host "  Alt+P: Show Projects Dashboard"
Write-Host "  Alt+N: Create New Project"
Write-Host "  Alt+M: Toggle Main Menu" 
Write-Host "  Alt+H: Open Help/Direct Menu"
Write-Host "  Alt+F: Open Framed App"
Write-Host "  Alt+K: Show All Shortcuts"
Write-Host "`e[1;32m-------------------------------------------------------------`e[0m"
Write-Host "`e[1;33mPress Ctrl+C in this window to stop all services`e[0m"

# Keep script running until user cancels
try {
    Write-Host "`e[1;36mPress Ctrl+C to stop all services`e[0m"
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if processes are still running
        if (-not (Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue)) {
            Write-Host "`e[1;31mBackend process stopped unexpectedly, restarting...`e[0m"
            try {
                $backendProcess = Start-Process -FilePath "python" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port $backendPort --reload" -PassThru -WindowStyle Normal
            } catch {
                Write-Host "`e[1;31mFailed to restart backend`e[0m"
            }
        }
        
        if (-not (Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue)) {
            Write-Host "`e[1;31mFrontend process stopped unexpectedly, restarting...`e[0m"
            Push-Location -Path ".\frontend"
            try {
                $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run dev -- --port $frontendPort" -PassThru -WindowStyle Normal
            } catch {
                Write-Host "`e[1;31mFailed to restart frontend`e[0m"
            }
            Pop-Location
        }
    }
} finally {
    # Cleanup when user presses Ctrl+C
    if ($backendProcess -and (Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $backendProcess.Id -Force
    }
    if ($frontendProcess -and (Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $frontendProcess.Id -Force
    }
    Write-Host "`e[1;36mAll services stopped`e[0m"
}
