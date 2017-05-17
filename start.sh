#!/bin/bash

#
# Start script for running the server locally
# 
# If you want a always up server maybe shared by several users,
# see README.txt, jzedit.service, and jzedit.apparmor
#

# Update the path to the icon
mv jzedit.desktop jzedit.desktop-bak
sed -e "s,Icon=.*,Icon=$PWD/client/gfx/jz64.png,g" jzedit.desktop-bak > jzedit.desktop
rm jzedit.desktop-bak

# Make it runable again
chmod +x jzedit.desktop


function startClient {
	echo Starting the client ...
	# Start the client (editor)
	#runtime/nwjs-v0.12.3-linux-x64/nw . --remote-debugging-port=57341
	runtime/nwjs-v0.12.3-linux-x64/nw . --disable-lcd-text > /dev/null 2>&1
}


# Check if the server is already running
if (ps aux | grep [n]odej*s*.*server\.js > /dev/null) then
	echo Looks like the server is already running!

	startClient

else


	echo Starting the server ...
	cd server
	serverArg="--loglevel=5 --username=admin --password=admin --port=8099"

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
	# Ignore stdout and send stderr to server.err
	$CMD &

	PID=$!
	# The pid is only correct if the server started successfully!
	# Don't use the pid to check if the server is running or not

	# Give the server a chance to exit if there's something wrong
	sleep 1

	# Make sure the server is running
	if ! (ps ax | grep "[n]${CMD:1}" > /dev/null) then
	    echo "Could not start the server!" >&2
	else
		echo Server started!

		cd ..


		startClient


		# Kill the server when client exit
		kill $!

	fi
fi

