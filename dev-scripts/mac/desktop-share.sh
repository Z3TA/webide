
sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart -configure -allowAccessFor -allUsers -privs -all

sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart -configure -clientopts -setvnclegacy -vnclegacy yes 

sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart -configure -clientopts -setvncpw -vncpw macpw

sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart -restart -agent -console

echo "To work with noVNC you need to manually go into system settings > sharing > Remote management, click Computer settings, and change/set the VNC password!"

echo "Latest noVNC version might be buggy. Confirmed to work with noVNC 0.6.1"


