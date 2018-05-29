#!/bin/sh

echo -n "Have you done extensive manual testing and do All automatic tests pass (y/n)? "
read answer
if echo "$answer" | grep -iq "^n" ;then exit;fi


cd /home/Z/Projects/jzedit/

./release.sh

rsync -r --delete temp/release/server/ root@ben.100m.se:/srv/jzedit/
rsync -r --delete node_modules/ root@ben.100m.se:/srv/jzedit/node_modules/
rsync -r --delete client/noVNC/ root@ben.100m.se:/srv/jzedit/client/noVNC/

ssh root@ben.100m.se /bin/bash << EOF
cd /srv/jzedit/
nodejs update.js

EOF

# rsync -rv

