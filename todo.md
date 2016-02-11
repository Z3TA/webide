Prioritize: bug fixing, then some polishing and maybe some optimization.
Don't implement new stuff until we have a stable release!

Currently working on: gtg in hurry! xmatching!?

Fighting the hydra: Every time I try to fix one bug, I find five more major bugs! And all are super hard to fix!

Blog about sub-pixel-antialias (LCD Text).

BUGS
====

Sometimes when closing a file, the editor doesn't swtich to an existing one ...
And when the next file is closed, it tries to switch to an already closed file!

making { codeblocks ... no render

Function help hinting doesnt go away when typing.

Auto-complete inside a function-name seems to auto-complete itself!
function foo..

Auto-completion of variable names doesn't seem to work!?

The screen becomes black when typing (due to resize!?) asdasd  


fixIndentation.js:123 Uncaught TypeError: Cannot read property 'length' of undefined (when copy->pasting)

---
When having two tabs open and closing one of them:
file_tabs.js:339 Tab to C:\Users\Z\dev-repositories\js-editor\test\ansi.txt already in view!
Tab to C:\Users\Z\dev-repositories\js-editor\test\ansi.txt already in view!
devmode.js:50 Error: There is no file open with path=C:\shares\Z\documents\todo\todo.txt
    at switchToFile (file_tabs.js:344)
    at Object.closeFile_tabs [as fun] (file_tabs.js:322)
    at File.close (File.js:1840)
    at HTMLButtonElement.closeTab (file_tabs.js:543)
devmode.js:51 Uncaught Error: There is no file open with path=C:\shares\Z\documents\todo\todo.txt
12file_tabs.js:610 Attempted to save state for a file without path!
---



---
Weird indent after:
var firstLocation = {
x: global.settings.leftMargin + (col + buffer[row].indentation * global.settings.tabSpace) * global.settings.gridWidth,
y: global.settings.topMargin + row * global.settings.gridHeight
}// HAHA! I had forgot semicolon here!!

What to do about this in the future!?
---



mouse_select.js:213 Uncaught TypeError: Cannot read property 'index' of undefined

Dont auto insert '' when typing in a comment (just like when typing ' inside an "string") ex: Can't ship's chimp's


Save history when moving the cursor.?? Append the current cursor position to last saved state, when moving the cursor.


functionlist.js:163 Uncaught SyntaxError: Invalid regular expression: /'(/: Unterminated group


---
When copying code, also indent the first line, even if the selection started in the middle of it
and remove all indention before base. ex:
foo
bar
bar {
bar
}
bar
---

Abort the spell-checker if something is deleted or if the whole grid changes to ^

Page is black (no render) after opening from Ctrl+O clicking a path
Also go to the line we are searching for after opening!

Error: Tried to insert a tab character
at File.putCharacter (File.js:644)
at keyPressed (editor.js:1494)
(when Ctrl+shift+I)


Ctrl+Tab when a name of a function is selected, will insert () after the function-name.
(warn/error when a key-combo does many things!!!?)


Clicking 4 times to select with {} match doesn't work, stops at first }.


Tab framför </table> (ska inte vara det)




Polishing
=========

Switch file-tab positions

A "check" sign when toggling stuff (if its on or off) in the context menu (right click).

* Auto insert .. } if it makes sense to do so.

* Really need to warn if there is = inside an if() !!

* Some sort of block helper: when for example inserting in if-statement, the indentation get lost.
Show a ruler or something!? When there is not a matching count of {} in the document.
ex: {{<--
}

* When editing plain text it would be nice to be able to have spaces/tabs for indentation!
Example, when making a dot list. Or should the editor do that to!?

Set opening folder at startup to last opened folder.


Annoying flashing yellow when opening a file.

Context menu (right click) doesn't disappear when saving As
Auto complete file names when editing href or src 
Auto complete markdown lines ---- and ==== to fit (same length) as text above.
Add words like href, src, etc to the spell-checker ignore.

Don't insert double ' inside comments

Auto remove mathching } when removing an if statement.

Show big fat warning if = inside if( a = b) instead of ==, always a bug!
Also warn when  you use == outside an if!?

Indent inside if's
if(word.length > 0 && 
				htmlTags.indexOf(word) == -1 && 
				jsKeywords.indexOf(word) == -1 && 
				!isNumeric(word) &&
				fileExtensions.indexOf(word) == -1) {

Do not overwrite line-nr with chars-in-margin!


Spell-checking is laggy


				
Add words to the spellchecker, using context menu

Files dont have tabs ...

When devmode = false, error -> confirm("An error was descovered ... Do you want to report?")

Don't mark file as changed if it has the same state as the last saved state.

Make the highlight ({}) character red if there is no match.

Make the scrollbar on the function-list lighter so that it doesn't steal focus from the code

The tabs steal focus from the code ... make them lighter!? Or change the coding area!?

automatically scroll down to the function, when you type in the function list (when there are MAAAAAny funtions)

No color on high-light, just bold! paren + m�sving

Har to see what tab is opened. Make it yellow!

confirm button before "replace in files" and a report of how much got replaced!

Increase search input box when there is a long string

The tabs look funky, changes places when you switch tab, and are on multiple lines, when the window is too small.

Use a session file(s) instead of storing stuff in localstorage. Ex. JZedit/timemashine/filename.txt/date

auto-complete variable names!

fonts: Consolas,Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace,sans-serif

Better search in file. Like Nodepad++


Optimization
============



Wait some times before starting a parse. (dont have to parse while we're typing, most of the time). 

Do the grid boxes really have to know their character index!?

Test a huuuge .js file with many functions to see how the editor performs.

Typing is slow, espcecially in full screen.

Rendering is slow when there are many misspelled words.

Render only the row when typing along ...

Go to Power Options -> Create a power plan -> Change advanced power settings and set CPU Maximum Rate to 5% or how much you need.

Hide lag by rendering before doing work.

editor.renderPart(row, col, length); // Render part of the grid 

Can we get rid of the file.text and only use the grid!? Only convert the grid to text when saving. 




Unable to repeat bugs (happens rarely)
---------------------------------------
Sometimes get error about file not being open, when closing a bunch of files: file_tabs.js:618 

Editor sometimes fails to save!!! When? there's an error / something crash?

Sometimes when undoing (ctrl+Z) the caret is placed on a non existing grid column!

Black screen when opening file

Ctrl+X not working

Opening files with inconsistent line breaks.

Opening another file shewed the div's so that preview dropped down and canvas halved. When!???



Feature
-------


Drop files into the editor to open them.

Different themses during day/night (sun up/down). Black on white is best when the room is light, but if the room is dark, a black background also works!
Light bounce off light colors, that's why you can't have light text when it's light, or the text will seem blurry.
Light also makes the eye focus more. And contrast will atttract most focus.

Gameification, skinners box, highscore, get more points the more time you spend in the editor. Achemenets (for duing unusual stuff) and rewards (thropfies!?)

When caret is next to {, make everything orange down to matching }

When selecting several rows and hitting tab, make it a block by inserting { selection }


FTP/SSH module!!

Fullscreen mode.

Auto insert } outside of strings or regexp when typing {. And only if there is an un-match.
Auto insert matching } at the Right place! For example when encapsulating code in an if-statement.

Ctrl + D to declare a variable, add it to first var declaration above!?
Color undeclared (global) variables in an evil color.

When the cursor is on a } show a split screen with the matching {

A key to toggle scope-coloring.

Drag and drop files into the editor.

Bootstrap: nw.js project, web-page, etc. Create all the kakakaka

Check for .editorconfig and set default indent_size, etc: http://EditorConfig.org

Replace in function

Tool to create text bitmap, so that font looks the same in all OS's. Problem: Background colors! Might have to redo the text renderer!

test bitmap fonts to see if it's faster: Result: its 3 times faster without bitmaps.

Smooth scrolling. Make it easier to read text while scrolling.
