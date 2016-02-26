
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


Other platform
--------------

Dependencies:
nw.js - The chromium browser with nodejs module support.
nodehun - A nodejs module used for spell checking

The executable for nw.js can be found in the runtime folder

Download nw.js from the web: http://nwjs.io/

You can find the binaries for nodehun (zipped) in the install folder!

Start the editor using nw and the path-to-editor as first argument.

Ex: (linux): ./path-to-nwjs/nw path-to-js-editor/


Compiling nodehun (spell checker)
-------------------------------------
You will need:
nodejs - JavaScript runtime using V8 JavaScript engine
npm - The package manager for nodejs (included in nodejs package)

https://nodejs.org/

npm install nodehun --target=1.2.0

If you are on Windows, you might also need to add:
--msvs_version=2015




About Fonts
===========
You'll want to a mono-space font (because of the "grid").


On Linux
--------
For sub_pixel_antialias/lcx-text to work, font's need to be installed on system (not included in CSS).

There's however a bug in some versions of Chromium for Linux,
that makes the editor sometimes renders with subpixel-antailas/LCD-text and sometimes not ...
Unless you have set global.settings.sub_pixel_antialias = false, then it will always render without subpixel-antailas/LCD-text.


sub_pixel_antialias/lcd-text off
--------------------------------
Liberation Mono can be made to look very crisp with a bit of fiddling
(https://bugs.chromium.org/p/chromium/issues/detail?id=408079)

You might want to go into system settings and change font hinting etc.


What I think looks best
-----------------------
Consolas 15px on Windows!
DejaVu Sans Mono 13px on Linux (Ubuntu).
Liberation Mono 14px

These fonts can be found in the gfx/font folder, along with some other open source fonts that also looks OK.


https://fedorahosted.org/liberation-fonts/


Font rendering
--------------
Each person, screen and OS seems to have different opinions on what type of font to use and how it should be rendered ...

The most common method to make the text look "crisp" is anti-alias by increasing the RGB level for the edges,
often called sub-pixel-antialas or "LCD Text".
But if you have a modern screen with high pixel density, this might not be optimal. To turn off "LCD Text"
you have to start the program with --disable-lcd-text.

You can change the font and colors under style in settings.js




Consolas font
-------------
Consolas is a monospace font that comes with Windows and some Windows programs.
It's made to look good with sub-pixel-antialias (LCD Text).

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



Other fonts
-----------

While Consolas looks best with sub-pixel-anti-aliasing on.
These font's look good with without  sub-pixel-anti-aliasing:

* Courier New (Windows)
* Liberation Mono (get it from gx)



Upgrading
=========

repo

