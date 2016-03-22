SET NW_PATH=runtime\nwjs-v0.12.3-win-x64\nw.exe
SET EDITOR_PATH=.

REM Use REM to comment out

REM start %NW_PATH% %EDITOR_PATH% --disable-lcd-text
REM start %NW_PATH% %EDITOR_PATH%
start %NW_PATH% %EDITOR_PATH% --remote-debugging-port=57341
