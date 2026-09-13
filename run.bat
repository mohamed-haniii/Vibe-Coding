@echo off
setlocal EnableDelayedExpansion
title Clinic Management System - Server
color 0A

cd /d "%~dp0"

:: Auto-detect and include standard Node.js installation paths
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\node\nodejs;%PATH%"
if exist "%AppData%\npm" set "PATH=%AppData%\npm;%PATH%"

:: Test if Node is available
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ===================================================================
    echo [!] Error: Node.js is not found on your system!
    echo ===================================================================
    echo.
    echo Please install Node.js from https://nodejs.org
    echo Then run this file again.
    echo.
    pause
    exit /b 1
)

:: Create Desktop Shortcut if not exists (using clean powershell execution)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$lnk = [System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Clinic System.lnk'); if (-not (Test-Path $lnk)) { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($lnk); $s.TargetPath = '%~dp0run.bat'; $s.WorkingDirectory = '%~dp0'; $s.Save() }" >nul 2>&1

:: Check dependencies
if not exist "node_modules\express" (
    echo ===================================================================
    echo [*] First time setup: Installing required libraries...
    echo ===================================================================
    call npm install --no-audit --no-fund
)

cls
echo ===================================================================
echo   Clinic Management System - Starting Local Server...
echo ===================================================================
echo.
echo [*] Initializing clinic database and services...
echo [*] Waiting for server to become fully ready on port 3000...
echo.

:: Launch background health check to open browser only when server is ready
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Job -ScriptBlock { for ($i=0; $i -lt 30; $i++) { Start-Sleep -Seconds 1; try { $res = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { Start-Process 'http://localhost:3000'; break; } } catch {} } }" >nul 2>&1

:: Run the server
call npm run dev

pause
