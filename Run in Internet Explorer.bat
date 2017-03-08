REM Internet Explorer in kiosk mode
SET URL="file:///%~dp0index.htm"
echo %URL%
start iexplore -k %URL%