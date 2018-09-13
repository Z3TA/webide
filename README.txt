
JZedit is a text/code editor/IDE for JavaScript, CSS, HTML and Node.JS development.

Also see LICENCE.txt and contribute.txt.


webide.se
---------
webide.se is jzedit running as a cloud editor.
In this readme you will find instructions on how to run the editor locally on your computer, 
and how to host it on your own server.


Install instructions
====================

The editor can be download from here:
https://www.webtigerteam.com/jzedit/download/

If you only want the server/cloud version, download it from the link above.
The easiest way to install the desktop version is via npm:

`npm install -g jzedit`

Then type "npm start" to start the editor. Or (if you installed globally) "jzedit [path to file]"

Se instruction for making a desktop icon and manually installing below:

Linux:
------
1. Open a terminal ...

2. Install nodejs from nodesource:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Navigate to the folder where you put jzedit: `cd jzedit`

4. Install "node_modules" packages: `npm install`

5. Make jzedit.desktop and start.sh executable:
Via terminal: `chmod +x jzedit.desktop start.sh`
Via GUI: Right click, Properties, Permissions tab, Allow executing file as program. Then double click on the icon.

6. Add desktop shortcut (Unity/GNOME): Double click on jzedit.desktop to start the editor. 
Then right click on the JZedit icon on the Launcher (left side menu), and select "Lock to Launcher"

Or run the editor via `./linux_start.sh`


Windows
-------
(If you downloaded the .zip package: Right-click on the zip-file, and click "Properties". 
At the bottom, next to "Security: This file came from another computer" click "Unblock" and then "Apply"
otherwise you will get a "this file comes from another computer" warning every time you run the editor)

1. Download and install nodejs from https://nodejs.org/
(It should come with a packet manager called npm.)

2. Open a command prompt (Click on start menu => run, then type "cmd.exe")

3. Navigate to the folder this file is located in via the command prompt: cd path\to\jzedit

4. Install the dependencies by typing "npm install" and hit enter in the command prompt.

4.5. If the npm install fails you probably need to install build dependencies for Windows!
Easiest method is to open a command prompt (Click on start menu => run, then type "cmd.exe")
but right click on "cmd.exe" and select "Run as administrator". 
Then type: `npm install --global --production windows-build-tools`

After nodejs and all dependencies are installed, double click (run) start.bat

Add a desktop shortcut:
Double click (run) windows_create_desktop_shortcut.vbs



Mac OS X
--------
1. Download and install nodejs from https://nodejs.org/
(It should come with a packet manager called npm.)

2. Open a terminal: Function-key + Space, and type "terminal"

3. Navigate to the folder this file is located in via the terminal: cd path\to\jzedit

4. Install the dependencies by typing "npm install" and hit enter in the terminal.

5. After nodejs and all dependencies are installed, type this in the terminal:
`node server/server.js --port=8080 --user=admin --pw=admin -nochroot`

6. Navigate to the following address in your favorite web browser: http://127.0.0.1:8080/


Chromebook
----------

Go to the chrome web store and search for jzedit.
It's named "JavaScript & Node JS & HTML CSS editor / IDE" and has an pink/rainbow promo image.

That will use the hosted version on webide.se

We tried to make a pure Chrome app, but that turned out to be too much work.

If you root the device you might be able to install nodejs. Then
````
npm install -g jzedit
npm start
````



Android
--------

We recommend installing the editor on a server. See "Running as a cloud editor" below in this file.
And then you will get a "add to desktop" request.

You might be able to run both the server and client on the phone if you first install Node.JS




Reporting bugs
==============

Open a new file, and write down instructions on how to repeat the bug.
Save the file with "bugreport" in the file name (without the quotes)
Then hit Ctrl + Shift + S to post it. (There will be a confirmation box). 



Running the editor in Google Cloud Shell
========================================

1. Try this link: https://console.cloud.google.com/cloudshell/editor?shellonly=true
Or go to https://console.cloud.google.com/
Login with your Google account.

2. If the shell terminal didn't open by itself, click on the icon in the top right 
that looks like >_ and says "Activate Google Cloud Shell"
It will bring up a virtual pseudo-terminal at the bottom. Click on it to start typing ...
`curl https://www.webtigerteam.com/jzedit/download/`

3. Take notice of the latest server release for jzedit. Then type:
`wget https://www.webtigerteam.com/jzedit/download/jzedit-v1_alpha-3397-server.tar.gz`
(replace the number 3397 with the latest jzedit server relase!)
This will download the gzipped tar archive.

(tip: Pressing tab in the terminal will autocomplete file paths)

4. Then unpack the tarball:
`tar xf jzedit-v1_alpha-3397-server.tar.gz`

5. And go into it's folder:
`cd jzedit-v1_alpha-3397-server`

6. Install dependencies:
`npm install`

7. cd into the server directory:
`cd server`

8. Start the nodejs server
`node server.js --username=yourname --password=changeme --port=8080 --ip=127.0.0.1 -nochroot`

The server should now be listening to http port 8080 and ip 127.0.0.1

If this was a normal shell you should have made it listen on the public IP 
instead of 127.0.0.1 and open http://public-ip:8080/ in a browser.
But in Google Cloud shell we have to run it via a proxy ...

10. We want to "preview" the "app" ... (Click on any link in the Cloud API menu ...
Clicking on any link will make some new icons pop up to the right top side of the terminal.)
Click on the icon that looks like <> and say "Web preview". And select "Preview on port 8080"
This will open a new browser tab, that will hopefully load the editor!

Note that some things will be a bit slow as the Google proxy does not support websockets.


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
It's also uneccesary with a high-resolution monitor.


Turn off "LCD Text" / sub-pixel-antialas
-----------------------------------------
Set "EDITOR.settings.sub_pixel_antialias = false" in settings_overload.js

