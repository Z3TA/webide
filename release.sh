# todo: update editor.js and set devMode: false, and package.json toolbar: false

# Get the current version
node changeset.js
commit=$(cat version.inc)
version=1
beta=_beta
name=jzedit
echo $name-v$version$beta-$commit


# Delete old files if they exists
rm -rf temp/release/linux/
rm -rf temp/release/windows/
rm -rf temp/release/osx/

# Create the temporary directory if it doesn't exist
mkdir -p temp/release/linux
mkdir -p temp/release/windows
mkdir -p temp/release/osx

# Copy the files
hg clone . temp/release/linux/

# Set devMode and toolbar to false
sed -i -e 's/devMode: true/devMode: false/g' temp/release/linux/editor.js
sed -i -e 's/"toolbar": true/"toolbar": false/g' temp/release/linux/package.json

# Clean up
rm -rf temp/release/linux/.hg/
rm -rf temp/release/linux/release.sh
rm -rf temp/release/linux/todo.md
rm -rf temp/release/linux/testfile.txt
rm -rf temp/release/linux/.hgignore


# Minify .js files
# (npm install uglify-js -g)
# find temp/release/linux/ -name '*.js' | xargs uglifyjs


# Copy over version.inc
cp version.inc temp/release/linux/


# Make a Windows release
cp -rf temp/release/linux/. temp/release/windows/

# Make a OSX release
cp -rf temp/release/linux/. temp/release/osx/


# Clean up the Linux release
rm -rf temp/release/linux/runtime/nwjs-v0.12.3-win-x64/
rm -rf temp/release/linux/runtime/nwjs-v0.12.3-osx-x64/
rm -rf temp/release/linux/plugin/spellcheck/nodehun_windows.node
rm -rf temp/release/linux/start.bat
rm -rf temp/release/linux/create_shortcut.vbs
rm -rf temp/release/linux/osx_start.sh

# Clean up the Windows release
rm -rf temp/release/windows/runtime/nwjs-v0.12.3-linux-x64
rm -rf temp/release/windows/runtime/nwjs-v0.12.3-osx-x64/
rm -rf temp/release/windows/plugin/spellcheck/nodehun_linux.node
rm -rf temp/release/windows/start.sh
rm -rf temp/release/windows/JZedit.desktop
rm -rf temp/release/windows/osx_start.sh

# Clean up the OSX release
rm -rf temp/release/osx/runtime/nwjs-v0.12.3-win-x64
rm -rf temp/release/osx/runtime/nwjs-v0.12.3-linux-x64/
rm -rf temp/release/osx/plugin/spellcheck/nodehun_linux.node
rm -rf temp/release/osx/plugin/spellcheck/nodehun_windows.node
rm -rf temp/release/osx/start.sh
rm -rf temp/release/osx/JZedit.desktop
rm -rf temp/release/osx/start.bat
rm -rf temp/release/osx/create_shortcut.vbs

# zip and remove the Windows release (can't be run under Windows git bash)
#zip -9 -y -r -q temp/release/$name-v$version$beta-$commit-win-x64.zip temp/release/windows
#rm -rf temp/release/windows/


# Create a tarball and compress it for the Linux release
tar -zcf temp/release/$name-v$version$beta-$commit-linux-x64.tar.gz temp/release/linux
rm -rf temp/release/linux/

# Create a tarball and compress it for OSX
tar -zcf temp/release/$name-v$version$beta-$commit-osx-x64.tar.gz temp/release/osx
rm -rf temp/release/osx/

# Remove files no longer needed
rm version.inc


# Move the files to www

# Update the homepage

# Update the RSS.xml


