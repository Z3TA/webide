
JZeditor
========

This is a text/code editor that specialize in JavaScript, CSS and HTML.

See LICENCE.txt to know what you are allowed to do with it.

See contribute.txt on how to send your changes.
 
Available for Linux, Windows (and soon Mac OS X)



Windows
-------
Double click (run) start.bat

"install": Double click (run) create_shortcut.vbs, it will place a shortcut to start.bat on your desktop.


Linux:
------
Make JZedit.desktop and start.sh executable:
Via terminal: chmod +x JZedit.desktop start.sh; ./start.sh
Via GUI: Right click, Properties, Permissions tab, Allow executing file as program. Then double click on the icon.

"install": Double click on JZedit.desktop, then: Right click on the icon on the Launcher (left side), select "Lock to Launcher"


Mac OS X
--------
Not yet officially supported (let me borrow your Mac and I'll fix it)

Make the osx_start.sh script executable:
Via terminal: chmod u+x my_shell_script.sh



Updates
=======

New stable releases will be notified on the web page, via e-mail (opt-in) and RSS.

Mercurial (hg) is used for version control. You should already have cloned from the repository:
hg clone http://hg.webtigerteam.com/JZedit

Before updating it's a good idea to note the current changeset:
hg log --limit 1

If something breaks, you can go back to the last working changeset:
hg up ###

A new release usually means new feature(s). Each release will be followed up with a few weeks of only bug fixes.
To update the editor, or get the latest bug fixes, type the following command in your command-prompt/terminal: 
hg pull && hg up stable

There's (currently) no maintenance on old releases after a new release.



Reporting bugs
==============

Open a new file, and write down instructions on how to repeat the bug. 
Then hit Ctrl + Shift + S to post it. (There will be a confirmation box). 




Font settings and styling
=========================

The editor only works with mono-space font's (because of the "grid").

Make style changes in settings_overload.js instead of editor.js

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



Where can I get Consolas font on Linux?
---------------------------------------
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
Click on the "cog wheels" icon (Manage Fonts) bottom left, to get a menu with "Install Fonts".
Select CONSOLA from the temp-folder you extracted the cab files in.











