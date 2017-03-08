REM Internet Explorer in kiosk mode
REM more info: https://support.microsoft.com/en-us/help/154780/how-to-use-kiosk-mode-in-microsoft-internet-explorer
SET URL="file:///%~dp0index.htm"
echo %URL%
start iexplore -k %URL%