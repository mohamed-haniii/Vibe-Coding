@echo off
chcp 65001 > nul
title إنشاء اختصار جهاز الاستقبال على سطح المكتب
color 0B
echo ================================================================
echo        إنشاء أيقونة واختصار لجهاز الاستقبال (الرسبشن / الكاشير)
echo ================================================================
echo.

set /p SERVER_IP="أدخل عنوان IP جهاز الدكتورة (مثال 192.168.1.105 أو اضغط Enter للعنوان الافتراضي localhost): "
if "%SERVER_IP%"=="" set SERVER_IP=localhost

set CLINIC_URL=http://%SERVER_IP%:3000

echo.
echo [+] جاري إنشاء اختصار سطح المكتب لرابط العيادة: %CLINIC_URL%
echo.

set SCRIPT_PATH="%TEMP%\CreateReceptionShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT_PATH%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\عيادة التخسيس - جهاز الاستقبال.lnk" >> %SCRIPT_PATH%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT_PATH%
echo oLink.TargetPath = "cmd.exe" >> %SCRIPT_PATH%
echo oLink.Arguments = "/c start " ^& "%CLINIC_URL%" >> %SCRIPT_PATH%
echo oLink.Description = "فتح نظام العيادة مباشرة لجهاز الاستقبال" >> %SCRIPT_PATH%
echo oLink.Save >> %SCRIPT_PATH%
cscript //nologo %SCRIPT_PATH%
del %SCRIPT_PATH%

echo ================================================================
echo [✓] تم بنجاح إنشاء أيقونة 'عيادة التخسيس - جهاز الاستقبال' على سطح المكتب!
echo [✓] يمكنك الآن النقر مرتين على الأيقونة لفتح العيادة بنقرة واحدة.
echo ================================================================
echo.
pause
