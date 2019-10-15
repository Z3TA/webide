#!/bin/bash

echo "linux_start.sh running in folder: $PWD"

#
# This script will run the editor locally.
# 
# If you want to run a shared "cloud" server see README.txt, webide.service, and webide.apparmor
#
# We are using this bash script (instead of start.js) to fix the desktop icon ....
#
# The linux_launcher.desktop will make the editor appear in the launcher
# Users can then right click on the icon and select "Lock to launcher"
# We must make sure it has the correct path
mv linux_launcher.desktop linux_launcher.desktop-bak
sed -e "s,Path=.*,Path=$HOME,g; s,Icon=.*,Icon=$PWD/client/gfx/jz64.png,g" linux_launcher.desktop-bak > linux_launcher.desktop
rm linux_launcher.desktop-bak

# Make it runable again
chmod +x linux_launcher.desktop


function startClient {
	echo Starting the client ...
	url="http://127.0.0.1:8099/index.htm"
	# Start the client (editor)
	#runtime/nwjs-v0.12.3-linux-x64/nw . --remote-debugging-port=57341
	#runtime/nwjs-v0.12.3-linux-x64/nw . --disable-lcd-text > /dev/null 2>&1
	#runtime/nwjs-v0.12.3-linux-x64/nw . --disable-lcd-text > /dev/null 2>&1 ||
	#chromium-browser --app=$url > /dev/null 2>&1 ||
	chromium-browser --app=$url ||
	chrome --app=$url > /dev/null 2>&1 ||
	unity-webapps-runner -i WebIDE -h http://127.0.0.1:8099/index.htm 2>&1 ||
	firefox -new-tab $url > /dev/null 2>&1 ||
	open "$url" 2>&1 ||
	echo "Failed to start the client!"
}



# Check if the server is already running
if (ps aux | grep [n]odej*s*.*server\.js > /dev/null) then
	echo Looks like the server is already running!

	startClient

else

	echo Starting the server ...
	cd server
	serverArg="--loglevel=7 --username=admin --password=admin --port=8099 --nochroot=true"

	# Check if we should use nodejs or just node
	if type nodejs >/dev/null
	then NODE=nodejs

	elif type node >/dev/null
	then NODE=node

	else 
		echo "We need Node.JS! Download it from www.nodejs.org, or # sudo apt-get install nodejs"
		exit
	fi

	CMD="$NODE server.js $serverArg"

	# Start server in background

	$CMD &> server.log &

	PID=$!
	# The pid is only correct if the server started successfully!
	# Don't use the pid to check if the server is running or not

	# Give the server a chance to exit if there's something wrong
	sleep 1

	# Make sure the server is running
	if ! (ps ax | grep "[n]${CMD:1}" > /dev/null) then
		echo "Could not start the server!" >&2
		echo "[n]${CMD:1}"
		ps ax | grep "[n]${CMD:1}"
	else
		echo Server started!

		cd ..


		startClient

  		# Problem: Firefox browser will "exit" even though it started
  		read -n 1 -s -r -p "Press any key to stop the server"

		# Kill the server when client exit
		kill $!

	fi
fi

