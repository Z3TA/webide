js-editor / JZeditor
====================

This is a text/code editor that specialize in JavaScript, CSS and HTML.

See LICENCE.txt to know what you are allowed to do with it.


How to run
==========
Windows: Click on the shortcut: JZedit

Linux: You'll need to make JZedit.desktop and start.sh executable! (chmod +x JZedit.desktop start.sh)


About Fonts
===========
You'll want to use mono-space fonts only (because of the "grid").


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






Upgrading
=========

repo

