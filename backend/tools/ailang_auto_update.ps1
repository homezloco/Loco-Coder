# AILang Auto Update PowerShell Script
# This script provides advanced functionality for running the AILang auto-update process on Windows
# It can be run manually, as a scheduled task, or installed as a Windows service using NSSM

param (
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$RunOnce,
    [string]$ServiceName = "AILangAutoUpdate",
    [string]$PythonPath = "python",
    [int]$IntervalHours = 24
)

# Script configuration
$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
$projectRoot = (Get-Item $scriptDir).Parent.Parent.FullName
$autoUpdateScript = Join-Path $projectRoot "backend\tools\ailang_auto_update.py"
$logDir = Join-Path $projectRoot "backend\logs"
$logFile = Join-Path $logDir "ailang_auto_update_ps.log"
$nssmPath = Join-Path $scriptDir "nssm.exe"

# Create logs directory if it doesn't exist
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Function to write to log file
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $logFile -Value $logMessage
    
    # Also write to console
    if ($Level -eq "ERROR") {
        Write-Host $logMessage -ForegroundColor Red
    } elseif ($Level -eq "WARNING") {
        Write-Host $logMessage -ForegroundColor Yellow
    } else {
        Write-Host $logMessage
    }
}

# Function to check if Python is available
function Test-Python {
    try {
        $pythonVersion = & $PythonPath --version 2>&1
        Write-Log "Python detected: $pythonVersion"
        return $true
    } catch {
        Write-Log "Python not found. Please ensure Python is installed and the path is correct." "ERROR"
        return $false
    }
}

# Function to check if the auto-update script exists
function Test-Script {
    if (Test-Path $autoUpdateScript) {
        Write-Log "AILang Auto Update script found at $autoUpdateScript"
        return $true
    } else {
        Write-Log "AILang Auto Update script not found at $autoUpdateScript" "ERROR"
        return $false
    }
}

