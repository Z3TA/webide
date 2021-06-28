
WebIDE is a code editor/IDE for creating progressive web apps (PWA) and websites.

Web app: https://webide.se/

Try it locally: `npx webide.se`

<img src="https://www.webtigerteam.com/editor/webide_screenshot.png" />

Project homepage: https://webtigerteam.com/editor/

More guides/articles are available in the documentation/ 
folder (or https://webide.se/about/about.htm)



Quick start
===========
Assuming you already have node.js installed. Open cmd or terminal:

`npm install --global webide.se`

Then type `webide [path to file]` to edit any file.


### Staring server/client manually on localhost

```
cd node_modules/webide.se
npm run server
```
Then open the URL in your browser: http://127.0.0.1:8099/

or run `./start.js` to start the client in a webview (recommended) 

### If you are on a remote server:
```
node server/server.js --ip=192.168.122.50 --username=admin --password=admin
```
Replace username and password, and the IP with your public IP-address.

(If you want to allow many users to signup/login you need to setup the editor as a [cloud IDE](#cloudIDE).)


### Access behind NAT/firewall

If your computer/device is behind a firewall or NAT, start the server with the following flag(s):
```
node server/server.js -nat-type client -nat-code XXXXXXX
 ```
Your server/editor can then be accessed from https://webide.se/?nat_code=XXXXXXX



Installing as a Desktop editor (single user)
============================================

Download from here: (use latest version!)
https://www.webtigerteam.com/editor/download/

See instructions for your operating system below:

Linux:
------
1. Open a terminal ...

2. Install nodejs from nodesource:
```
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
```

3. Navigate to the folder where you put webide: `cd webide`

4. Install "node_modules" packages: `npm install`

5. Make linux_launcher.desktop and linux_start.sh executable:
Via terminal: `chmod +x linux_launcher.desktop linux_start.sh`
Via GUI: Right click, Properties, Permissions tab, Allow executing file as program. Then double click on the icon.

6. Add desktop shortcut (Unity/GNOME): 
Unity: Double click on linux_launcher.desktop to start the editor.
Then right click on the WebIDE icon on the Launcher (left side menu), and select "Lock to Launcher"

Gnome: Run ./linux_create_desktop_shortcut.sh

Or manually run the editor via `./linux_start.sh`


Windows
-------
(If you downloaded the .zip package: Right-click on the zip-file, and click "Properties". 
At the bottom, next to "Security: This file came from another computer" click "Unblock" and then "Apply"
otherwise you will get a "this file comes from another computer" warning every time you run the editor)

1. Download and install nodejs from https://nodejs.org/
(It should come with a packet manager called npm.)

2. Open a command prompt (Click on start menu => run, then type "cmd.exe")

3. Navigate to the folder this file is located in via the command prompt: cd path\to\webide

4. Install the dependencies by typing `npm install` and hit enter in the command prompt.

4.5. If the npm install fails you probably need to install build dependencies for Windows!
Easiest method is to open a command prompt (Click on start menu => run, then type "cmd.exe")
but right click on "cmd.exe" and select "Run as administrator". 
Then type: `npm install --global --production windows-build-tools`
(try again if it hangs)
After nodejs and all dependencies are installed, double click (run) start.bat

Add a desktop shortcut:
Double click (run) windows_create_desktop_shortcut.vbs





Mac OS X
--------
1. Download and install nodejs from https://nodejs.org/
(It should come with a packet manager called npm.)

2. Open a terminal: cmd + Space, and type `terminal`

3. Navigate to the folder this file is located in via the terminal: `cd path/to/webide`

4. Install the dependencies by typing `npm install` and hit enter in the terminal.

5. After nodejs and all dependencies are installed, type this in the terminal:
`node server/server.js --port=8099 --user=admin --pw=admin -nochroot`

6. Navigate to the following address in your favorite web browser: http://127.0.0.1:8099/


Chromebook
----------

Go to the chrome web store and search for node.js.
Then scroll down to apps. And click "More apps".
Then scroll down until you see "WebIDE - hosted by https://webide.se"

That will use the hosted version on webide.se

We tried to make a pure Chrome app, but that turned out to be too much work.

If you root the device you might be able to install nodejs and run `npm install -g webide`




Android
-------

We recommend installing the editor on a server. A small VPS will do.
Then open the app in a web browser (Chrome) and you will get a "add to desktop" request.

But if you however want to run the editor locally on your phone, you can do this:

1. Download and run the "Termux" app from the Play store.

2. Within the Termux app, type "apt update" (without the quotes) and press Enter

3. Then type "apt install nodejs" and press Enter

4. Type "Y" and press Enter to confirm you want to install nodejs ...

5. Type "npm install webide.se" (without the quotes) and press Enter

6. Type "cd node_modules/webide.se/server" (without the quotes) and press Enter

7. Type "node server.js --user=admin --pw=admin -nochroot" (without the quotes) and press Enter

8. Start Chrome and go to url: http://127.0.0.1:8099

9. You will probably get a dialog about adding WebIDE to your home screen.
It is recommended that you do so, as it will allow running the editor without browser bars.
(note: Add-to-home-screen might not work on some Android versions)

10. If you added WebIDE to your home screen you can now close Chrome and click on WebIDE on your home screen.

Note that while you can start the client and connect to another server, in order to run the server on your 
Android device you have to start Termux and repeat step 6-7 above every time, so you might want to automate it,
for example adding it to your .bashrc so that the server starts every time you start the Termux app.
And/or use Tasker or other app to make the both the server and the client start at the same time, in one click.


Run the editor on a computer/server that is behind a firewall NAT/router or does not have a public IP
-----------------------------------------------------------------------------------------------------
When starting the server from command line/prompt, specify a code/name in -nat-code argument/flag. Example:
```
node server/server.js -nat-code mysecret --username=myuser --password=123
```
Then you can access your computer/server via https://webide.se/?nat_code=mysecret




Able to type webide via "unix" terminal without installing via npm --global
----------------------------------------------------------------------------
In a unix like environment it's possible to open files and even pipe to bin/webide,
in order to send streams of text to the editor,
just add the bin folder to your PATH environment variable:
```
export PATH="$PATH:/path/to/node_modules/webide.se/bin"
```
Put it in ~/.bashrc to make the PATH update permanent.


Able to type webide in Windows command prompt without installing via npm --global
-----------------------------------------------------------------------------------
Add the webide/bin folder to the Path environment variable:
(Windows 10) Start > Settings > System > About > System info > Advanced system settings > Environment variables ...
Select: Path, then click Edit, then New, and write:
```
C:\path\to\where\you\installed\node_modules\webide.se\bin\
```
(tip: Use the file explorer to navigate to the webide\bin folder, then copy the path/address)
Click OK > OK > OK
You have to open a new Command Prompt for the change to take effect.



Permission issues when installing via npm using --global flag
-------------------------------------------------------------
When installing globally npm wants to put packages in places that might require root/administrator privileges.
To fix this on a unix-like system such as Linux you can create a special folder for npm to put global files in:
```
mkdir ~/.npm-packages

cat <<EOT >> .bashrc
# Install global NPM packages in home dir
NPM_PACKAGES="~/.npm-packages"
export PATH="$NPM_PACKAGES/bin:$PATH"
EOT

npm config set prefix=$HOME/.npm-packages
npm install --global webide.se
```


Missing npm build dependencies
------------------------------
All native module dependences are optional, but they are nice to have!
Typical sign of missing build dependencies is that you get a bunch of errors when installing via npm.
Installing the following packages should satisfy the build scripts:
node-gyp python2 make gcc g++

On Windows the following npm package will install the build dependencies: 
```
npm install --global --production windows-build-tools
```


NPM Error: Failed to replace env in config: ${APPDATA} on Windows
------------------------------------------------------------------
Edit file as Administrator: C:\Program Files\nodejs\node_modules\npm\npmrc
Replace "prefix=${APPDATA}\npm" with "prefix=C:\Program Files\nodejs\node_modules\npm"


Using Git repositories with Mercurial on Windows
------------------------------------------------
You need to install "hggit" which is a Python module for Mercurial.
It is however very tricky to get it to work ...

If you are brave:

1. Install Python, Mercurial and TortoiseHg if it's not already installed
2. Install hggit: (see https://hg-git.github.io/)
3. Generate SSH key and edit mercurial.ini



Running the editor in Google Cloud Shell
========================================

1. Try this link: https://console.cloud.google.com/cloudshell/editor?shellonly=true
Or go to https://console.cloud.google.com/
Login with your Google account.

2. If the shell terminal didn't open by itself, click on the icon in the top right 
that looks like >_ and says "Activate Google Cloud Shell"
It will bring up a virtual pseudo-terminal at the bottom. 

3. Type the following command in the virtual terminal:

`npx webide.se --username=admin --password=admin -nat-type client`

It will take some time to compile all dependencies, at the end of the output you will see a message:

This backend/server can be reached from public url: http://webide.se/?nat_code=XXXXXXXXX

Go to that URL and fill in the username and password specified in the npx command.


Running the editor in AWS CloudShell
====================================

1. Go to https://console.aws.amazon.com/cloudshell/home
And login with your AWS account.

2. After a while you will see a virtual terminal...

Follow step 3 (from Google Cloud Shell) above. 




How to update
=============

If you installed using npm: 
`npm update -g webide.se`

If you are using a hosted web app (PWA):
The service worker might have cached an old version of the editor client,
Go to Editor in the WebIDE top menu, and click "Unregister Service Worker". Then reload the page.

If it still looks weird, hit Ctrl+Shift+I in to start your browser's developer tools,
then find the Application tab, click on service worker, then force the service worker to (un)register/update.


Reporting bugs
==============

Open a new file, and write down instructions on how to repeat the bug.
Save the file with "bugreport" in the file name (without the quotes)
Then hit Ctrl + Shift + S to post it. (There will be a confirmation box). 


Editing files on remote computers
=================================
The editor opens TCP port 8080 (configured via remote-file-port) for receiving remote files.
You can install bin/webider on any remote computer, and then use webider as an editor replacement.
(webider will connect to a WebIDE server and the files will be opened in the local client,
there is no enctryption, so only use on LAN for now, eg. not over the Internet)

installing webider on a remote computer (it also need to have nodejs installed!):
```
wget https://www.webtigerteam.com/editor/download/webider
chmod +x webider
sudo mv webider /usr/local/bin
```

You might also have to configure the firewall to allow incoming connections to your developer machine.
And also allow the remote computer to connect to your developer machine.



Font settings and styling
=========================

The editor only works with mono-space font's (because of the "grid").

Make global changes in settings_overload.js
Each user can make their own customizations using Editor > Customization scripts

For the optimal text experience, try different system/OS font settings on your local machine, like hinting etc.

Example: Turn off anti-alias in Windows: Control Panel > Performance Options Visual Effects. Uncheck "Smooth edges of screen fonts"

You can find 'DejaVu Sans Mono' and 'Liberation Mono' in gfx/font, which should look good both with and without anti-alias. 
(You might have to install the fonts to your system to make them work in the editor!)



"LCD Text" / sub-pixel-antialas
--------------------------------
If you take a screen-shot and zoom in, you will notice the text edges has red, green or blue colors!
This creates an "anti-alias" effect because each pixel on LCD monitors has a red, green and blue line!

"LCD Text" is the default on most operating systems. But some people might see "rainbows".
"LCD Text" is unnecessary on a high-resolution monitor.


Turn off "LCD Text" / sub-pixel-antialas
-----------------------------------------
Set "EDITOR.settings.sub_pixel_antialias = false" in settings_overload.js or webide_js_overload.js

To turn off LCD text for the whole browser (and not just the editor's text area) you need to edit
linux_start.sh or start.js and add --disable-lcd-text to the browser arguments.

Or turn it off in your operating system! (It's already turned off if you have a Mac with "Retina" display)



Re-compiling dependencies for another version of Node.JS
========================================================
`node-gyp rebuild --target=1.2.3`




Installing many versions of Node.js
===================================
````
sudo npm install -g n
sudo chmod 700 /usr/lib/node_modules/n/bin/n
sudo n 10
sudo n 12
sudo n 13
sudo n 14
ls -la /usr/local/n/versions/node/
````

If the editor should be able to automatically switch Node.js version you need to create
`~/.local/bin/` and add it to the PATH variable (the cloudIDE automatically does this)


Misc
=====

How to hide the annoying menu in Android that covers the virtual keyboard
-------------------------------------------------------------------------
Go into settings... Look for browser bar (General settings: Toolbar).. Select to turn it off. 



Developing the editor using webide.se
=====================================
Self hosted development using the editor to edit itself...

Start the backend:
````
node server/server.js --port=/home/$(whoami)/sock/test --domain=test.$(whoami).webide.se --username=test --password=pleaseuseapassword --home=/$(whoami)/johan/
````
You might have to delete the socket (/home/$(whoami)/sock/test) before re-run. eg. when you get this error: Error: listen EADDRINUSE: address already in use

For running a test environment inside Docker - see indstructions in Dockerfile



<a id="cloudIDE"></a>
Running as a cloud editor
=========================
You can use the editor "natively" running on your desktop via nw.js or in the browser. 
But it's also possible to use the editor as a "cloud" editor, running on a server, and access it via a web browser.

It's recommended to use ZFS (file system) on the server,
so each user can have their own file-system and be able to take snapshots etc.



Running the cloud server on Windows
-----------------------------------
It is not recommended to run the cloud server on Windows due to lack of Apparmor, and no POSIX commands like chroot and setuid,
meaning that all users will have the same access rights as the user running the server (DO NOT run the server with a Admin account!)

For the cloud server to run on Windows, first install Node.JS build dependencies and Mercurial. And run npm install.
Then you manually have to activate each user by creating a .webide/password in their user directory, 
with the hash generated from node hashPw.js

To start the server:
````
node server/server.js -port 80 -nochroot -virtualroot -noguest -home C:\Users\
````
<!---
-port 80 will start the server on port 80
-nochroot will disable chroot which does not work on Windows
-virtualroot is like a virtual chroot, meaning users see C:\Users\username\foo\bar as just /foo/bar
-noguest will disable guest accounts, which is currently not support on Windows
-home C:\Users\ specifies where the user folders are located. (needed with -virtualroot)
-->

The following text assumes you are on a Unix/Linux like operating system ...


Updating userskeleton and etc/userdir_skeleton
----------------------------------------------
/home/userskeleton ZFS will be cloned for each new user.
Cloned filesystems will not take up HDD space!

1. Update files in etc/userdir_skeleton
or login as userskeleton and download/update stuff

2. Run `sudo ./dev-scripts/clean_userskeleton.js` which cleans up temporary files and cache, 
and also copies fresh files from etc/userdir_skeleton into /home/userskeleton

4. Create a new snapshot, and send it the the prod server
````
sudo zfs list -t snapshot
sudo zfs snapshot rpool/home/userskeleton@base2
````
Then send snapshot to prod server...
If the fs do not exist:
`sudo zfs send rpool/home/userskeleton@base2 | ssh root@webide.se zfs recv ben/home/userskeleton`
	
If the fs already exist: (send incremental data)
`sudo zfs send -i rpool/home/userskeleton@baseX rpool/home/userskeleton@baseY | ssh root@webide.se zfs recv ben/home/userskeleton`
	
(where snap X on the server is the last common snap and snap Y is the latest in dev)

The files might have been modified on the server...
On the server, delete any newer snapshots and/or rollback
````
zfs list -t snapshot | grep userskeleton
zfs destroy ben/home/userskeleton@backup
zfs rollback ben/home/userskeleton@baseX
````


Installing/upgrading Nodejs
---------------------------
Uninstall nodejs if it's already installed, then install it foromnodesource.
See https://github.com/nodesource/distributions

`sudo apt remove nodejs && sudo apt remove npm`

Using Ubuntu:
````
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
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

Automatically set up the server for running WebIDE as a cloud-IDE:
------------------------------------------------------------------
If you have a Linux (Ubuntu) server you can run this install script:
`node cloudide_install.js --domain=yourdomain.com`

The editor will be installed as a SystemD daemon.

Start the webide server: sudo systemctl start webide

Edit /etc/nginx/sites-available/yourdomain.com.nginx

To check for Nginx config problems:
`nginx -T`



Installing vnc dependencies
---------------------------
````
sudo apt update
sudo apt install xvfb x11vnc
````

Installing/upgrading Dropbox daemon
-----------------------------------
see: https://www.dropbox.com/install-linux
````
wget https://www.dropbox.com/download?plat=lnx.x86_64

````

Extract files to /srv/webide/dropbox/


Do something for each user in bash shell
----------------------------------------
cd /home/
for d in *; do chown $d:$d /home/$d/.webide; done


Adding and removing webide users
--------------------------------
Use the following script to add users to the cloud ide:
`./adduser.js username password`

To remove a user:
`./removeuser username`

Error: Command failed: umount "target is busy"
````
ps -aux | grep node
kill -s 2 810460 
sudo -u username kill 810460
````
You might have to reboot in order to unmount all directories.


mySQL setup
-----------

ref: https://dev.mysql.com/doc/mysql-secure-deployment-guide/5.7/en/secure-deployment-configure-authentication.html

Add these options under the [mysqld] option group in the MySQL configuration file (/etc/my.cnf): 

[mysqld]
plugin-load-add=auth_socket.so
auth_socket=FORCE_PLUS_PERMANENT

You might have to run the following query (logged in as root to the mysql console):
install plugin auth_socket SONAME 'auth_socket.so'; 

Then run:
service mysql restart

Login to mysql again to make sure auth_socket is activated:
SELECT PLUGIN_NAME, PLUGIN_STATUS FROM INFORMATION_SCHEMA.PLUGINS WHERE PLUGIN_NAME LIKE '%socket%';

Try creating a user:
CREATE USER somelocaluser@localhost IDENTIFIED WITH auth_socket;
DROP USER somelocaluser@localhost;

Make it so root can login without a password:
ALTER USER 'root'@'localhost' IDENTIFIED WITH auth_socket;

PS. You might then only be able to login to mySQL using the system root user and via the unix socket!
sudo -u root mysql --socket /var/run/mysqld/mysqld.sock


Delete iconv-lite in mysql2 Node.JS module
-------------------------------------------
iconv-lite lazy loads some files, which will not work once the editor have chrooted and changed user id,
so we need to use the editors patched version of iconv-lite.
Simply delete node_modules/mysql2/node_modules/iconv-lite
(you might have to do this every time you have run npm, awaiting a better fix)


Linux network namespaces
------------------------
When the user worker process is put in a network namespace
/etc/resolv.conf will be mounted from /etc/netns/username
But if you are running systemd-resolved it will eventually re-mount /etc/resolv.conf
So if you want to use different resolvers inside network namespace's you have to disable systemd-resolved
`sudo systemctl stop systemd-resolved`



Apparmor debugging
------------------
````
sudo apt install apparmor-utils
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

See systemd logs:
`sudo journalctl -x`

Try running the command inside/outside the chroot:
`sudo chroot --userspec=ltest1:ltest1 /home/ltest1/ bash`

Also see: http://manpages.ubuntu.com/manpages/bionic/man5/apparmor.d.5.html
          http://manpages.ubuntu.com/manpages/xenial/man5/apparmor.d.5.html

Job for apparmor.service failed because the control process exited with error code
& Reload failed for AppArmor initialization.
`service apparmor status` will show the error message and what line the parser error is on


When working with Linux namespaces, Apparmor will sometimes complain that some file doesn't have rw access,
even though it has been defined in the Apparmor profile, but if you look closely that path is missing the /
root slash. Adding flags=(attach_disconnected) to the profile fixes that problem, and the profile rule will work again.
example: %HOME%%USERNAME%/bin/bash flags=(attach_disconnected) {


Creating a Docker daemon base VM
--------------------------------


Create a zvol
`sudo zfs create -V 16G tank/docker`

Install libvirt...

libvirt* need to run as root, in order to make it possible for Docker containers to write in the user home dir
sudo nano /etc/libvirt/qemu.conf
````
user = "root"
group = "root"
dynamic_ownership = 0
````

Setup libvirt DHCP
Note that users netns is 10.0.X.Y so we will use 10.2.X.Y for the Docker VM's

sudo virsh net-edit default

<ip address='10.2.0.1' netmask='255.255.0.0'>
    <dhcp>
      <range start='10.2.121.2' end='10.2.125.254'/>
    </dhcp>
  </ip>

Create a VM
````
cd dockervm
sudo virsh define docker.xml
````

Check the IP of the VM
`sudo virsh net-dhcp-leases default`

Install Ubuntu OS on the VM...

Follow instructions to install Docker daemon: https://docs.docker.com/install/linux/docker-ce/ubuntu/

Enable TCP access to the docker Daemon (https://success.docker.com/article/how-do-i-enable-the-remote-api-for-dockerd)
`sudo mkdir -p /etc/systemd/system/docker.service.d/`
`sudo nano /etc/systemd/system/docker.service.d/startup_options.conf`

````
# /etc/systemd/system/docker.service.d/override.conf
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2376
````

````
sudo systemctl daemon-reload
sudo systemctl restart docker.service
````

Install SSH server and disable password login

Generate a ssh key on the host server
`ssh-keygen -f /root/.ssh/docker`

Copy generated public key
`sudo cat /root/.ssh/docker.pub`

Add public key to the VM (copy/paste)
`nano ~/.ssh/authorized_keys`

Logout and relogin (make sure you can't login with a password)
`sudo ssh -i /root/.ssh/dockervm docker@192.168.122.96`


Make sure the share is working
`sudo ls -la /sys/bus/virtio/drivers/9pnet_virtio/`
(should have a virtio link to a device)

note: Must shutdown -h in order to edit shares! (eg. reboot wont work)

Copy the dockervm/check_config_in_vm.sh script into the VM: 
nano check_config_in_vm.sh

Make it runable
sudo chmod + x check_config_in_vm.sh


Shutdown the VM
`sudo shutdown -h now`

Create a snapshot of the zvol (make sure the VM is shut down first!)
sudo zfs snapshot tank/docker@base

ZFS will reuse the the snapshot when cloning!
So if you need to change something in base, you would have to delete all docker zvol's!

sudo zfs destroy zpcdata/docker@base
sudo zfs snapshot zpcdata/docker@base


List snapshots
zfs list -t snapshot


If you have problems connecting, try 
sudo iptables -I FORWARD 1 -j ACCEPT
sudo iptables -I INPUT 1 -j ACCEPT
sudo iptables -I OUTPUT 1 -j ACCEPT

when you are done:
sudo iptables -D FORWARD 1
sudo iptables -D INPUT 1
sudo iptables -D OUTPUT 1

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
sudo apt install strace
./tracefile python
````

Outside the chroot (where it works):
./tracefile -deu node pty.js
Then also run it inside the chroot, and compare the output


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
The error might be related to the PATH env variable. So make sure PATH env exist `var opt = {env: {PATH: "/bin/:/usr/bin"}}`
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


Downgrade libvncserver on Ubuntu 18
-----------------------------------
In July 2020 Ubuntu 18 got a patch which broke protocol with all noVNC versions. 
(Ubuntu 20 has a different version of libvncserver - it however only works with older versions of noVNC.)

To remedy the situation you have to either downgrade libvncserver and ignore the security patch. Or upgrade to Ubuntu 20.
Here's how to downgrate libvncserver on Ubuntu 18 (you need to do this after avery apt upgrade!)


$ `dpkg -l | grep libvncserver`

ii  libvncserver1:amd64                           0.9.11+dfsg-1ubuntu1                             amd64        API to write one's own VNC server


$ `apt-cache madison libvncserver`

libvncserver | 0.9.11+dfsg-1ubuntu1 | http://ubuntu.mirror.su.se/ubuntu bionic/main Sources
libvncserver | 0.9.11+dfsg-1ubuntu1.2 | http://ubuntu.mirror.su.se/ubuntu bionic-security/main Sources
libvncserver | 0.9.11+dfsg-1ubuntu1.2 | http://ubuntu.mirror.su.se/ubuntu bionic-updates/main Sources

$ `sudo apt install libvncserver1=0.9.11+dfsg-1ubuntu1`

And then use version v1.1.0 of noVNC (or earlier).

Also if you have unattended upgrades enabled you have to disable them or it will be automatically "upgraded" to the non working version:
```
less /var/log/apt/history.log

dpkg-reconfigure unattended-upgrades

nano /etc/apt/apt.conf.d/20auto-upgrades
```





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
sudo apt-get install python-pip
sudo pip install hg-git
````

Make sure hg-git and dulwich is installed in /usr/local/lib/ and not /home
If hggit doesn't work in chroot, try:
````
sudo su
pip install dulwich
pip install hg-git

````
You might need to reboot the server to clear mounted libs


Problems running apt 
--------------------
You might get an error like this:
unable to make backup link of './usr/bin/python2.7' before installing new version: Invalid cross-device link

This is because the program is mounted in user dir's. Stop webide and then reboot the server to release all mountpoints.




Testing in Opera Mobile
========================

Download Opera Classic Mobile Emulator: https://www.opera.com/developer/mobile-emulator
Mac: brew cask install opera-mobile-emulator


Download Opera Browser version 12 (we need the debugger, aka. Opera Dragonfly)
https://get.geo.opera.com/pub/opera/linux/1216/


Goto any web page in Opera 12 - right click and select "Inspect Element". This will start the debugger

In the Opera 12 Debugger, top right corner there is an icon that looks like |))) it says "Remote Debug Configuration"
Click the "Remote Debug Configuration" icon, and then click on the Apply  button next to the port number.

Now start Opera Classic Mobile Emulator.
Enter opera:debug in the URL field.
Enter the IP for the machine Opera 12 is running on. Then enter the port nr (default 7001).
Click Connect.

Note: This also work on the Opera Mobile app

Once Opera Mobile is connected to the Debugger, you can control it from the debugger.

If you have not done it alredy, start the WebIDE server:
sudo node server/server.js -port 8080 -ip 192.168.0.1
(change IP to the machine's IP)

Click "Console" in the Opera 12 debugger
Type: 
document.location="http://192.168.0.1:8080/";
And click Enter.
This should make Opera Mobile to navigate to that page.
And you will see all console.log's etc in the debugger!

If the connection is lost you must restart Opera Mobile.


Debugging display/desktop issues
================================
sudo apt install x11-apps

Try running xeyes (app) from the terminal emulator, and see if you get anything on the display




Android support
===============

When installing android-studio, the android-studio folder needs to be in  ~/Android
(The Sdk folder also need to be in ~/Android)

setup wizard screen is blank when running android studio in vnc
---------------------------------------------------------------
Edit android-studio/bin/idea.properties and add
disable.android.first.run=true


NPM packages
=============

If you get a message like "Cannot find module" when running "npm start",
you could try resetting your globally installed npm-packages:

´rm -rf ~/.npm-packages/*´

