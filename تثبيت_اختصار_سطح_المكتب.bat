@echo off
chcp 65001 > nul
title إنشاء اختصار برنامج العيادة على سطح المكتب
color 0A
echo ================================================================
echo        إنشاء أيقونة واختصار لبرنامج العيادة على سطح المكتب
echo ================================================================
echo.

set TARGET_DIR=%~dp0
set TARGET_DIR=%TARGET_DIR:~0,-1%

set SCRIPT_PATH="%TEMP%\CreateClinicDesktopShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT_PATH%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\برنامج عيادة التخسيس.lnk" >> %SCRIPT_PATH%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT_PATH%
echo oLink.TargetPath = "%TARGET_DIR%\تشغيل_البرنامج_نقرة_واحدة.bat" >> %SCRIPT_PATH%
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> %SCRIPT_PATH%
echo oLink.Description = "تشغيل برنامج عيادة التخسيس والتغذية بنقرة واحدة" >> %SCRIPT_PATH%
echo oLink.Save >> %SCRIPT_PATH%
cscript //nologo %SCRIPT_PATH%
del %SCRIPT_PATH%

echo.
echo ================================================================
echo [✓] تم إنشاء أيقونة 'برنامج عيادة التخسيس' بنجاح على سطح المكتب!
echo [✓] يمكنك الآن الضغط مرتين على الأيقونة من سطح المكتب لتشغيل البرنامج.
echo ================================================================
echo.
pause
