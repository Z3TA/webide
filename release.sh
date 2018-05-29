#!/bin/bash

# Get the current version (generates version.inc)
node changeset.js
#commit=$(nodejs getCommitId.js)
commit=$(cat version.inc)
version=1
beta=_alpha
name=jzedit
echo $name-v$version$beta-$commit

echo "Delete old files if they exists"
rm -rf temp/release/

echo "Create the temporary directory if it doesn't exist"
mkdir -p temp/release/linux
mkdir -p temp/release/windows
mkdir -p temp/release/osx
mkdir -p temp/release/server

echo "Copy the files"
hg clone . temp/release/linux/

echo "Update version"
node update_version.js ./temp/release/linux/
# Note: Updates the version in the release files, not the source code (or we would have a commit/version update loop)

echo "Set devMode and toolbar to false"
sed -i -e 's/devMode: true/devMode: false/g' temp/release/linux/client/EDITOR.js
sed -i -e 's/"toolbar": true/"toolbar": false/g' temp/release/linux/package.json

echo "Clean up"
rm -rf temp/release/linux/.hg/
rm -rf temp/release/linux/webide_release.sh
rm -rf temp/release/linux/release.sh
rm -rf temp/release/linux/todo.md
rm -rf temp/release/linux/testfile.txt
rm -rf temp/release/linux/.hgignore
rm -rf temp/release/linux/webextension
rm -rf temp/release/linux/hosted_chrome_app
rm -rf temp/release/linux/chromeapp.txt
rm -rf temp/release/linux/getCommitId.js
rm -rf temp/release/linux/jz.xcf
rm -rf temp/release/linux/makebundle.js
rm -rf temp/release/linux/changeset.js
rm -rf temp/release/linux/update_version.js

echo "Copy over version.inc"
cp version.inc temp/release/linux/

# Update version (Use double quotes to make the shell expand variables while preserving whitespace)
sed -i -e "s/EDITOR.version = 0;/EDITOR.version = $commit;/g" temp/release/linux/client/EDITOR.js


# Generate bundle
cd temp/release/linux/
nodejs makebundle.js
gzip client/bundle.htm --best --keep
cd ../../../

# Minify .js files
# (npm install uglify-js -g)
# find temp/release/linux/ -name '*.js' | xargs uglifyjs


echo "Make a Windows release"
#cp -rf temp/release/linux/. temp/release/windows/

echo "Make a OSX release"
#cp -rf temp/release/linux/. temp/release/osx/

echo "Make a server release"
cp -rf temp/release/linux/. temp/release/server/

echo "Clean up the Linux release"
rm -rf temp/release/linux/runtime/nwjs-v0.12.3-win-x64/
rm -rf temp/release/linux/runtime/nwjs-v0.12.3-osx-x64/
rm -rf temp/release/linux/client/plugin/spellcheck/nodehun_windows.node
rm -rf temp/release/linux/start.bat
rm -rf temp/release/linux/create_shortcut.vbs
rm -rf temp/release/linux/osx_start.sh
rm -rf temp/release/linux/etc/
rm -rf temp/release/linux/adduser.js

echo "Clean up the Windows release"
rm -rf temp/release/windows/runtime/nwjs-v0.12.3-linux-x64
rm -rf temp/release/windows/runtime/nwjs-v0.12.3-osx-x64/
rm -rf temp/release/windows/client/plugin/spellcheck/nodehun_linux.node
rm -rf temp/release/windows/start.sh
rm -rf temp/release/windows/JZedit.desktop
rm -rf temp/release/windows/osx_start.sh
rm -rf temp/release/windows/etc/
rm -rf temp/release/windows/adduser.js

echo "Clean up the OSX release"
rm -rf temp/release/osx/runtime/nwjs-v0.12.3-win-x64
rm -rf temp/release/osx/runtime/nwjs-v0.12.3-linux-x64/
rm -rf temp/release/osx/plugin/client/spellcheck/nodehun_linux.node
rm -rf temp/release/osx/plugin/client/spellcheck/nodehun_windows.node
rm -rf temp/release/osx/start.sh
rm -rf temp/release/osx/JZedit.desktop
rm -rf temp/release/osx/start.bat
rm -rf temp/release/osx/create_shortcut.vbs
rm -rf temp/release/osx/etc/
rm -rf temp/release/osx/adduser.js

echo "Clean up the server release"
# CLient is meant to run in the browser
rm -rf temp/release/server/runtime/
rm -rf temp/release/server/plugin/client/spellcheck/nodehun_linux.node
rm -rf temp/release/server/plugin/client/spellcheck/nodehun_windows.node
rm -rf temp/release/server/start.sh
rm -rf temp/release/server/start.bat
rm -rf temp/release/server/create_shortcut.vbs
rm -rf temp/release/server/JZedit.desktop
rm -rf temp/release/server/osx_start.sh
rm -rf temp/release/server/start.js
rm -rf temp/release/server/bin
rm -rf temp/release/server/userdirs


#echo "zip and remove the Windows release (cant be run under Windows git bash)"
cd temp/release/
mv windows $name-v$version$beta-$commit-win-x64
#zip -9 -y -r -q $name-v$version$beta-$commit-win-x64.zip $name-v$version$beta-$commit
#cd ..
#cd ..
#rm -rf temp/release/$name-v$version$beta-$commit


#echo "Create a tarball and compress it for the Linux release"
#cd temp/release/
mv linux $name-v$version$beta-$commit-linux-x64
#tar -zcf $name-v$version$beta-$commit-linux-x64.tar.gz $name-v$version$beta-$commit
#cd ..
#cd ..
#rm -rf temp/release/$name-v$version$beta-$commit

#echo "Create a tarball and compress it for OSX"
#cd temp/release/
mv osx $name-v$version$beta-$commit-osx-x64
#tar -zcf $name-v$version$beta-$commit-osx-x64.tar.gz $name-v$version$beta-$commit
cd ..
cd ..
#rm -rf temp/release/$name-v$version$beta-$commit

echo "Create a tarball and compress server release"
cd temp/release/
mv server $name-v$version$beta-$commit-server
tar -zcf $name-v$version$beta-$commit-server.tar.gz $name-v$version$beta-$commit-server

# Move it back to just "server" so other batch scripts don't have to figure out the version
mv $name-v$version$beta-$commit-server server

cd ..
cd ..
#rm -rf temp/release/$name-v$version$beta-$commit-server

echo "Remove files no longer needed"
rm version.inc


# Move the files to www
scp temp/release/$name-v$version$beta-$commit-server.tar.gz zeta@192.168.0.1:/tank/www/webtigerteam.com/jzedit/download/


# Update the homepage

# Update the RSS.xml

echo "Done!"
