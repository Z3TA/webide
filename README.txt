
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



Running the editor in Google Cloud Shell
========================================
Go to https://console.cloud.google.com/
Login with your Google account

Click on the icon in the top right that looks like >_ and says "Activate Google Cloud Shell"
It will bring up a virtual pseudo-terminal at the bottom. Click on it to start typing ...
curl https://www.webtigerteam.com/jzedit/download/

Take notice of the latest server release for jzedit. Then type:
wget https://www.webtigerteam.com/jzedit/download/jzedit-v1_beta-2580-server.tar.gz
(replace the number 2580 with the latest jzedit server relase!)
This will download the gzipped tar archive.

(tip: Pressing tab in the terminal will autocomplete file paths)

Then unpack the tarball:
tar xf jzedit-v1_beta-2580-server.tar.gz

And go into it's folder:
cd jzedit-v1_beta-2580-server

Install dependencies:
npm install

cd into the server directory:
cd server

Start the nodejs server
node server.js --username=zetafiles --password=secretqwerty123 --port=8080 -nochroot

The server should now be listening to http port 8080 and ip 127.0.0.1
If this was a normal shell you should have used the public IP instead of 127.0.0.1
and open http://public-ip:8080/ in a browser. 
But in Google Cloud shell we have to run it via a proxy ...

We want to "preview" the "app" ... Click on any link in the Cloud API menu.
Clicking on a link will show some new icons to the right on top of the terminal.
Click on the icon that looks like <> and say "Web preview". And select "Preview on port 8080"
This will open a new browser tab, that will hopefully load the editor!

Note that some things will be a bit slow as the proxy does not support websockets.


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

Make sure nodejs is installed:
# apt install nodejs

If you have a Linux (Ubunt) server you can run this install script:
nodejs cloudide_install.js --domain=yourdomain.com

Edit /etc/nginx/sites-available/yourdomain.com.nginx


To check for Nginx config problems:
# nginx -T

Adding and removing users
-------------------------

# Error: Command failed: umount "target is busy"
ps -aux | grep nodejs
kill -s 2 810460 
sudo -u username kill 810460

You might have to: sudo systemctl disable jzedit_user_mounts && sudo reboot

Installing vnc dependencies
---------------------------
sudo apt update
sudo apt install xvfb x11vnc chromium-browser


Apparmor debugging
------------------
apt install apparmor-utils

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

# Temporary stopping apparmor
service apparmor stop
service apparmor teardown

# Complain to allow evrything but show logs
sudo aa-complain /home/demo/usr/bin/hg

# Put a profile back into enforce
sudo aa-enforce /home/demo/usr/bin/hg


Installing certbot (letsencrypt)
--------------------------------
$ sudo apt-get update
$ sudo apt-get install software-properties-common
$ sudo add-apt-repository ppa:certbot/certbot
$ sudo apt-get update
$ sudo apt-get install python-certbot-nginx 




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


# Cate an apparmor profile


Moving user from a server to another using zfs
----------------------------------------------
ssh root@whereuserat 'zfs snapshot fromvol/home/nameofuser@backup && zfs send fromvol/home/nameofuser@backup' | sudo zfs receive tovol/home/nameofuser

(The same method can be used to make backups)

# Enable the user on the new server: 
sudo useradd -r -s /bin/false nameofuser


Take a snapshot before upgrading the server
-------------------------------------------
It's a good idea to take a system snapshot before making system updates, so that you can roll back in case something goes wrong.

sudo zfs list -t snapshot
sudo zfs snapshot ben/ROOT/ubuntu@upgrade

# cannot create snapshot 'ben/ROOT/ubuntu@upgrade': dataset already exists
sudo zfs destroy ben/ROOT/ubuntu@upgrade
sudo zfs snapshot ben/ROOT/ubuntu@upgrade

sudo apt update && sudo apt upgrade

# optional: To prevent running out of disk space, remove packages no longer needed
sudo apt autoremove

# Always reboot after a system upgrade to check if the system boots with the new upgrades
# You don't want the system to be stuck att boot during a unplanned reboot (for example automatic start after power failure)


Compiling dependencies for old nw.js
====================================

for the right modules version:
node-gyp rebuild --target=1.2.0 --msvs_version=2015




Misc
=====

How to hide the annoying menu in Android that covers the virtual keyboard
-------------------------------------------------------------------------
Go into settings... Look for browser bar (General settings: Toolbar).. Select to turn it off. 




Problems cloning from Github
----------------------------
Make sure the server has hggit installed!
python -c "import hggit"
(should not give an error if it's installed)
How to install:
apt-get install python-pip
easy_install hg-git


Problems running apt 
--------------------
You might get an error like this:
unable to make backup link of './usr/bin/python2.7' before installing new version: Invalid cross-device link

 This is because the program is mounted in user dir's. Stop jzedit and then reboot the server to release all mountpoints.
E:



