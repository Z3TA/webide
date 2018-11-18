#!/bin/bash

# Exit if anything fails
set -e

node semver.js
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

# Get the current version (generates version.inc)
node changeset.js
#commit=$(nodejs getCommitId.js)
commit=$(cat version.inc)
semver=$(cat SEMVER)
version=1
beta=_alpha
name=jzedit
echo $name-v$version$beta-$commit

echo "Delete old files if they exists"
rm -rf temp/release/

echo "Create the temporary directory if it doesn't exist"
mkdir -p temp/release/linux
mkdir -p temp/release/server
mkdir -p temp/release/npm

echo "Copy the files"
hg clone . temp/release/linux/

echo "Update version"
# Note: Update the version in the release files, not the source code (or we would have a commit/version update loop)
# (Use double quotes to make the shell expand variables while preserving whitespace)

sed -i -e "s/EDITOR.version = 0;/EDITOR.version = $commit;/g" temp/release/linux/client/EDITOR.js
sed -i -e "s/var EDITOR_VERSION = 0;/var EDITOR_VERSION = $commit;/g" temp/release/linux/server/server.js
sed -i -e "s/var LAST_RELEASE_TIME = 0;/var LAST_RELEASE_TIME = $(date +%s);/g" temp/release/linux/server/server.js


# The package.json want a semver version, not to be confused with latest commit id
sed -i -e "s/\"version\": \"1.0.0\"/\"version\": \"$semver\"/g" temp/release/linux/package.json

# The manifest.webapp version probably doesn't matter, but update it just in case, it seems it assume semver
sed -i -e "s/\"version\": \"1.0.0\"/\"version\": \"$semver\"/g" temp/release/linux/client/manifest.webapp

echo "Copy over version.inc"
# version.inc can for example be used by other programs to get the jzedit commmit id (version)
cp version.inc temp/release/linux/


echo "Set devMode and toolbar to false"
sed -i -e 's/devMode: true/devMode: false/g' temp/release/linux/client/EDITOR.js
sed -i -e 's/"toolbar": true/"toolbar": false/g' temp/release/linux/package.json


# Generate bundle
# Make sure the bundle is generater After any scripts has been modified
cd temp/release/linux/
nodejs makebundle.js
gzip client/bundle.htm --best --keep
cd ../../../


echo "Clean up"
rm -rf temp/release/linux/.hg/
rm -rf temp/release/linux/webextension/
rm -rf temp/release/linux/hosted_chrome_app/
rm -rf temp/release/linux/runtime/
rm -rf temp/release/linux/client/plugin/jswordwrap/

rm temp/release/linux/webide_release.sh
rm temp/release/linux/release.sh
rm temp/release/linux/todo.md
rm temp/release/linux/testfile.txt
rm temp/release/linux/.hgignore
rm temp/release/linux/getCommitId.js
rm temp/release/linux/jz.xcf
rm temp/release/linux/makebundle.js
rm temp/release/linux/changeset.js
rm temp/release/linux/semver.js
#rm temp/release/linux/SEMVER
rm temp/release/linux/client/gfx/icon/test.htm

echo "Removing unused fonts"
find temp/release/linux/client/gfx/font/ ! -name 'DejaVuSansMono.css' ! -name 'DejaVuSansMono.ttf' ! -name 'DejaVuSansMono-Bold.ttf' -type f -exec rm -f {} +
find temp/release/linux/client/gfx/font/ -type d -empty -delete



echo "Make a server release"
cp -rf temp/release/linux/. temp/release/server/

echo "Clean up the local-desktop release"
rm -rf temp/release/linux/etc/
rm -rf temp/release/linux/letsencrypt/
rm temp/release/linux/gcsf
rm temp/release/linux/adduser.js
rm temp/release/linux/cloudide_install.js
rm temp/release/linux/hashPw.js
rm temp/release/linux/nodejs_init.js
rm temp/release/linux/nodejs_init_worker.js
rm temp/release/linux/removeuser.js
rm temp/release/linux/signup_service.js
rm temp/release/linux/update.js
rm temp/release/linux/user_activity.js
rm temp/release/linux/client/bundle.htm
rm temp/release/linux/client/bundle.htm.gz
rm temp/release/linux/client/sitemap.txt
rm temp/release/linux/backup.sh

echo "Make a npm release (based on local-desktop)"
cp -rf temp/release/linux/. temp/release/npm/

echo "Clean up the server release"
# CLient is meant to run in the browser
rm -rf temp/release/server/bin/

rm temp/release/server/linux_start.sh
rm temp/release/server/start.bat
rm temp/release/server/windows_create_desktop_shortcut.vbs
rm temp/release/server/linux_launcher.desktop
rm temp/release/server/osx_start.sh
rm temp/release/server/start.js


#echo "Clean up the npm release"

# npm wants the readme to be a .md file
mv temp/release/npm/README.txt temp/release/npm/readme.md

# Make the package publishable by removing private: true in package.json
sed -i -e 's/"private": true,/"private": false,/g' temp/release/npm/package.json


cd temp/release/

#echo "Fix line breaks in Windows release"
#find windows/ | xargs unix2dos

#echo "Remove nodejs packages not needed in Windows release"
#sed -i '/nodemailer/d' windows/package.json
#sed -i '/posix/d' windows/package.json
#sed -i '/ps-node/d' windows/package.json
#sed -i '/iroh/d' windows/package.json
#sed -i '/pty.js/d' windows/package.json

echo "zip the local-desktop release"
mv linux $name-v$version$beta-$commit-local-desktop
zip -9 -y -r -q $name-v$version$beta-$commit-local-desktop.zip $name-v$version$beta-$commit-local-desktop
rm -rf $name-v$version$beta-$commit-local-desktop

echo "Create a tarball and compress server release"
mv server $name-v$version$beta-$commit-server
tar -zcf $name-v$version$beta-$commit-server.tar.gz $name-v$version$beta-$commit-server

# Move it back to just "server" so other batch scripts don't have to figure out the version
mv $name-v$version$beta-$commit-server server

cd ../../
#rm -rf temp/release/$name-v$version$beta-$commit-server

echo "Remove files no longer needed"
rm version.inc

# Move the files to www
scp temp/release/$name-v$version$beta-$commit-server.tar.gz zeta@192.168.0.1:/tank/www/webtigerteam.com/jzedit/download/
scp temp/release/$name-v$version$beta-$commit-local-desktop.zip zeta@192.168.0.1:/tank/www/webtigerteam.com/jzedit/download/

echo "Make NPM release"
cd temp/release/npm
npm publish

# Update the homepage

# Update the RSS.xml

echo "Done!"
