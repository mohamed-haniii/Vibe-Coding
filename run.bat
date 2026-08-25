@echo off
chcp 65001 > nul
title تشغيل برنامج عيادة التخسيس والتغذية
color 0A

cd /d "%~dp0"

:: Check if desktop shortcut exists, if not create it silently once
if not exist "%USERPROFILE%\Desktop\برنامج عيادة التخسيس.lnk" (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'برنامج عيادة التخسيس.lnk')); $s.TargetPath = '%~dp0run.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,43'; $s.Save()" >nul 2>&1
)

:: Auto-detect and include local Node.js and standard Windows installation paths
if exist "%~dp0node.exe" set "PATH=%~dp0;%PATH%"
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\node\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\node\nodejs;%PATH%"

node -v >nul 2>nul
if %errorlevel% neq 0 goto MISSING_NODE

call npm -v >nul 2>nul
if %errorlevel% neq 0 goto MISSING_NODE

:: Check if node_modules already installed
if exist "node_modules\tsx" goto START_SERVER
if exist "node_modules\express" goto START_SERVER

cls
echo ===================================================================
echo     جاري تجهيز وتثبيت مكتبات البرنامج للمرة الأولى فقط (يرجى الانتظار...)
echo ===================================================================
echo.
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
  call npm install --force --no-audit --no-fund
)

:START_SERVER
cls
echo ===================================================================
echo       تم تشغيل برنامج عيادة التخسيس والتغذية بنجاح!
echo ===================================================================
echo.
echo [+] جاري فتح نافذة البرنامج تلقائياً...
echo.
echo [*] احتفظ بهذه النافذة مفتوحة طوال فترة عمل العيادة.
echo.

:: Open the browser directly
start http://localhost:3000

:: Start server silently and stably
call npm run dev
if %errorlevel% neq 0 (
  call npx tsx server.ts
)

pause
exit /b 0

:MISSING_NODE
cls
echo ===================================================================
echo [!] تنبيه: يحتاج البرنامج لتثبيت Node.js للعمل محلياً.
echo ===================================================================
echo.
echo 1. يرجى تحميل وتثبيت Node.js من الرابط التالي:
echo    https://nodejs.org
echo.
echo 2. بعد انتهاء التثبيت، افتح البرنامج مرة أخرى وسيعمل فوراً بنقرة واحدة.
echo.
pause
exit /b 1
