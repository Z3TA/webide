#!/bin/bash

SERVER=$1

if [ -z "$SERVER" ]
  then
    echo "Please write user@server-ip as first parameter"
    exit 1
fi

# Exit if anything fails
set -e

# Make sure our machine and the server runs the same version of NodeJS and Linux distribution !? So that native npm packages doesn't break
# Or just recompile after copying !?


echo -n "Have you manually tested the happy path ? And does All automatic tests pass (y/n)? "
read answer
if echo "$answer" | grep -iq "^n" ;then exit;fi

# Make sure we are in the jzedit folder
if ! [[ "$(pwd)" =~ /jzedit$ ]]
  then
    echo "Run this script from the jzedit folder!"
    exit 1
fi

# Did you forget the username@SERVER !?
if ! ssh $SERVER stat /srv/jzedit/server/GUEST_COUNTER \> /dev/null 2\>\&1
  then
    echo "Manually login to the server and make sure /srv/jzedit/server/GUEST_COUNTER exist!"
    echo "Or create it if it's a fresh install: mkdir -p /srv/jzedit/server/ && echo 0 > /srv/jzedit/server/GUEST_COUNTER"
    exit 1
fi

 # Backup server/GUEST_COUNTER
ssh $SERVER 'cp /srv/jzedit/server/GUEST_COUNTER /tmp/'


if [[ "$@" =~ "-norelease" ]]
then
  echo "Using existing release in temp/release/server/"
else
   # Note: you can publish at the same time, using the -publish flag
   ./release.sh $@
fi


# sudo apt install rsync
rsync -r --delete temp/release/server/ $SERVER:/srv/jzedit/
rsync -r --delete client/noVNC/ $SERVER:/srv/jzedit/client/noVNC/


rsync -r --delete node_modules/ $SERVER:/srv/jzedit/node_modules/

REMOTE_NODE_VERSION=$(ssh $SERVER "node -v")
LOCAL_NODE_VERSION=$(node -v)
if [ "$REMOTE_NODE_VERSION" != "$LOCAL_NODE_VERSION" ]
then
  echo "Remote node.js version $REMOTE_NODE_VERSION is not the same as local $LOCAL_NODE_VERSION"
  ssh $SERVER "cd /srv/jzedit/ && npm rebuild"
fi


#ssh -t $SERVER /bin/bash << EOF
#cd /srv/jzedit/
#cp /tmp/GUEST_COUNTER server/GUEST_COUNTER
#sudo nodejs update.js -headless
#
#EOF

# Restore GUEST_COUNTER backup
ssh $SERVER "cd /srv/jzedit/ && cp /tmp/GUEST_COUNTER server/GUEST_COUNTER"


if [[ "$@" =~ "-noupdate" ]]
then
  echo "Not updating jzedit configuration!"
else
  ssh -t $SERVER "cd /srv/jzedit/ && sudo nodejs update.js -headless"
fi



# rsync -rv

echo "Now visit the site in incognito mode and make sure everything works!"

