@echo off

SET NW_PATH=runtime\nwjs-v0.12.3-win-x64\nw.exe
SET EDITOR_PATH=.

REM Use REM to comment out

echo Argument1: %1

if "%1" == "restart" (
  REM When restart is the first argument, the editor will restart on errorlevel 1
  :restart
  %NW_PATH% %EDITOR_PATH% --remote-debugging-port=57341
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
  REM start %NW_PATH% %EDITOR_PATH%
  start %NW_PATH% %EDITOR_PATH% --remote-debugging-port=57341
)
