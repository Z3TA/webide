#!/bin/bash

# Update the path to the icon
mv jzedit.desktop jzedit.desktop-bak
sed -e "s,Icon=.*,Icon=$PWD/client/gfx/jz64.png,g" jzedit.desktop-bak > jzedit.desktop
rm jzedit.desktop-bak

# Make it runable again
chmod +x jzedit.desktop

# Start the server
cd server
if type nodejs >/dev/null
then  nodejs server.js &

elif type node >/dev/null
then  node server.js &

else echo "We need Node.JS! Download it from www.nodejs.org, or # sudo apt-get install nodejs"
fi
cd ..



# Start the editor
#runtime/nwjs-v0.12.3-linux-x64/nw . --remote-debugging-port=57341
runtime/nwjs-v0.12.3-linux-x64/nw . --disable-lcd-text --disable-gpu-vsync



# Kill the server
kill $!

