@echo off
title Clinic Management System - Server Launcher
color 0A

cd /d "%~dp0"

:: Auto-detect and include local Node.js and standard Windows installation paths
if exist "%~dp0node.exe" set "PATH=%~dp0;%PATH%"
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\node\nodejs;%PATH%"

echo ===================================================
echo   Clinic Management System - Local Server Launcher
echo ===================================================
echo.

node -v >nul 2>nul
if %errorlevel% neq 0 goto MISSING_NODE

call npm -v >nul 2>nul
if %errorlevel% neq 0 goto MISSING_NODE

if exist "node_modules\.bin\tsx.cmd" goto START_SERVER
if exist "node_modules\tsx" goto START_SERVER

echo [!] First time setup: Installing dependencies...
call npm install --no-audit --no-fund
if %errorlevel% equ 0 goto START_SERVER

echo [!] Retrying with force option...
call npm install --force --no-audit --no-fund
if %errorlevel% equ 0 goto START_SERVER

if exist "node_modules\tsx" goto START_SERVER

goto NPM_INSTALL_FAILED

:START_SERVER
echo [+] Launching Web Browser...
start http://localhost:3000

echo [+] Starting Local Clinic Server...
call npm run dev
if %errorlevel% neq 0 (
  call npx tsx server.ts
)
pause
exit /b 0

:NPM_INSTALL_FAILED
echo ===================================================
echo [X] ERROR: Permission denied during npm install (EPERM)
echo ===================================================
echo.
echo Windows rejected folder creation in %cd%.
echo.
echo Solutions:
echo 1. Right click run.bat and choose "Run as Administrator".
echo 2. Move project folder to C:\ or Desktop.
echo 3. Delete node_modules directory and re-run.
echo.
pause
exit /b 1

:MISSING_NODE
echo ===================================================
echo [X] ERROR: Node.js is NOT installed or NOT in PATH!
echo ===================================================
echo.
echo 1. Please download and install Node.js (Windows Installer .msi) from:
echo    https://nodejs.org
echo.
echo 2. Run the .msi installer and click Next until finished.
echo 3. After installation finishes, run this file (run.bat) again.
echo.
pause
exit /b 1

