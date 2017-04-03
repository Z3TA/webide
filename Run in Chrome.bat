REM Windows 7: \Users\[you]\AppData\Local\Google\Chrome\Application\chrome.exe
REM Windows 8: C:\Program Files\Google\Chrome\Application 
REM "%programfiles(x86)%\Google\Chrome\Application" --app="index.htm"
REM Not sure if this will work: (haven't tested)
REM "%userprofile%\AppData\Local\Google\Chrome\Application\chrome.exe" --app="index.htm"
start node server/server.js
start chrome --app="client/index.htm"
