@echo off

REM Start the server if it's not already running
SET NODE=node

tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
  echo Server is probably already running
) else (
  echo Starting server ...
  cd server
  start %NODE% server.js --username=admin --password=admin
  cd ..
)



SET NW_PATH=runtime\nwjs-v0.12.3-win-x64\nw.exe
SET EDITOR_PATH=.

REM Try to get a higher score in typometer by disabling vsync ...
SET CHROMIUM_OPTIONS=--disable-gpu-vsync
REM It seems like switch --disable-gpu-vsync does not have any effect on node-webkit. 
REM Interesting enough, it does not exists in http://src.chromium.org/svn/trunk/src/content/public/common/content_switches.cc. 

REM Use REM to comment out

REM echo Argument1: %1

if "%1" == "restart" (
  echo Client will be restarted if it crashes
  REM When restart is the first argument, the editor will restart on errorlevel 1
  REM We do however have to leave the cmd window open ...
  :restart
  REM %NW_PATH% %EDITOR_PATH% --remote-debugging-port=57341
  REM Can not use start command if we want to catch errorlevel
  %NW_PATH% %EDITOR_PATH% %CHROMIUM_OPTIONS%
  echo exit with errorlevel=%errorlevel%
  if errorlevel == 1 (
    echo Restarting the editor ...
    goto:restart
  ) else (
    exit /b %errorlevel%
  )
) else (
  REM start will run the program and exit (hides the cmd window)
  REM start %NW_PATH% %EDITOR_PATH% --disable-lcd-text --remote-debugging-port=57341
  start %NW_PATH% %EDITOR_PATH% %CHROMIUM_OPTIONS%
)
