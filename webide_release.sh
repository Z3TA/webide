#!/bin/sh

# Exit if anything fails
set -e

echo -n "Have you manually tested the happy path ? And does All automatic tests pass (y/n)? "
read answer
if echo "$answer" | grep -iq "^n" ;then exit;fi


cd /home/Z/Projects/jzedit/

./release.sh

# Backup server/GUEST_COUNTER
ssh root@ben.100m.se 'cp /srv/jzedit/server/GUEST_COUNTER /tmp/'

rsync -r --delete temp/release/server/ root@ben.100m.se:/srv/jzedit/
rsync -r --delete node_modules/ root@ben.100m.se:/srv/jzedit/node_modules/
rsync -r --delete client/noVNC/ root@ben.100m.se:/srv/jzedit/client/noVNC/

ssh root@ben.100m.se /bin/bash << EOF
cd /srv/jzedit/
cp /tmp/GUEST_COUNTER server/GUEST_COUNTER
nodejs update.js

EOF

# rsync -rv

echo "Now visit the site in incognito mode and make sure everything works!"

