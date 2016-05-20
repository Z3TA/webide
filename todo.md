Feature freeze!

Prio: 

1) Bug/issue fixing and refactoring
2) Polishing
3) Optimization (toggle devMode off when testing!)

Try do debug without console.log!
Always use F5 to reload! Or exit functions might not fire!
Write tests (first)!
Use hg mv to move/rename files!
note: The error should be the first argument in callbacks!
note: Have to close the app and reopen it to reload NodeJS module source!
note: Spent 3 hours debugging after a "throw" caused code in a NodeJS module to abort, and leaving it in a bad state. 
Editor should always be restart after a "throw" is detected!

What I'm working on:

Fixing parsing errors in vbScript.


BUGS
====

When selecting this using keyboard, then copy/past it gets scrabled:
<%
str = "<table>"
%>


Getting a tag ending when autocompletion something that is no available: ex:
proc</editor.tests.length;> in editor.js

Don't get auto completion for function arguments!

Indentation in the source files is fubar


when selecing 0 in "editor.keyBindings.push({charCode: 33, combo: 0, fun: pageUp});" using shift + keyboard arrows
Error when running key bound function:Error: Selected box i=0 is not selected! box[0]={"char":"3","index":76,"selected":false,"highlighted":false,"hasCharacter":true,"wave":false,"circle":false,"color":"rgb(0,0,0)","quote":false,"comment":false}
at File.checkSelection (File.js:963)
at File.select (File.js:1040)
at Object.moveRight [as fun] (keyboard_arrows.js:116)
at keyIsDown (editor.js:2948)

End doesn't go to EOF/EOL

Indent breaks in string concatenation!
foo = "bar" +
baz;

Adding a } should fix indentation of all lines below!


bug: tab plugin: Files get placed in the same "folder" if their parent dir is the same as another parent dir even though the rest of the path is different.

Lots of errors (absolute paths when dragging the folder to nw.exe):
Uncaught Error: ENOENT: no such file or directory, open 'C:\Users\Z\dev-repositories\js-editor\runtime\nwjs-v0.12.3-win-x64\version.inc'
Uncaught Error: spell-check worker exit:0


Uncaught Error: getaddrinfo ENOENT localhost:57341

bug: Find in file will not work if the search term is split between chunks

bug: When selecting text using shift + mouse click, then clicking again, it sometimes removes the most right character. test ex:
before fixing it.


vb_parser: Lots of indention errors (double END IF ??) ex: castSpell.asp



Doesn't find bug when the = is together in other if(data.type="temperaturehumidity") {


red circle:
setInterval( functionCheckStatus() {
var dif = t1.getTime() - t2.getTime();
}, 60000);

Got a bug after opening a file with the exact same content and path as a file already opened.

When creating the first JS function in a file. And copying in the function name, will result in a a very thin function-list.

When last file gets closed, the toolbar still show it's path

When auto completing JSON objects, ex: editor.settings.style.textColor, editor.settings.style. part gets removed.

Opening a tag (<) before a tag that adds indentation de-indentate and mess up the indentation

Gets scrolling bug alert when: scrolled to the right, then tabbing to a file that doesn't have that many colums

