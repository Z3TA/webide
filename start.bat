@echo off

SET NW_PATH=runtime\nwjs-v0.12.3-win-x64\nw.exe
SET EDITOR_PATH=.

REM Try to get a higher score in typometer by disabling vsync ...
SET CHROMIUM_OPTIONS=--disable-gpu-vsync
REM It seems like switch --disable-gpu-vsync does not have any effect on node-webkit. 
REM Interesting enough, it does not exists in http://src.chromium.org/svn/trunk/src/content/public/common/content_switches.cc. 

REM Use REM to comment out

echo Argument1: %1

if "%1" == "restart" (
  REM When restart is the first argument, the editor will restart on errorlevel 1
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
