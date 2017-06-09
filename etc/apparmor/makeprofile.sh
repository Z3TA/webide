#!/bin/bash

# For appArmor to work we need to make a hard link of the nodejs executable
# note: You have to start the server using jzedit server/server.js !! (instead of node/nodejs)

if type jzedit >/dev/null
	then echo A jzedit executable already exist !

	read -p "Generate new Apparmor profile for jzedit ? (y/n) " -n 1 -r
	echo    # (optional) move to a new line
	if [[ ! $REPLY =~ ^[Yy]$ ]]
	then
	    exit
	fi

elif type nodejs >/dev/null
	then ln /usr/bin/nodejs /usr/bin/jzedit

elif type node >/dev/null
	then ln /usr/bin/node /usr/bin/jzedit
else 
	echo "We need Node.JS! Download it from www.nodejs.org, or # sudo apt-get install nodejs"
	exit
fi

# Create Apparmor profile

# The server should run while creating a profile!

aa-genprof /usr/bin/jzedit
if ! [ $? -eq 0 ]; then
  echo "You need to install apparmor-utils ..."
  echo apt-get update
  echo apt-get install apparmor-utils
  exit
fi

# Enforce
aa-enforce /usr/bin/jzedit
echo
echo "If the server crashes with EACCESS or similar error run:"
echo "sudo aa-complain /usr/bin/jzedit"
echo "restart the server, then"
echo "sudo aa-logprof"
echo
echo "If you have problems, edit the profile manually"
echo "It's located in /etc/apparmor.d/usr.bin.jzedit"
echo "sudo service apparmor reload to apply the changes"
echo
echo "See usr.bin.jzedit for example apparmor profile"