auto completion of xml tags can be super annoying (buggy) ex:
else if(insX</!--
				*/


Doesn't add indent characters for last curly bracket!
{
{
{
}
}
}

No undo available after save!

Auto complete doesn't find variable declarations inside for loops, ex: for(var charIndex=0; charIndex<text.length; charIndex++) {

Double clicking on a file path should open the file!

When searching the function list and (only find one match) click on it, doesn't scroll to the function

Files doesn't load in the same order when reopening/reloading the editor! Sort tabs after every new tab being opened!

Auto-completion in class-like object replace the text: ex: file.lineBreak; file.lineB, tab

After: editor.tests.push({text: "All keyBindings should return true or false",fun: function testKeyBindings(callback) {
// Next { will indent two times

Didn't get file input focus when opening a file... 

Saving takes a long time sometimes. because of network drive, can take several seconds! (i get nervious, how to confort?)

function list gets biiiig:
window.requestAnimFrame = (function(callback) {
return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
function(callback) {
window.setTimeout(callback, 1000 / fps);
};
})();



JS inside <script> tags doesn't get parsed!? Colorized.

Only fixIndentation on {} if there is a match!

Opening files with weird formatting: files inside .hg for example, try binary files!

Auto complete removes text: (editor.currentFile) editor.curr => currentFile
Maybe have to fix auto complete ...

Clicking 4 times to select with {} match doesn't work, stops at first }.

Moving a tab doesn't "stay" after reload.

Source indentation in html documents might be "off" if you remove or add div's.

The caret is off in the magnification glass

README.txt is opened with folder in tabs: JZEdit/README.txt

Goto file doesn't work if you type too fast!

JS parser seems to have problems finding variable type with single quoted strings.

Polishing
=========

file search btw chunks + replace in files

A plus in the tabs to create/open a new file

When auto completing a new function() {} check if it's a lambda or function, to set the caret in the right position.

The undo/redo function needs to be rewritten!

Show loading/streaming animation when opening a big file. And show the file after the first chunk!
(don't wait for the full file to load).

Having to delete the line braks when removing large text chunks (spanning many rows) is annoying!

Detect misspelled properties!!!

The quote auto inserted is annoying when quoting from right to left "<-second "<-first

Annoying: When clicking Ctrl+O to open a file and it takes long time for the open the file explorer. Then hits Ctrl+O again several times in frustration.
Then have to wait until all of them have loaded.


Warn if a new line starts with (, [, /, +, ++, or --. 
(And if there is a line break after return, break or continue.)


Allow white space at start of line in block comments

Ignore $ in variables for the spellchecker

Pasing while searching should replace 

Try different (JSON) js files in the wild and see how it handles the indentation.

Auto scroll the function list when searching in it so we see matches.

Better undo/redo!!

Update with confirm if a file have been changed by another program.

Making a multi line string was very annoying due to auto inserts of double '' and ' + + '

Ctrl + click on a file path to open it. (no double click!!)

Regex support in find/replace!

Detect misspelled/unknown object properties!

Ctrl+Shift+Tab = Goto last function we where in

List of all keyBindings and a disciption of what each do

Blink or something, green flashing on the file tabs!? To indicate the file has been successfully saved.

Plain text mode, where you can see spaces in front of text (inlining)

Loading icon while the file is streaming!?

Regex (or *) search in Goto file.


Refactor spellchecker: Apply wave via preRender function. Check against spellcheck cache.
Remove all text marked as miss-spelled when toggling the spellchecker off.


A better search in file.
Editor crashes whean searching for "try to" or ">0;" in files.





Indentation for good looking multidimensional arrays:
var arr = [
[1, "foo"],
[2, "bar"],
[3, "baz"]
];

Classic ASP, bash indention, and function list!

Function args wont come up in autocomplete.

Auto-complete inside a function-name seems to auto-complete itself!
function foo..

Autocomplete function arguments inside the function!

Auto-complete from all opened files (global variables)!

Send back the domObject when calling editor.menu so you can change the text!
Check "Enable spellchecker" if its not running and "Disable spellchecker" if it's running.

Show comment markdown headers in the function list

See repo: remove files not needed.

It's hard to see if a file is saved or not!
A better confirmation/indication that the file has been saved.
Better looking file

Auto load/connect to the debugger so that we can more easely find editor errors. Self debugging.

goto_file.js: Seach in subfolder option, ignore dot filder and folders option. Better coloring.

A key command for closing a file.

A list of all key-bdings available, F1!?

Also show the indention helper if we pasted in something and the last char was a {

xmatch: do not count { inside strings.

Write letter starting in center!? 
Bigger chars in xmatching.

Colors when parsing next text next to a html tag, it turns blue </>

Moving file tabs, change position.

When the state (file.text == last saved state) mark the tab as saved.

Allow context menu everywhere, or at least on the file tabs too.

Reopen last closed file tab.

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

prettify the zoom heading labels. (show line number)
inspiration: http://www.dreamstime.com/royalty-free-stock-images-colorful-banner-design-image28200429

Switch app icon to a ship container, because the editor helps you ship stuff ... 



Saving a big file:
readstream -> writestream to a temp file, up until the chunk loaded in the editor. Then continue with the original. When finished replace the original with the temp file.


When searching in a file marked as big, do a whole file search from disk.






Optimization
============

Typing in editor.js is really slow because of the JS parser. Only parse if special characters are entered!? Optimize the parser function.



Optimize file.insertText, when inserting at EOF. sugg: file.addToGrid(text)


Note about trying to render before doing something:
- It will not be visible on the screen until the main thread is idle.

Note about optimizing for faster screen updates: 
- VSync is usually 60 Hz, so the crunshing need to be faster then 16ms or we will miss this time-window and the editor will appear sluggish.


Inserting a { took a very long time in a large file, probably because of fixIndentation.js 

Copying the content of editor.js into another file was sloow!

The most common editor benchmark: Open huge files.
Do not open files that are too large for the editor to handle. 
Or open part of file!?
"The file is too large to handle. But we can open parts of it. Type a nr between X and Y:"

parseJavaScript: 27.613ms on 65k file

optemize it!

try inlining all functions, and move to separate worker.



Running the spellchcker will throttle the CPU at maximum for up to 30s or more!

Deleting selected text is Sloooow.

Editor became un-responsible when searching for: smoothing

It lags while moving the character (arrows) in a large file.

Deleting a selection is slow!!

Inline functions in jsParser.js (make a better document previewer before that!? *smile*)

Wait some times before starting a parse. (dont have to parse while we're typing, most of the time). 

Do the grid boxes really have to know their character index!?

Test a huuuge .js file with many functions to see how the editor performs.

Typing is slow, especially in full screen.

Rendering is slow when there are many misspelled words.

Render only the row when typing along ...

Go to Power Options -> Create a power plan -> Change advanced power settings and set CPU Maximum Rate to 5% or how much you need.

Hide lag by rendering before doing work.

editor.renderPart(row, col, length); // Render part of the grid 

Can we get rid of the file.text and only use the grid!? Only convert the grid to text when saving. 

Try the editor on a super slow PC to see what needs further optimization.

createBuffer in render takes a very long time > 500 ms on files with very long lines. 


Using native variable instead of array for pastChar: Faster 20-25%!!! Tested in C:\Users\Z\dev-repositories\test\JZedit-tests\parser


Unable to repeat bugs (happens rarely)
---------------------------------------

---

Cut/paste turned the text backwards!

---

Sometimes it doesn't work to select text, or the selection is buggy.

---

Some times the editor is invisble in MS windows. Only the debugger window loads.
Probably because of failing JSON.parse

---
When double clicking a world and started typing:
Index is undefined. Stuff will go wrong!
---


Text disappears from some lines when the spellchecker is running.

---
when closing:
Error: File='C:\Users\Z\dev-repositories\js-editor\plugin\javascript\jsParser.js' not open! global.files=["C:\\Users\\Z\\dev-repositories\\js-editor\\todo.md","C:\\Users\\Z\\dev-repositories\\js-editor\\plugin\\find_replace.js","C:\\Users\\Z\\dev-repositories\\js-editor\\plugin\\mouse_select.js","C:\\Users\\Z\\dev-repositories\\js-editor\\File.js","C:\\Users\\Z\\dev-repositories\\js-editor\\test\\html.htm","C:\\Users\\Z\\dev-repositories\\js-editor\\plugin\\mouse_place_caret.js","C:\\Users\\Z\\dev-repositories\\js-editor\\test\\A.js","C:\\Users\\Z\\dev-repositories\\js-editor\\test\\test.js","C:\\Users\\Z\\dev-repositories\\js-editor\\plugin\\render_text.js","C:\\Users\\Z\\dev-repositories\\js-editor\\settings.js","C:\\Users\\Z\\dev-repositories\\js-editor\\index.htm","C:\\Users\\Z\\dev-repositories\\js-editor\\plugin\\render_indentation.js","C:\\Users\\Z\\dev-repositories\\js-editor\\editor.js"]
file_tabs.js:636 Uncaught TypeError: Cannot read property 'isSaved' of undefined
---

Pressing enter mess up the colors

Somtimes keys with shift or alt-gr doesn't work! native

Sometimes you get an error when closing the editor, that one of the file we want to save state for is not in global.files.

When reloading using F5:
node) warning: possible EventEmitter memory leak detected. 11 close listeners added. Use emitter.setMaxListeners() to increase limit.
use location.reload() instead!?

Somtimes when closing the editor. The file path is already removed from global.files!

Sometimes get error about file not being open, when closing a bunch of files: file_tabs.js:618 

Editor sometimes fails to save!!! When? there's an error / something crash?

Sometimes when undoing (ctrl+Z) the caret is placed on a non existing grid column!

Black screen when opening file

Ctrl+X not working

Opening files with inconsistent line breaks.

Opening another file shewed the div's so that preview dropped down and canvas halved. When!???

Test if inlining functions in jsParser makes it faster.






Feature
=======

Support for: http://editorconfig.org

Show another part of the file so you can copy back and forth, without navigating.

Button (F5) to execute the current script in NodeJS and show the output

Argyment helper/autocompleter for callback function. foo(function(what, arguments) {...}); // Who is an async function

Plugin for exacuting shell commands (both on local and remote/ssh) and get the result from stdout to a file

A scrollbar, for quick indication of how large a file is, and for faster scrolling.

A scrollbar! With text in it, but still thin.

Mark unused variables!

bash .sh file support/parser

Edit files over ssh

tutorial.txt: Learn how to use it

Smooth scrolling. Show text while scrolling

* Replace in file (using regex)

The JavaScript parser should be able to handle <script>code</script> snippets from other language parsers

* PHP parser !

* Built in FTP/SFTP/SSH !

* bash script parser !

Show a vertical ruler if we are typing a too long line.

Instead of word map. Make a plugin that when clicking Ctrl + W word wraps a paragraph.

auto paste in snippets from stack exchange, Ctrl+H, write question, select result, paste the code from the most popular answer. 

vi keybindings

column selection

Pipe to other program: Sends the text to stdin of another program.

File cloning/file views: Have the same file open in two tabs, but with different file positions, caret, selections and highlights

Go to defenition: Ctrl click on a function name to cline the file in another tab and scroll down to that function.


JavaScript: Warn when a new line starts with with (, [, /, +, ++, or -- 

Open file on SSH!

Profile idea: The editor will come with everyones profile: keyBindings, plugins, theme
It should be easy to quickly get your own custom settings when installing the program on a new machine.
Maybe give each user their own mercurial repository!?


Multiple cursors! Ctrl+Shift + up/down, or Ctrl+Shift + mouse click creates another cursors. 
Useful when you want to format stuff that look the same, ex. if you want to make many var's into one long line var
var foo=1, ... place bar and baz here
var bar = 2;
var baz = 3;


Undo/redo for caret/scrolling. shift+backspace: Go back to where we where before
Ctrl+G when caret on a function name, goes to that function. Go to function declaration.

Split/gline veiw, so you can edito the same file, but on different positions. Handy when you want to lookup stuff in the same file.

Integrate mysql Query browser as a plugin


Display white space characters (space and tabs) at start of a line and at end of line. (unless it's a comment)
render function: start from end, then break at first char.

Uncaught SyntaxError: Unexpected token )
Find unmatched parentheses !!


After tabbing back to the editor from another program. Check each file if it has changed from last saved state.
Silently create a backup?
When you save a file, and the file on disk doesn't match last saved state. Create a backup of the file on disk before overwriting.
Then open the other file and make a diff.
Hitting F5 = Reload all files from disk.


Ctrl+T -> Choose between templates : blogpost.htm, websocketwebclient.js, nodewebsockserver.js, emptyhtml.htm

A merge resolver. Show a diff. Then hit left arrow to select line from A, 
or right arrow to select line from B. Or shift + arrow to insert a NEW line witch the content from A or B.
And Delete by hitting delete.


A self debugger that runs in the background and auto sends bug reports if there is any error.
A timer on the web page: Time since last bug.

Show help for standard JS methods like: text.substring( show: start, end

Drop file into editor!!

Give a warning when doing this: options.push[something]; when "options" in an array (should be .push() a method)

optioin (menu option) to Add misspelled words to dictionary overload.

More help with huge {} block nesting, detect problems, show warnings triangles!?

Auto insert */ when typing /* in JS mode.

A key to move something to the right *over* existing code. ex: place A|B xxxxxxxxx B <--- here

A faster way to open files: Ctrl + G, goto line or file:line (insipration: Chrome debugger)

When there is no file open, show a list of file? or a text: <p>Press <b>Ctrl + O</b> to open a file</p>

Increase text size by Ctrl + Scroll wheel. (for presentation mode)

Mark unused variables (and properties)

Better search in file. Look at notepad++ for inspiration.

Dumb autocompletion: Auto-complete words that we have already typed.

Cltr + P: Type somthing to open any file (like in debug tools)

When one or more lines are selected while pressing tab, make it a code block, insert { arount it } and place the caret to the left of the first one

Keybinding-override: A GUI for over-riding all keybindings, lets you edit the key's for all functions in global.keyBindings

ASCII-text module for writing LARGE text for the previewer
http://patorjk.com/software/taag/#p=display&f=Sweet&t=I'm%20cool
http://www.network-science.de/ascii/

Open files dropped into the editor!!!

Debugger integration! No more console.log debugging!
When in dev-mode, you can just place a break-point and the program will stop there and you can see all the variable values, like in the debugger.

When hitting F5 and the file starts with "#!/usr/bin/env node".
Run node with debugger and when there is an error, go to that line and display the error message!
If there is no error, open a new file with the stdout.

Broadcast to local network that you are working on a spcific file. If someone else have the same file open, you can colaborate, and you get each others changes.
You can also open up another copy of the editor locally (for split screen) and make changes to the same document. (how to do Ctrl+Z ?)


cmsjz live preview!

Make a better document preview ...

Being able to split the same file into two views so you can look at two parts of the same file at once.

Key binding for: put the selected text in clipboard and put the cliboard instead of the selected text.

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

When ctrl+z, move the caret to before the text being removed. For every action, create an undo-action.

plugin idea: Translate code comments from one language to another. (as a preRender, do not change source)

Printing text (on printer)

Sort paragraphs by column. Ctrl + 1-9, auto detect date



Need though
-----------

hmm ... Should all files be opened as streams!? ReadableStream 

Switch SCM from Mercurial to Git because hg lost file changes!?

Moving back to browser for a while, just to fix compatiblity issues. Then move back to nw.js. To make sure it works in the browser too.
http-server .
Spellchecker can be run as a service.


About trying other runtimes, like native rendering. We should stick with "browser" because getting something to render natively, like openGL is too damn complicated.

How should updating work!? Stable branch=double work!?





