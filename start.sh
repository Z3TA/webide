#!/bin/bash

# Update the path to the icon
mv jzedit.desktop jzedit.desktop-bak
sed -e "s,Icon=.*,Icon=$PWD/gfx/jz64.png,g" jzedit.desktop-bak > jzedit.desktop
rm jzedit.desktop-bak

# Make it runable again
chmod +x jzedit.desktop

# Start the editor
#runtime/nwjs-v0.12.3-linux-x64/nw . --remote-debugging-port=57341
runtime/nwjs-v0.12.3-linux-x64/nw . --disable-lcd-text --disable-gpu-vsync