# Function to run the auto-update script once
function Invoke-AutoUpdate {
    param (
        [switch]$Force
    )
    
    Write-Log "Running AILang Auto Update script..."
    
    # Change to the backend directory
    Push-Location (Join-Path $projectRoot "backend")
    
    try {
        $arguments = @()
        if ($Force) {
            $arguments += "--force"
        }
        
        # Run the script
        $process = Start-Process -FilePath $PythonPath -ArgumentList @($autoUpdateScript) + $arguments -NoNewWindow -PassThru -Wait
        
        if ($process.ExitCode -eq 0) {
            Write-Log "AILang Auto Update completed successfully"
            return $true
        } else {
            Write-Log "AILang Auto Update failed with exit code $($process.ExitCode)" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error running AILang Auto Update: $_" "ERROR"
        return $false
    } finally {
        # Return to the original directory
        Pop-Location
    }
}

# Function to run the auto-update script as a continuous service
function Start-AutoUpdateService {
    Write-Log "Starting AILang Auto Update service..."
    
    # Change to the backend directory
    Push-Location (Join-Path $projectRoot "backend")
    
    try {
        # Run the script with the --service flag
        $process = Start-Process -FilePath $PythonPath -ArgumentList @($autoUpdateScript, "--service", "--interval", ($IntervalHours * 3600)) -NoNewWindow -PassThru
        
        Write-Log "AILang Auto Update service started with PID $($process.Id)"
        return $process.Id
    } catch {
        Write-Log "Error starting AILang Auto Update service: $_" "ERROR"
        return $null
    } finally {
        # Return to the original directory
        Pop-Location
    }
}

# Function to install the auto-update script as a Windows service using NSSM
function Install-AutoUpdateService {
    # Check if NSSM is available
    if (-not (Test-Path $nssmPath)) {
        Write-Log "NSSM not found at $nssmPath. Downloading..." "WARNING"
        
        # Download NSSM
        $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $nssmZip = Join-Path $scriptDir "nssm.zip"
        
        try {
            Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
            
            # Extract NSSM
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::ExtractToDirectory($nssmZip, $scriptDir)
            
            # Find the correct NSSM executable based on architecture
            $nssmDir = Join-Path $scriptDir "nssm-2.24"
            if ([Environment]::Is64BitOperatingSystem) {
                $nssmPath = Join-Path $nssmDir "win64\nssm.exe"
            } else {
                $nssmPath = Join-Path $nssmDir "win32\nssm.exe"
            }
            
            # Copy NSSM to the script directory
            Copy-Item $nssmPath (Join-Path $scriptDir "nssm.exe")
            $nssmPath = Join-Path $scriptDir "nssm.exe"
            
            # Clean up
            Remove-Item $nssmZip
            Remove-Item $nssmDir -Recurse
            
            Write-Log "NSSM downloaded and extracted successfully"
        } catch {
            Write-Log "Failed to download NSSM: $_" "ERROR"
            return $false
        }
    }
    
    # Check if the service already exists
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Log "Service '$ServiceName' already exists" "WARNING"
        return $false
    }
    
    # Install the service
    Write-Log "Installing AILang Auto Update as Windows service '$ServiceName'..."
    
    $pythonExe = (Get-Command $PythonPath -ErrorAction SilentlyContinue).Source
    if (-not $pythonExe) {
        $pythonExe = "python.exe" # Fall back to PATH
    }
    
    $serviceArgs = @(
        "install",
        $ServiceName,
        $pythonExe,
        "`"$autoUpdateScript`" --service"
    )
    
    try {
        $process = Start-Process -FilePath $nssmPath -ArgumentList $serviceArgs -NoNewWindow -PassThru -Wait
        
        if ($process.ExitCode -eq 0) {
            # Configure service
            & $nssmPath set $ServiceName AppDirectory (Join-Path $projectRoot "backend")
            & $nssmPath set $ServiceName DisplayName "AILang Auto Update Service"
            & $nssmPath set $ServiceName Description "Automatically updates the AILang adapter when changes are detected in the AILang repository"
            & $nssmPath set $ServiceName Start SERVICE_AUTO_START
            & $nssmPath set $ServiceName ObjectName LocalSystem
            & $nssmPath set $ServiceName AppStdout (Join-Path $logDir "ailang_service_stdout.log")
            & $nssmPath set $ServiceName AppStderr (Join-Path $logDir "ailang_service_stderr.log")
            
            Write-Log "Service '$ServiceName' installed successfully"
            return $true
        } else {
            Write-Log "Failed to install service '$ServiceName'" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error installing service: $_" "ERROR"
        return $false
    }
}

# Function to uninstall the Windows service
function Uninstall-AutoUpdateService {
    # Check if the service exists
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Log "Service '$ServiceName' does not exist" "WARNING"
        return $false
    }
    
    # Uninstall the service
    Write-Log "Uninstalling service '$ServiceName'..."
    
    try {
        $process = Start-Process -FilePath $nssmPath -ArgumentList @("remove", $ServiceName, "confirm") -NoNewWindow -PassThru -Wait
        
        if ($process.ExitCode -eq 0) {
            Write-Log "Service '$ServiceName' uninstalled successfully"
            return $true
        } else {
            Write-Log "Failed to uninstall service '$ServiceName'" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error uninstalling service: $_" "ERROR"
        return $false
    }
}

# Function to start the Windows service
function Start-WindowsService {
    # Check if the service exists
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Log "Service '$ServiceName' does not exist" "ERROR"
        return $false
    }
    
    # Start the service
    Write-Log "Starting service '$ServiceName'..."
    
    try {
        Start-Service -Name $ServiceName
        Write-Log "Service '$ServiceName' started successfully"
        return $true
    } catch {
        Write-Log "Error starting service: $_" "ERROR"
        return $false
    }
}

# Function to stop the Windows service
function Stop-WindowsService {
    # Check if the service exists
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Log "Service '$ServiceName' does not exist" "ERROR"
        return $false
    }
    
    # Stop the service
    Write-Log "Stopping service '$ServiceName'..."
    
    try {
        Stop-Service -Name $ServiceName
        Write-Log "Service '$ServiceName' stopped successfully"
        return $true
    } catch {
        Write-Log "Error stopping service: $_" "ERROR"
        return $false
    }
}

# Function to check the status of the Windows service
function Get-ServiceStatus {
    # Check if the service exists
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Log "Service '$ServiceName' does not exist" "WARNING"
        return $false
    }
    
    # Get the service status
    Write-Log "Service '$ServiceName' status: $($service.Status)"
    return $true
}

# Main script logic
Write-Log "AILang Auto Update PowerShell Script started"

# Check Python and script
$pythonOk = Test-Python
$scriptOk = Test-Script

if (-not ($pythonOk -and $scriptOk)) {
    Write-Log "Prerequisites check failed. Exiting." "ERROR"
    exit 1
}

# Process command line arguments
if ($Install) {
    $result = Install-AutoUpdateService
    if ($result) {
        Write-Log "Service installation completed successfully"
    } else {
        Write-Log "Service installation failed" "ERROR"
        exit 1
    }
} elseif ($Uninstall) {
    $result = Uninstall-AutoUpdateService
    if ($result) {
        Write-Log "Service uninstallation completed successfully"
    } else {
        Write-Log "Service uninstallation failed" "ERROR"
        exit 1
    }
} elseif ($Start) {
    $result = Start-WindowsService
    if ($result) {
        Write-Log "Service start completed successfully"
    } else {
        Write-Log "Service start failed" "ERROR"
        exit 1
    }
} elseif ($Stop) {
    $result = Stop-WindowsService
    if ($result) {
        Write-Log "Service stop completed successfully"
    } else {
        Write-Log "Service stop failed" "ERROR"
        exit 1
    }
} elseif ($Status) {
    Get-ServiceStatus
} elseif ($RunOnce) {
    $result = Invoke-AutoUpdate -Force
    if ($result) {
        Write-Log "Auto update completed successfully"
    } else {
        Write-Log "Auto update failed" "ERROR"
        exit 1
    }
} else {
    # Display help
    Write-Host "AILang Auto Update PowerShell Script"
    Write-Host "Usage:"
    Write-Host "  .\ailang_auto_update.ps1 [-Install] [-Uninstall] [-Start] [-Stop] [-Status] [-RunOnce] [-ServiceName <name>] [-PythonPath <path>] [-IntervalHours <hours>]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Install        Install as a Windows service using NSSM"
    Write-Host "  -Uninstall      Uninstall the Windows service"
    Write-Host "  -Start          Start the Windows service"
    Write-Host "  -Stop           Stop the Windows service"
    Write-Host "  -Status         Check the status of the Windows service"
    Write-Host "  -RunOnce        Run the auto-update script once"
    Write-Host "  -ServiceName    Name of the Windows service (default: AILangAutoUpdate)"
    Write-Host "  -PythonPath     Path to the Python executable (default: python)"
    Write-Host "  -IntervalHours  Check interval in hours (default: 24)"
}

Write-Log "AILang Auto Update PowerShell Script finished"
