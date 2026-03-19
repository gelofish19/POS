@echo off
setlocal

set "APP_DIR=%~dp0"
set "SERVER=%APP_DIR%server.js"
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PORT=4173"
set "URL=http://localhost:%PORT%"

if not exist "%SERVER%" (
  echo POS server file not found: "%SERVER%"
  exit /b 1
)

if not exist "%NODE_EXE%" (
  echo Node.js not found at "%NODE_EXE%".
  echo Install Node.js from https://nodejs.org/ then run this launcher again.
  exit /b 1
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if not errorlevel 1 goto port_in_use

echo Starting POS server on %URL%
echo Keep this window open while using POS.
echo Press Ctrl + C to stop.
powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"
set "PORT=%PORT%"
"%NODE_EXE%" "%SERVER%"
exit /b %ERRORLEVEL%

:port_in_use
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing '%URL%/').StatusCode | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 goto busy_error
echo POS appears to already be running on %URL%.
start "" "%URL%"
exit /b 0

:busy_error
echo.
echo Cannot start POS: http://localhost:%PORT% is already in use.
echo Fix option 1 (recommended): close the app using that port.
echo   netstat -ano ^| findstr :%PORT%
echo   taskkill /PID ^<PID_FROM_NETSTAT^> /F
echo Fix option 2: run POS on another port.
echo   set PORT=4174 ^&^& node "%SERVER%"
echo.
pause
exit /b 1
