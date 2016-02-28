#!/bin/bash

# Update the path to the icon
mv JZedit.desktop JZedit.desktop-bak
sed -e "s,Icon=.*,Icon=$PWD/gfx/bean3.png,g" JZedit.desktop-bak > JZedit.desktop
rm JZedit.desktop-bak

# Make it runable again
chmod +x JZedit.desktop

# Start the editor
#runtime/nwjs-v0.12.3-linux-x64/nw .
runtime/nwjs-v0.12.3-linux-x64/nw . --disable-lcd-text