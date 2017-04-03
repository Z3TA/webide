REM Internet Explorer in kiosk mode
REM more info: https://support.microsoft.com/en-us/help/154780/how-to-use-kiosk-mode-in-microsoft-internet-explorer
SET URL="file:///%~dp0client\index.htm"
echo %URL%
start node server/server.js
start iexplore -k %URL%