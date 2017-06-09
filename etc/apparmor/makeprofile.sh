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

	exit
elif type nodejs >/dev/null
	then ln /usr/bin/nodejs /usr/bin/jzedit

elif type node >/dev/null
	then ln /usr/bin/node /usr/bin/jzedit
else 
	echo "We need Node.JS! Download it from www.nodejs.org, or # sudo apt-get install nodejs"
	exit
fi

# Create Apparmor profile
if [ aa-genprof /usr/bin/jzedit ]
then
  echo "profile created"
else
  echo "You need to install apparmor-utils ..."
  echo apt-get update
  echo apt-get install apparmor-utils
  exit
fi

# Enforce
aa-enforce /usr/bin/jzedit


# If the server crashes with EACCESS or similar error run:
# sudo aa-complain /usr/bin/jzedit
# restart the server, then
# sudo aa-logprof

# If you have problems, edit the profile manually
# It's located in /etc/apparmor.d/usr.bin.jzedit
# sudo service apparmor reload to apply the changes

# See usr.bin.jzedit for example apparmor profile