To turn off LCD text for the whole browser (and not just the editor's text area) you need to edit
linux_start.sh or start.js and add --disable-lcd-text to the browser arguments.

Or turn it off in your operating system! (It's already turned off if you have a Mac with "Retina" display)



Re-compiling dependencies for other version of Node.JS
=======================================================
`node-gyp rebuild --target=1.2.3`





Misc
=====

How to hide the annoying menu in Android that covers the virtual keyboard
-------------------------------------------------------------------------
Go into settings... Look for browser bar (General settings: Toolbar).. Select to turn it off. 








Running as a cloud editor
=========================
You can use the editor "natively" running on your desktop via nw.js or in the browser. 
But it's also possible to use the editor as a "cloud" editor, running on a server, and access it via a web browser.

It's recommended to use ZFS on the server, so each user can have their own file-system and be able to take snapshots etc.

Installing/upgrading Nodejs
---------------------------
Uninstall nodejs if it's already installed, then install it form nodesource.
See https://github.com/nodesource/distributions

`sudo apt remove nodejs && sudo apt remove npm`

Using Ubuntu:
````
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs
````
Note: nodesource will use /usr/bin/node, not /usr/bin/nodejs (which is used by Ubuntu) !


Installing certbot (letsencrypt)
--------------------------------
````
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install python-certbot-nginx 
````

Automatically set up the server for running jzedit as a cloud ide:
------------------------------------------------------------------
If you have a Linux (Ubuntu) server you can run this install script:
`node cloudide_install.js --domain=yourdomain.com`

The editor will be installed as a SystemD daemon.

Start the jzedit server: sudo systemctl start jzedit

Edit /etc/nginx/sites-available/yourdomain.com.nginx

To check for Nginx config problems:
`nginx -T`


Installing vnc dependencies
---------------------------
````
sudo apt update
sudo apt install xvfb x11vnc chromium-browser
````

Adding and removing users
-------------------------
Use the following script to add users to the cloud ide:
`./adduser.js name passw`

To remove a user:
`./removeuser name`

Error: Command failed: umount "target is busy"
````
ps -aux | grep nodejs
kill -s 2 810460 
sudo -u username kill 810460
````
You might have to reboot in order to unmount all directories.


Apparmor debugging
------------------
````
apt install apparmor-utils
sudo service apparmor reload
````
Add missing rules in profile:
`sudo aa-genprof /usr/bin/nodejs_test123`

Sometimes aa-genprof doesn't find everyting
`sudo aa-logprof`

See what's going on:
`tail -f /var/log/kern.log`

example problem: profile transition not found

is the profile active ?
`sudo apparmor_status | grep nodejs`

does it exist ?
`ls /etc/apparmor.d/ | grep nodejs`

is it disabled ?
`ls /etc/apparmor.d/disable/`

Temporary stopping apparmor
````
sudo service apparmor stop
sudo service apparmor teardown
````

Complain to allow everything but show logs
`sudo aa-complain /home/demo/usr/bin/hg`

Put a profile back into enforce
`sudo aa-enforce /home/demo/usr/bin/hg`



Installing more programs to the users folder (chroot)
-----------------------------------------------------
Where is the program ?
`which python`

Edit server.js and add the program and dependencies to be mounted when a user logs in


What libs are used ?
`ldd /usr/bin/python`
Make sure they are mounted in the user's home dir. See server/server.js function checkMounts

Try to run it in chroot
`chroot --userspec=ltest1:ltest1 /home/ltest1/ /usr/bin/python -c 'print "hi"'`

Find all other dependencies and mount or copy them into the chroot (users home dir)
See: https://unix.stackexchange.com/questions/18844/list-the-files-accessed-by-a-program
````
wget https://gitlab.com/ole.tange/tangetools/raw/master/tracefile/tracefile
sudo chmod +x tracefile
./tracefile python
````

Create an apparmor profile !


Debugging Error: spawn EACCES
-----------------------------

1. Figure out where the spawning error is by console.log spawn exe and arg at every spawn
2. Try running the command in a chroot, for example: sudo chroot /home/ltest4/ node -v
3. Try running the command as that user: sudo -u ltest4 node -v


Debugging Error: spawn ENOENT
-----------------------------

1. It's possible that the error is an Apparmor EACCESS in disguise. So try disabling apparmor
2. If the process starts, but tries to find a file and exits with an ENOENT. Try running in chroot.
The error might be related to the PATH env variable. So make sure PATH env exist var opt = {env: {PATH: "/bin/:/usr/bin"}}
3. It might be because of spawn's cwd option not being a directory or not found


Moving user to another server using ZFS
--------------------------------
Run this command from the server you want to move the user TO:
`ssh root@whereuserat 'zfs snapshot fromvol/home/nameofuser@backup && zfs send fromvol/home/nameofuser@backup' | sudo zfs receive tovol/home/nameofuser`

(The same method can be used to make backups, see backup.sh)

Enable the user on the new server by adding a new system account: 
`sudo useradd -r -s /bin/false nameofuser`


Take a snapshot before upgrading the server
-------------------------------------------
It's a good idea to take a system snapshot before making system updates, so that you can roll back in case something goes wrong.
````
sudo zfs list -t snapshot
sudo zfs snapshot ben/ROOT/ubuntu@upgrade
sudo apt update && sudo apt upgrade
````

cannot create snapshot 'ben/ROOT/ubuntu@upgrade': dataset already exists
````
sudo zfs destroy ben/ROOT/ubuntu@upgrade
sudo zfs snapshot ben/ROOT/ubuntu@upgrade
````

optional: To prevent running out of disk space, remove packages no longer needed
`sudo apt autoremove`

Always reboot after a system upgrade to check if the system boots with the new upgrades
You don't want the system to be stuck at boot during a unplanned reboot (for example automatic start after power failure)


Regularly run zpool scrub
-------------------------

You want to check the hard drives from time to time:
`sudo zpool scrub tank`

Also install smartctl to monitor hdd errors:
`sudo apt-get install smartmontools `

See disk info:
````
ls /dev/disk/by-id/
sudo smartctl -x /dev/disk/by-id/ata-TOSHIBA_DT01ACA300_Z7I4AR5AS
````

Problems cloning from Github
----------------------------
Make sure the server has hggit installed!
`python -c "import hggit"`
(should not give an error if it's installed)
How to install:
````
apt-get install python-pip
easy_install hg-git
````

Problems running apt 
--------------------
You might get an error like this:
unable to make backup link of './usr/bin/python2.7' before installing new version: Invalid cross-device link

This is because the program is mounted in user dir's. Stop jzedit and then reboot the server to release all mountpoints.





