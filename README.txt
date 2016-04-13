
js-editor / JZeditor
====================

This is a text/code editor that specialize in JavaScript, CSS and HTML.

See LICENCE.txt to know what you are allowed to do with it.

See contribute.txt on how to send your changes.
 


How to run
==========

Windows: Click on the shortcut: JZedit

"install": Copy the shortcut to desktop or start menu.


Linux:
------
Make JZedit.desktop and start.sh executable:

via terminal: chmod +x JZedit.desktop start.sh; ./start.sh

Via GUI: Right click, Properties, Permissions tab, Allow executing file as program. Then double click on the icon.

"install": Double click on JZedit.desktop, then: Right click on the icon on the Launcher (left side), select "Lock to Launcher"


Other platforms
---------------

Dependencies:
* nw.js - The chromium browser with nodejs libraries.
* nodehun - A nodejs module used for spell checking (only if you want spellchecking)

Download nw.js from the web: http://nwjs.io/ (v0.12.3)

To install nodehun you need nodejs and npm, get it from https://nodejs.org/
You also need build dependencies for C/C++

npm install nodehun --target=1.2.0

Start the editor using nw.js and the path-to-editor as first argument. See start.bat and start.sh

Remove unnecessary files from nw.js then place it in a new folder inside .runtime/ with your system ($SYS) as folder name.

Move nodehun.node and raname it to ./plugin/spellcheck/nodehun_$SYS.node

Submit the changes! (see contribute.txt)



Font settings and styling
=========================
The editor only works with mono-space font's (because of the "grid").

Use settings_overload.js to make changes to settings.js.

For the optimal text experience, try different system/OS font settings like hinting etc.

Some of the most popular open source programming fonts can be found in gfx/font 
(You need to install them to your system for them to work in the editor!)



Problems on Linux
-----------------

There's a bug in some versions of Chromium for Linux,
that makes the editor sometimes renders with subpixel-antailas/LCD-text and sometimes not ...
Unless you have set global.settings.sub_pixel_antialias = false (then it will always render without subpixel-antailas/LCD-text).


"LCD Text" / sub-pixel-antialas
--------------------------------
This is the default on most systems/OS. But some people might see "rainbows".
If you take a screen-shot and zoom in, you will notice the text edges has red, green or blue colors!
This works because each pixel on LCD monitors has a red, green and blue line!


Turn off "LCD Text" / sub-pixel-antialas
-----------------------------------------
Start the program with --disable-lcd-text. (See start.bat / start.sh)
And set "global.settings.sub_pixel_antialias = false" in settings_overload.js


What I think looks best (default settings)
------------------------------------------
Consolas 15px on Windows!
DejaVu Sans Mono 13px, or Liberation Mono 12px on Linux (Ubuntu).



Where can I get Consolas font?
------------------------------
Is only distributed in Windows and some windows applications. 

Type these commands in a terminal window:

sudo apt-get install cabextract
sudo apt-get install font-manager
mkdir temp
cd temp
wget http://download.microsoft.com/download/E/6/7/E675FFFC-2A6D-4AB0-B3EB-27C9F8C8F696/PowerPointViewer.exe
cabextract -L -F ppviewer.cab PowerPointViewer.exe
cabextract ppviewer.cab

font-manager

Font-manager is a GUI tool:
Click on the "cog wheels" icon (Manage Fonts) bottom left, to get a meny with "Install Fonts".
Select CONSOLA from the temp-folder you extracted the cab files in.




Upgrading
=========

Go to the repository to get the latest updates:
http://hg.webtigerteam.com/js-editor/









