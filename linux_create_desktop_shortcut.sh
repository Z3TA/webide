#!/bin/bash

#
#
# This will add a shortcut to the launcher
#
#

# Exit if anything fails
set -e

# Figure out desktop for debugging purposes
if [ "$XDG_CURRENT_DESKTOP" = "" ]
then
  desktop=$(echo "$XDG_DATA_DIRS" | sed 's/.*\(xfce\|kde\|gnome\).*/\1/')
else
  desktop=$XDG_CURRENT_DESKTOP
fi

desktop=${desktop,,}  # convert to lower case
echo "Desktop: $desktop"


# Create a launcher.desktop file
appname="jzedit.desktop"
destination=~/.local/share/applications/$appname
sed -e "s,Icon=.*,Icon=$PWD/client/gfx/jz64.png,g; s,Exec=.*,Exec=$PWD/linux_start.sh,g" linux_launcher.desktop > $destination


# Get the launcher favourites
apps=$(dconf read /org/gnome/shell/favorite-apps)

echo "Current favourites: $apps"


# Remove last ] from the JSON? array
newapps=${apps%?}
#echo "Trimmed: $newapps" 

# Add our app
newapps="$newapps, '$appname']"

echo "New favourites: $newapps"


# Add app to favourites
dconf write /org/gnome/shell/favorite-apps "$newapps"



