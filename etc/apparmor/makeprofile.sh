#!/bin/bash

#
# Generates an apparmor profile for the main server (which runs as root)
#
# For appArmor to work we need to make a hard link of the nodejs executable
# note: You have to start the server using webide server/server.js !! (instead of node/nodejs)

if type webide >/dev/null
	then echo A webide executable already exist !

	read -p "Generate new Apparmor profile for webide ? (y/n) " -n 1 -r
	echo    # (optional) move to a new line
	if [[ ! $REPLY =~ ^[Yy]$ ]]
	then
	    exit
	fi

elif type nodejs >/dev/null
	then ln /usr/bin/nodejs /usr/bin/webide

elif type node >/dev/null
	then ln /usr/bin/node /usr/bin/webide
else 
	echo "We need Node.JS! Download it from www.nodejs.org, or # sudo apt-get install nodejs"
	exit
fi

# Create Apparmor profile

# The server should run while creating a profile!

aa-genprof /usr/bin/webide
if ! [ $? -eq 0 ]; then
  echo "You need to install apparmor-utils ..."
  echo apt-get update
  echo apt-get install apparmor-utils
  exit
fi

# Enforce
aa-enforce /usr/bin/webide
echo
echo "If the server crashes with EACCESS or similar error run:"
echo "sudo aa-complain /usr/bin/webide"
echo "restart the server, then"
echo "sudo aa-logprof"
echo
echo "If you have problems, edit the profile manually"
echo "It's located in /etc/apparmor.d/usr.bin.webide"
echo "sudo service apparmor reload to apply the changes"
echo
echo "See usr.bin.webide for example apparmor profile"
