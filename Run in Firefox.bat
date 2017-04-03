REM "%programfiles(x86)%\Mozilla Firefox\firefox.exe" -chrome "index.htm"
start node server/server.js
start firefox -chrome "client/index.htm"