
JZedit
======

You need Node.JS to run the server: https://nodejs.org/

node server/server.js --port=8080 --user=admin --pw=admin

Then navigate to http://127.0.0.1:8080/ in your favorite browser. 

---

This is a text/code editor that specialize in JavaScript, CSS and HTML.

See LICENCE.txt to know what you are allowed to do with it.

See contribute.txt on how to send your changes.

Available for Linux, Windows (and soon Mac OS X)



Windows
-------
Double click (run) start.bat

"install": Double click (run) create_shortcut.vbs, it will place a shortcut to start.bat on your desktop.

If you want the editor to auto "restart", add restart after target in the shortcut, like this: C:\Users\Z\dev-repositories\jzedit\start.bat restart

Linux:
------
Make jzedit.desktop and start.sh executable:
Via terminal: chmod +x jzedit.desktop start.sh
Via GUI: Right click, Properties, Permissions tab, Allow executing file as program. Then double click on the icon.

"install": Double click on jzedit.desktop, then: Right click on the icon on the Launcher (left side), select "Lock to Launcher"

Or run it via ./start.sh


Mac OS X
--------
We do not yet have a developer licence for Mac OS X, meanwhile use the editor in Safari ...

node server/server.js --port=8080 --user=admin --pw=admin

Type this address in the browser: http://127.0.0.1:8080/




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

If you choose to open up the editor to others, i'ts adviced to create a system account for each user.

Set user credentials in server/users.pw
Make sure server/users.pw is not readable (sudo chmod 770 server/users.pw && sudo chown root:root server/users.pw)

Adding users in Linux:
sudo addgroup --system jzedit_users
sudo adduser --system --ingroup jzedit_users nameofuser

And Create an apparmor profile, see apparmor/makeprofile.sh







Compiling dependencies for old nw.js
------------------------------------
To build for the right modules version:
node-gyp rebuild --target=1.2.0 --msvs_version=2015


