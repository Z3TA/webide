
JZedit/webIDE
=============

This is a text/code editor/IDE that specialize in JavaScript, CSS and HTML.

See LICENCE.txt to know what you are allowed to do with it.

See contribute.txt on how to send your changes.


Install instructions
====================



Windows
-------

Download and install nodejs from https://nodejs.org/
It should come with a packet manager called npm.

Open a command prompt (Click on start menu => run, then type "cmd.exe")
Navigate to the folder this file is located in via the command prompt: cd path\to\jzedit
Then install the dependencies by typing "npm install" and hit enter in the command prompt.

After nodejs and all dependencies are installed, double click (run) start.bat

"install": Double click (run) create_shortcut.vbs, it will place a shortcut to start.bat on your desktop.

If you want the editor to auto "restart", add restart after target in the shortcut, like this: C:\Users\Z\dev-repositories\jzedit\start.bat restart

Linux:
------
Open a terminal ...
Navigate to the folder where you put jzedit: cd jzedit
Install nodejs: sudo apt install nodejs
Link nodejs to node: sudo ln -s `which nodejs` /usr/bin/node
Install npm (Node Package Manager): sudo apt install npm
Install "node_modules" packages: npm install


Make jzedit.desktop and start.sh executable:
Via terminal: chmod +x jzedit.desktop start.sh
Via GUI: Right click, Properties, Permissions tab, Allow executing file as program. Then double click on the icon.

"install": Double click on jzedit.desktop, then: Right click on the icon on the Launcher (left side), select "Lock to Launcher"

Or run it via ./start.sh


Mac OS X
--------
Download and install nodejs from https://nodejs.org/
It should come with a packet manager called npm.

Open a terminal: Function-key + Space, and type "terminal"
Navigate to the folder this file is located in via the terminal: cd path\to\jzedit
Then install the dependencies by typing "npm install" and hit enter in the terminal.
After nodejs and all dependencies are installed, type this in the terminal:
node server/server.js --port=8080 --user=admin --pw=admin -nochroot

Then navigate to this address in your favorite web browser: http://127.0.0.1:8080/




Reporting bugs
==============

Open a new file, and write down instructions on how to repeat the bug.
Save the file with "bugreport" in the file name (without the quotes)
Then hit Ctrl + Shift + S to post it. (There will be a confirmation box). 




Font settings and styling
=========================

The editor only works with mono-space font's (because of the "grid").

Make style changes in settings_overload.js instead of editor.js

For the optimal text experience, try different system/OS font settings like hinting etc.

Example: Turn off anti-alias in Windows: Control Panel > Performance Options Visual Effects. Uncheck "Smooth edges of screen fonts"

You can find 'DejaVu Sans Mono' and 'Liberation Mono' in gfx/font, which should look good both with and without anti-alias. 
(You might need to install them to your system for them to work in the editor!)



"LCD Text" / sub-pixel-antialas
--------------------------------
If you take a screen-shot and zoom in, you will notice the text edges has red, green or blue colors!
This creates an "anti-alias" effect because each pixel on LCD monitors has a red, green and blue line!

"LCD Text" is the default on most operating systems. But some people might see "rainbows".
It's also uneccesary with a high-res monitor.


Turn off "LCD Text" / sub-pixel-antialas
-----------------------------------------
Start the program with the argument --disable-lcd-text. (See start.bat / start.sh)
And set "global.settings.sub_pixel_antialias = false" in settings_overload.js

Or turn it off in your operating system! (It's already turned off if you have a Mac with "Retina" display)



Running as a cloud editor
=========================
You can use the editor as a native standalone editor. But it's also possible to use it as a cloud editor!

If you choose to open up the editor to others, it's advised to create a system account for each user.

Set user credentials in server/users.pw
Make sure server/users.pw is not readable (sudo chmod 770 server/users.pw && sudo chown root:root server/users.pw)

Adding users in Linux:
sudo addgroup --system jzedit_users
sudo adduser --system --ingroup jzedit_users nameofuser

To create an apparmor profile, see apparmor/makeprofile.sh

It's also possible to host the cloud editor on Windows, but then all users need to run as the same user.


Adding and removing users
-------------------------


# Error: Command failed: umount "target is busy"
ps -aux | grep nodejs
kill -s 2 810460 
sudo -u username kill 810460


Apparmor debugging
------------------
sudo service apparmor reload

# Add missing rules in profile:
sudo aa-genprof /usr/bin/nodejs_test123

# Sometimes aa-genprof doesn't find everyting
sudo aa-logprof

# See what's going on:
tail -f /var/log/kern.log

# example problem: profile transition not found

# is the profile active ?
sudo apparmor_status | grep nodejs

# does it exist ?
ls /etc/apparmor.d/ | grep nodejs

# is it disabled ?
ls /etc/apparmor.d/disable/


Installing more programs to the users folder (chroot)
-----------------------------------------------------
# Where is the program ?
which python
# Copy it to the user home dir


# What libs are used ?
ldd /usr/bin/python
# Copy them to user home dir

# Try to run it in chroot
chroot /home/demonisse/ /usr/bin/python -c 'print "hi"'

# Find all other dependencies and put them in the chroot (users home dir)
# See: https://unix.stackexchange.com/questions/18844/list-the-files-accessed-by-a-program
wget https://gitlab.com/ole.tange/tangetools/raw/master/tracefile/tracefile
sudo chmod +x tracefile
./tracefile python


# Create an apparmor profile



Compiling dependencies for old nw.js
------------------------------------
To build for the right modules version:
node-gyp rebuild --target=1.2.0 --msvs_version=2015


