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

# Create the temporary directory if it doesn't exist
mkdir temp
mkdir temp/release
mkdir temp/release/linux
mkdir temp/release/windows

# Copy the files
hg clone . temp/release/linux/

# Clean up
rm -rf temp/release/linux/.hg/
rm -rf temp/release/linux/release.sh
rm -rf temp/release/linux/todo.md
rm -rf temp/release/linux/testfile.txt
rm -rf temp/release/linux/.hgignore


# Minify .js files
# npm install uglify-js -g
find temp/release/linux/ -name '*.js' | xargs uglifyjs


# Copy over version.inc
cp version.inc temp/release/linux/


# Make a Windows release
cp -rf temp/release/linux/. temp/release/windows/


# Clean up the Linux release
rm -rf temp/release/linux/runtime/nwjs-v0.12.3-win-x64/
rm -rf temp/release/linux/plugin/spellcheck/nodehun_windows.node
rm -rf temp/release/linux/start.bat
rm -rf temp/release/linux/create_shortcut.vbs
rm -rf temp/release/linux/osx_start.sh

# Clean up the Windows release
rm -rf temp/release/windows/runtime/nwjs-v0.12.3-linux-x64
rm -rf temp/release/windows/plugin/spellcheck/nodehun_linux.node
rm -rf temp/release/windows/start.sh
rm -rf temp/release/windows/JZedit.desktop
rm -rf temp/release/linux/osx_start.sh

# zip and remove the Windows release (can't be run under Windows git bash)
zip -9 -y -r -q temp/release/$name-v$version$beta-$commit-win-x64.zip temp/release/windows
rm -rf temp/release/windows/


# Create a tarball and compress it for the Linux release
tar -zcf temp/release/$name-v$version$beta-$commit-linux-x64.tar.gz temp/release/linux
rm -rf temp/release/linux/

# Remove files no longer needed
rm version.inc


# Move the files to www

# Update the homepage

# Update the RSS.xml


