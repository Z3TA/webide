#!/bin/sh

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


cd /home/Z/Projects/jzedit/

./release.sh

# Backup server/GUEST_COUNTER
ssh $SERVER 'cp /srv/jzedit/server/GUEST_COUNTER /tmp/'

rsync -r --delete temp/release/server/ $SERVER:/srv/jzedit/
rsync -r --delete node_modules/ $SERVER:/srv/jzedit/node_modules/
rsync -r --delete client/noVNC/ $SERVER:/srv/jzedit/client/noVNC/

ssh $SERVER /bin/bash << EOF
cd /srv/jzedit/
cp /tmp/GUEST_COUNTER server/GUEST_COUNTER
nodejs update.js -headless

EOF

# rsync -rv

echo "Now visit the site in incognito mode and make sure everything works!"

