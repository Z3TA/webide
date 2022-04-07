#!/bin/bash

SERVER=$1

if [ -z "$SERVER" ]
  then
    echo "Please write user@server-ip as first parameter"
    exit 1
fi

# Exit if anything fails
set -e


# Make sure the folder containing the script is the working dir
cd $(dirname $0)

# Move to the webide directory
cd ..

# Check if something is not commmited
if hg status | grep -q '^M ';
  then
    hg status
    echo "You need to commit first!"
    exit 1
fi


# Make sure our machine and the server runs the same version of NodeJS and Linux distribution !? So that native npm packages doesn't break
# Or just recompile after copying !?


echo -n "Have you manually tested the happy path ? And does All automatic tests pass (y/n)? "
read answer
if echo "$answer" | grep -iq "^n" ;then exit;fi

# Make sure we are in the webide folder
if ! [[ "$(pwd)" =~ /webide$ ]]
  then
    echo "Run this script from the webide folder!"
    exit 1
fi

# Did you forget the username@SERVER !?
if ! ssh $SERVER stat /srv/webide/server/GUEST_COUNTER \> /dev/null 2\>\&1
  then
    echo "Manually login to the server and make sure /srv/webide/server/GUEST_COUNTER exist!"
    echo "Or create it if it's a fresh install: mkdir -p /srv/webide/server/ && echo 0 > /srv/webide/server/GUEST_COUNTER"
    exit 1
fi

 # Backup server/GUEST_COUNTER
ssh $SERVER 'cp /srv/webide/server/GUEST_COUNTER /tmp/'


if [[ "$@" =~ "-norelease" ]]
then
  echo "Using existing release in temp/release/server/"
else
   # Note: you can publish at the same time, using the -publish flag
   ./dev-scripts/release.sh $@
fi


# sudo apt install rsync

rsync -r --delete temp/release/server/ $SERVER:/srv/webide/

rsync -r --delete dropbox/ $SERVER:/srv/webide/dropbox/

# Only copy the noVNC folder if the remote OS has the same release! (different releases needs different versions of noVNC!)
REMOTE_OS_RELEASE=$(ssh $SERVER "lsb_release -a 2>/dev/null | grep Description")
LOCAL_OS_RELEASE=$(lsb_release -a 2>/dev/null | grep Description)
if [ "$REMOTE_OS_RELEASE" != "$LOCAL_OS_RELEASE" ]
then
  echo "Remote OS release $REMOTE_OS_RELEASE is not the same as local $LOCAL_OS_RELEASE"
else
  rsync -r --delete client/noVNC/ $SERVER:/srv/webide/client/noVNC/
fi

# Can't use some node modules on different versions of Node.js
REMOTE_NODE_VERSION=$(ssh $SERVER "node -v")
LOCAL_NODE_VERSION=$(node -v)
if [ "$REMOTE_NODE_VERSION" != "$LOCAL_NODE_VERSION" ]
then
  echo "Remote node.js version $REMOTE_NODE_VERSION is not the same as local $LOCAL_NODE_VERSION"
  # Note: node_modules folder is deleted due to rsync --delete option
  ssh $SERVER "cd /srv/webide/ && npm install && npm audit fix --force"
else
  rsync -r --delete node_modules/ $SERVER:/srv/webide/node_modules/
fi


#ssh -t $SERVER /bin/bash << EOF
#cd /srv/webide/
#cp /tmp/GUEST_COUNTER server/GUEST_COUNTER
#sudo node update.js -headless
#
#EOF

# Restore GUEST_COUNTER backup
ssh $SERVER "cd /srv/webide/ && cp /tmp/GUEST_COUNTER server/GUEST_COUNTER"


if [[ "$@" =~ "-noupdate" ]]
then
  echo "Not updating webide configuration!"
else
  ssh -t $SERVER "cd /srv/webide/ && sudo node update.js -headless"
fi



# rsync -rv

echo "Now visit the site in incognito mode and make sure everything works!"

