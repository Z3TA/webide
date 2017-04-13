
Prio:

1) Make it possible for a non-dev to make web documents

Synka-knapp i SSG som uppdaterar från Mercurial
Går inte att publicera om man inte har dokumenterat och synkat
Går inte att synka om man inte har dokumenterat
Efter att man sparat en fil i SSG kommer det upp en dokumentations-widget,
där man skriver in varför ändringarna gjordes.
(Det kommer upp en blinkande knapp i SSG widgeten som heter "dokumentera", när man klickar får man en lista på filer som har ändras, plus en textruta för dokumentation. 
Man kan klicka på filerna för att se diff)

Guide för att infoga bild när man redigerar sida i SSG ("infoga bild" i SSG widget!?)


When a SSG source file is opened, automatically bring up the WYSIWYG
(find a good place to place the windows)
Also bring up the SSG widget/toolbar and show/indicate that Preview and WYSIWYG is activated
(clicking the buttons will deactivate preview/WYSIWYG and close it)

Translate to other lanugages (Swedish) lang.js file with all phrases, calling STR("phrase") gives the right phrase.

Pasting or dragging in images ... convert place image in src dir

Meta publish date, publish only after this date. Make server auto publish!?


2) Beta release?, get USER FEEDBACK!

find beta tester
setup ftp + webpage
give download link with bootstrap.url token, that saves the ftp user/pw
have a tutorial that shows how to publish to webpage and write new posts

3) Bug/issue fixing and refactoring
4) Polishing of existing features
5) Optimization (toggle devMode off when testing!)
6) New features



What I'm working on
-------------------

How to add files to version control ?
How to annotate/commmit to version control ?

Implementing Mercurial support

SSG and WYSIWYG + Mercurial Repo


todo:



mercurial/git integration

Functionality discovery: Add a search-glass-button in the upper right corner, clicking it is the same as clicking the keyboard function/ctrl button:
It will bring a action command box, where you can select between all possible keyboard combos, and from stuff in the context menu.

When editing in WYSIWYG mode, a short cut / keyboard combo to open the CSS file and scroll down (highligt) the right section.





* Fix bugs!
* Add features that makes it easier to fix bugs !?
* Fix bugs!
* Test existing features and write automatic tests
* Fix bugs!





What I'm thinking
-----------------

Discovery: "tip of the day". "Open a file" Ctrl + O
Keep stats on how many times a key-combo has been used, then show tips about the less used ones.

Is node.exe (osx package) a signed binary ? Can OSX users start it !??

Add to Chrome OS app store ...

How to handle errors in server.js ?

SSH keys when connecting to remote servers ... where to store them ?

Making a new web page/post should be as easy as making a new comment on HN, or posting a status update on Facebook.

Getting likes or upvotes are very addicting ... 

Is it possible to teach people to write HTML ? "Learn HTML and Make web pages like a pro"

SCM integration (both Mercurial and Git, auto-detect) ex:
file.isCommited
file.blame(row) 

ex: Before pushing a site to FTP, checks if the changes have been commited and pushed (updated and merged) before going live.

Keyboard shortcuts are very hard to remember and not very friendly for first time users ... Do we need a menu or tool bar ?
idea: (yet another keyboard shortcut LOL) Ctrl + Up down, brings up the same menu as when right clicking (need to make it look better) and add most important "shortcuts" there!


Helping functions / abstractions, that I need, or find it annoying without, have prio, but bugs have more prio!?
Maybe it's faster to fix the bug if I have those functions working thoug!?

Work on improving the bug finding system, like undefined methods and properties, have prio! But bugs have more prio!?
Follow <script includes and nodeJS require's

misspelled / undefined property: If the property have never been seen before but match another property with only 1 character off, show the off letter with red background.

Flow integration !? https://flowtype.org/assets/flow.js
https://flowtype.org/try/
ej=yf}ej.registerFile=ig(function(a,b){return CU(a.toString(),b.toString())});ej.setLibs=ig(aDb);ej.check=ig(aDc);ej.checkContent=ig(aDd);ej.jsOfOcamlVersion=Hm.toString();ej.flowVersion="0.31.0";ej.typeAtPos=ig(aDi);Du(0);return}}(function(){return this}()));

Make a Tern and Eslint plugin too ? Only use the pure JS file, not the whole NPM projekt, run in worker process.

---

Save state every X minute and track all actions. Then when there is a error, a test for that bug is automatically created, 
loading the state and replaying the actions. Ask to fully restart the editor.

When "debugging" Open up a editor clone, with --remote-debugging-port and run the tests there, 
so they can be debugged with breakpoints (do not self debug).

---

Bind to the actual character/key/control-character instead of keyboard combination !??? 
Like ô instead of the combo to make that character.
Because keyboard layouts are different. 
Return false to prevent the character to be inserted into the document (default action)

What's weird is that Ctrl+I does not trigger keyPress event, but Ctrl+U does (21). Why??
This means we wouln't be able to bind anything on Ctrl+U (and more combos) as it never fires the keyPress event.

Use this control key standard?
https://en.wikipedia.org/wiki/Control_key

---

Replace all file IO with streams !?

Should files be opened as streams!!?
Would probably have to save remote files to a temporary location


Lessons learned
---------------
Try do debug without console.log!
Always use F5 to reload! Or exit functions might not fire!
Write tests (first)!
Use hg mv to move/rename files!
note: The error should be the first argument in callbacks!
note: Have to close the app and reopen it to reload NodeJS module source!
note: Always restart after a (thrown) error! (Spent 3 hours debugging after a "throw" caused code in a NodeJS module to abort, and leaving it in a bad state.)
Throw errors instead of just returning the void! (ex: if(foo == bad) return;) => throw new Error("foo is bad!")
Plugins GUI's should use their own event handlers for the GUI instead of cluttering keyBindings


When discovering a bug
----------------------
Write down what you are working on ... because we are going to enter several levels of bugception and you will totally have forgotten what you worked on when you investigate the bug of the bug of the bug of the bug
Find out how to repeat the bug
Write bug traps, like if(f>99) throw new Error("Found bug X, state=" + state)
Write down how to manually repeat it, make example files, file bug report
You will most likely find additional bugs while doing this. Write them down too!
Priotize for witch one of the bugs to fix.
Write a test case before fixing it (Write code that automaticly repeats the bug) ... And document in the test file /tests/mybug.js about the bug or why the test is needed
Write mock tools (editor.mock) if needed
Run the test (and make sure it fails)
Refactor the entire program if needed to allow testing
Run the test
Refactor the entire program if needed to fix the bug
Run the tests 
Fix the bug (like five years later after fixing all isses that comes up just for fixing this tiny bug <g>)
Run the tests (and make sure there are no errors)





BUGS (and issues)
=================

Move dialogs when resizing!

users .localStorage file is sometimes currupted ... } is inserted instead of a ,

Search in file on remote fs doesn't work!

Don't remove spaces/tabs from copied text when working with text mode files!!

Replacing a text with a text that contains the text to be replaced causes an endless loop when clicking Replace all.
Example: getSourceCode => getSourceCodeBody

Text is blurry in Windows when the function list is visible ...

Somehow the same file was openec twice ...  It happends when files are opened with / as path delimiters in windows,
so you have one file with "C:\folder\file.txt" and another "C:/folder/file.txt"

linux ftp file names with åäö get scramled

colors keep getting off in svg (xml-parser) files.

Save-as didn't update file.fileExtension !! saved as svg (wasn't parsed)

Annoying when disconnecting from FTP, default working directory. What to set as default working director ??

Annoying red circle in if-statement with regexp and single =

selecting a text then shift and mouse clicking pops one character on the right side

Function list is not updated if you move BUILD.login = function buildLogin() {} the function is lifted out

Zooming in a CSS files highlights all # as topics

Autocomplete should not complete the actual function arguments inside a function call, because it can be wrong! foo(aaaa, bbbb|) 

{
	foo: function() {};
}
foo() can not be called. Mark the function as not having a variable pointing to it!? ... to prevent auto completers from suggesting it

Unable to delete SSG site

IF and END IF ASP vbScript on the same line gives wrong indentation: ex:
<% IF MilitaryScienceCostGold <= gold AND totalStone >= MilitaryScienceCostStone AND totalTree >= MilitaryScienceCostTree THEN %> <form action="science.asp" method="post"></form><br><% END IF %>

When scrolled to the right and switching tab will throw an error

Making a multi line JS comment at the top fucked up indentation on ALL lines, flattening them in source code. 

Unicode characters that are not visible. for example: 5206 or 8206 "left-to-right mark" will cause the grid to show wrong


Deleting lines that start with spaces, and then Ctrl+Z ...


Annoying "" when adding " around json ...
{
""foo: "bar"
}

var in for() not found (when auto completing)
function arguments not found when auto completing


ftp choke Ctrl+P error

Unable to open big remote files (over FTP) (because big files only support disk streams) (should everything be streams?) 


"Scrolling bug", when scrolled to the right, then opening another document (using file explorer)

Unable to find start of function:
editor.eventListeners.exit.push({fun: function closeOpenConnections() {
for(var conn in editor.connections) {
editor.connections[conn].close();
}
return true;
}});


Can't save remote file after ftp timeout/disconnect -> reconnect 

auto scroll down when text dissappears typing at the bottom but not eof

Was gonna edit a legacy ASP file, but got warning about char encoding, asked to convert to utf8, but was too afraid to convert.

String colors off in svg: ftps://192.168.1.77/hemsida/gfx/ikon/pdf.svg (making new lines to edit viewBox

Saving a file (on remote) seems to recreate it and reset permissions!?? on windows share

Clicking Ctrl+O many times will bring up many dialogs! Clicking cancel on one of them seems to cancel all, even the first one.

Can't open "package.json" via Ctrl+P when there are no files open.

---
Indentation: (create new file and cipy this in)

/tank/logs/log/mysql.log rwk,
/tank/logs/log/mysql.err rwk,

/tank/mysql/mysql/ r,
/tank/mysql/mysql/** rwk,

/tank/mysql/ r,
/tank/mysql/** rwk,
---

Saved as, then more files loaded and I saved as on another file, not the file I wanted to save as!


Selecting using keyboard from bottom up, does not select all characters. And text is crazy when copy pasting
<tr>
<td>Row1</td>
<td>Still row 222!!!</td>
</tr>


Pushing WYSIWYG didnt work (needed to select a page first)


Auto complete function arguments inside <script> inserts </script>


When saving as or reloading a file, all white space are hidden! ... 
.....text
(save as)
text (white space hidden)


Sanitizing the WYSIWYG does bad things ...
If you had the WYSIWYG open and doing a preview, it sanitizes when switching back!

When making a /* block comment inside a function with sub functions, when closing the blog comment, you get an error message about missing functions


Warns about single = in if ... ignore regexp!
if (lines[t].search(/TTL=[0-9]+/i) > 0) {


File was marked as saved, but did not have the latest content because it was changed by another program.


Dont find error: if(err.code="ENOENT"  (one equal sign)


Word wrapping plugin doesn't seem to work in new files ...

---

Got eternal spam "error reding dir" from goto_file

---

xml tag color error: .asp

<h2>Image-pack</h2>
<form action="account.asp<% =S %>" method="post" name="imagepack">


---

Unable to find start of function :

<div id="log"></div>

<script>

function read(file) {
var promise = new Promise( function (resolve, reject) {

});

/


}

</script>

---

Paranthesis matching doesn't work when there are parantheses in strings

Cant make tidle char: ~ (Linux)

Indentation error: 

[PR_PUNCTUATION,  /^[=<>\/]+/],
['lang-js',       /^on\w+\s*=\s*\"([^\"]+)\"/i],
['lang-js',       /^on\w+\s*=\s*\'([^\']+)\'/i],
['lang-js',       /^on\w+\s*=\s*([^\"\'>\s]+)/i],
['lang-css',      /^style\s*=\s*\"([^\"]+)\"/i],
['lang-css',      /^style\s*=\s*\'([^\']+)\'/i],
['lang-css',      /^style\s*=\s*([^\"\'>\s]+)/i]
]),
['in.tag']);


When double clicking on a word, then pasting something to replace it, a space on the right is deleted!

Goto file. Old results sometimes overwrite newever results like fo overwrites foo

When making a block comment /* and there is already a block comment below, it might "merge" two functions. And then when inserting the ending */ the parser complains that it found unexpected extra function.

file explorer: After saving a file "save as" on ftp connection. Updating the file explorer only show the folder the file was saved in under root dir, and you cant open any files

file:///C:/Users/Z/dev-repositories/jzedit/editor.js:2726
Uncaught ReferenceError: sshClient is not defined

Wrap plugin seems broken. Try it in react_vs_vanilla_js.htm

FTP opened folder from both ftp:// and ftp:/// then I had two different versions of the same file. And lost all changes

Can't use the remote connection after we got an error. For example access denied after attempting to save a file. (need to re-connect)

When selecting text then pressing left or right arrow, the caret should jump over the selected text (that will be unselected)

Unable to make a tilde character ~ (and other special characters) in Linux. 

The list you get with quick open (Ctrl + P) is hard to read with sun glare on the screen.

Doesn't line break long sentences in dialog box (but we dont want to break file-paths without spaces)

Scrolling error when quickly closing down files ...

Editor taking long to start when accessing network drives, show message about files being accessed !?

---

When disconnecting from a ftp server after reloading (f5) the program:
Calling showSpellSuggestion ...
server_manager.js:221 Uncaught TypeError: undefined is not a functionserver_manager.js:221 disconnectConnection


Error reading folder: ftps://192.168.1.77/dokument/mapp med mellanslag och Ã¥Ã¤Ã¶
Failed to change directory.

Auto complete object prototype doesn't work (about.js)

SFTP (Waiting for SFTP editor.js line 966) stops working after trying to write to a file without write access.

The Ctrl+P quick open doesn't always show the results from the word typed. Like "todo" showing results for "to"

---

First functions name gets window.onload while second function name becomes winResize (not consitant)

<script>
var w, h;

window.onload = function winLoad() {
w = document.getElementById("width");
h = document.getElementById("height");
}

window.resize = function winResize() {
w.innerHTML = window.screen.availWidth;
h.innerHTML = window.screen.availHeight;
}

</script>

---

Selecting a chunk of text from buttom up scrambles the text ... Adds the same text but backwards ...
Cutting text seems to parse the file/text many times!!?

var message = 'To: "Johan Zetterberg" <zeta@zetafiles.org>\n' +
'Subject: JZedit ' + source + ' (line ' + lineno + ' col ' + colno + ')\n' +
'\n' +
'Date:' + (new Date()) + '\n' +
'Commit: ' + editor.version + '\n' +
'Platform: ' + process.platform + '\n' +
'Arguments: ' + require('nw.gui').App.argv + '\n' +
'\n' +
error.stack + '\n' +
'\n' +
'How to repeat:\n' +
'\n' +
'Hit Ctrl + Shift + S to send this report over HTTPS. (If you save this file for sending later, keep "bugreport" in the file name or you wont be able to send)';


Ask for password in SSG if no credentials are provided, or add field, "when asked for login/pw use..."

Unable to make a tilde ~ character in linux

When saving a hgrc file save-as it got no name in the file-tabs

fixIndentation is still not fixing the last }); !!

When removing the name from a lamda function it's still in the function-list but blank name. Possible state bug

Error when editing a function:
function keyPressed(e)m{ inserting the m between ) and {

Bracket /curly matching match against string or regexp!

Typing inside a function doesn't warn about if(foo=bar) one eq in if statement


Opening a large file via xFTPx tries to open (due to big file) stream on local filesystem.
Streaming strategy from FTP: Save a local copy to disk while streaming, then use that for lookups, (and edit it wile making changes btw stream chunks)


Weird formatting in vbScript with IF ELSE END IF on the same line:
var loggedIn = <% IF loggedIn THEN %>true<% ELSE %>false<% END IF %>;
var popups = <% IF popups THEN %>true<% ELSE %>false<% END IF %>;
var openpage = '<% =openpage %>';
var showNews = <% IF showPersonalNews = 0 THEN %>false<% ELSE %>true<% END IF %>;
var vuid = '<% =strCookie_VUID %>';
var haveMovedArmy = <% IF haveMovedArmy THEN %>true<% ELSE %>false<% END IF %>;


Search in file bug? 
Can't find "cheat.txt" in \\192.168.1.80\domains\visual-utopia.com\ 
"But none of them match the file filter!"
+ the gui wont go away when pressing escape!

The indentation helper (render_indentation.js) doesn't work with parsing-only-the-function-optimization because lastRow.indentation is not affected!


Always the wrong path when saving a file. Need to be smarter!

ASP-file: <body topmargin="0" leftmargin="0" rightmargin="0" bottommargin="0"><iframe id="iframe" width="100%" height="100%" src="beta.htm?vuid=<% =strCookie_VUID %>" border="0" frameborder="0" marginheight="0" marginwidth="0"></iframe></body>
bad color on strC

Uncaught Error: fullParse.quotes.length=1 oldParse.quotes.length=0 

There's something wrong with the parser, see async_await.js

Function list selects the first function and the other were in child-function

Escape key doesnt hide search in files.

Selecting text using keyboard arrows from bttom up scrables the selection.

Auto completion, or copying in, and parseOnlyFunction optimizer: x characters entered while asuming only one.

Ctrl + P to open files can lag, so "todo" first blink with results for "todo", then overwrites with results for "to".

Gets into a constant loop when replacing \\n with \n

When selecting text using keyboard up/down arrows the text gets scrambled

When selecting this using keyboard, then copy/past it gets scrabled:
<%
str = "<table>"
%>

Indention bug:
// Update the function
var firstFunction = js.functions[firstValueInObjectList(js.functions)];
f.variables = firstFunction].variables;


When selecting and cutting large text:
Uncaught Error: file.startRow=1807 grid.length=884 file.partStartRow=0File.js:456 File.checkGrid

When having only one paragraph and Ctlr W: Did not find start of paragraph


When deleting rows, it doesn't scroll up

Can we search in file on a FTP? Nope!

implement editor.findFilesContaining(txt, path) ?

Inlude global scope in auto completer: All script tags in a html files. Save in background parsed

Add function arguments to the variable auto completer.

Typing in editor.js is slow


parse error:
var myRe = /<\?JS.*?>/g;
{

}


Getting a tag ending when autocompletion something that is no available: ex:
proc</editor.tests.length;> in editor.js

Missing auto completion for function arguments!

Indentation in the source files is fubar

Adding a } should fix indentation of all lines below!


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

Can't open Big files from FTP/SFTP because of the stream.

When the editor touches (redoes) all whitespace, like when removing a } somwhere.
The SCM system goes heywack ... a lot of updates here and there and stupid commits.





Unable to repeat bugs (happens rarely)
---------------------------------------

When using Ctrl+P to open/search for files, example functionlist, it doesn't update on some characters and the screen look weird.

After failing gotofile once, it seems to fail all the time after (aborting, too much latency) possible fixed when the ftp queue was implemented.

Error when writing /" inside an function Ex:
if(dir.indexOf(/"


When copying in code into a function, colors, quotes, comments will be off (by line)?

When selecting text to copy, using the mouse, sometimes the last character drops out

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

Test if inlining functions in jsParser makes it faster. IT DID NOT!!

bug: ssg preview doesn't hide when pressing escape.

The code sometimes "jumps" when editing in a subfunction.

Pasting code into an emty (sub) function sometimes does weird things





Low prio bugs
-------------

When loading the spellchecker on Linux it complains about libstdc++.so.6 version GLIBCXX_3.4.21 not found. Should update the runtime and use builtin spellcker!

spellchecker: Red waves doesn't go away when changing the word.




HTML WYSIWYG
------------
Icons for the most common semantic tags.
contenteditable updates needs to be beutified, and non sematic tags removed/changed. (span, font)
Option to switch between raw html, wysiwyg and a wysiwyg (called semantics?) that shows the tag in transparent gray, plus a thin border
Links: When selecting a link, show a list of current files, plus a box for url.




Polishing (only existing features)
==================================

When switching from a source file on one ssg site to another ssg site ... Selected site should change, preview close, etc
Auto opened SSG panel doesn't select the right site when clicking edit

Make the SSG work in the browser with all bells and whistles (WYSIWYG, Mercurial)

Show virtual paths on server errors like "unable to open file".

Some sort of indication that you are disconnected to the server

colaboration: When two or more people are logged into the *same user*
and opens *the same file* the editor goes into colaboration mode, that lets you see each others changes live.
Press xxx to follow someone else's cursor.

Show inconsistent indentation. If the indentation characters are not corrent. Show them! (in red ?)
tab tab ...
So that I will know when someting goes wrong with indentation.
Add the indentation widget to right click menu when clicking on a line that has bad indentation characters.

Server storage instead of local storage.
Server storage fallback to localStorage when server goes offline, then sync when it comes online agian !?

Remove bootstrap function, it's no longer needed as the editor can be run
in a browser and has a server.


colaboration: When you log in to a user that is already logged in you'll get into colaboration mode,
where each change will be mirrored to the other client.

when someone logs in as you, you get the option to disallow it, or (default) enter colaboration mode
when you log in as someone else, you get the option to kill the other session, or (default) enter colaboration mode

Fix problem with endless mirror loops!

Make a special start.js (node) script for OSX (that all OS's can use too!) !?
Pass serverUrl as query string to client

package your project for Npm, use the 'bin' field in package.json. Then on Windows, Npm will install a .cmd wrapper along side your script so users can execute it from the command-line
Make a jzedit.js.cmd file so you can start it by typing jzedit.js in Windows.

Update server_login.js to use current url as default server url

Editor server login ... What if you're connected to the server, but not logged in. Or want to connect to another server ?


Annoying line at the bottom (footer) of the editor

Ask to disconnect from remote server when closing the last document open on that server.

An error that might give some headache is when you misspell a variable when declaring it using var foo,
then get an error that foo is undefined ... Warn when a declared variable is not used!

It's a common error to forget a parentheses in for example nested if's. 
Warn or auto insert missing parentheses !?

Autocomplete global variables (in browser, from other files)

Add icons to the file explorer and make it easier to navigate.
Show git/mercurial status beside each file (New, Modified, Ignored)

Move the caret to the far right when selecting by double clicking

Reopen closed tab!!

Ignore quotes when matching parentheses

Adding a quote at the start of a word should only insert a single quote not ""

Confirmation when deleting SSG site

Lazy autocomplete from other .js files ex: resources.gold

Preserve indentation (spaces?) when commenting out code

Auto complete html tags inside strings. example:
"<b>" + site.name + "</b> published to:<br>" + site.publish + "<br><i>" + site.url + "</i>"

Refresh previw/WYSIWYG when editing CSS files

SSG, able to set a site as default and show that first.

SSG problem: WYSIWYG with files that contain <?JS code ?>
Debug deleting large chunks in WYSIWYG doesn't remove all from source.
Debug writing in editor inserts stuff from the ignore (transform).

automatically bring up the SSG widget when opening a file the is managed by the SSG, and select that site

show all editor windows when showing one of them! Like ex you have the preview open, then alt tab away, then alt tab back to
the editor, you still want to see the preview window!

Mercurial integration

See total lines in bottom right corder when scrolling so you know where in the file your are.

Improve the file explorer:
Two panes, one for folders (with local fs and all remote fs as root's) and one for files (current selected folder).
Icons! Delete, rename, create new files and folders. Move files using copy/pasting (even between different remote locations). Inspiration from Windows Explorer

SSG/wysiwyg: Control what happends when you press enter. Use native selection API to place cursor in wysiwyg

cleaning up pasting from Ms-word in SSG WYSIWYG

ssg: show the ssg buttons whenever a file from a registered project is opened

Smoothen the user experience when making a change in a web page, or adding a new article or blog post.

Refactoring to use streams (and not have a separate big fil opener) so that large files can be opened via ftp

delete (and rename) files via file explorer

function list för asp and php !? (use https://github.com/felixfbecker/php-language-server and try VS Code Language Server Protocol)

Easy way to rebind keys: settings_overload.js rebind(what, new combo)

Reconnect FTP when there is a timeout disconnection.

Autocomplete html tags inside strings (only look at the same line for opened tags)

Make the editor scroll down when you press enter and cant see the line (it does scroll down when you start to type)
When pressing enter, make you see a few more lines ? Like when scrolling using the mouse ? Test the feel in windows notepad (pasting stuff into lists)

Allow indentation micromanaging (space) inside block comments and <pre> (they currently do not show after the file is reloaded)

Annoying when making a block quote and cant see where to end it. Sugg: show a green line from the start of the unclosed block scope to the cursor

Annoying when double quotes are inserted when you do not like double quotes: example foo =  (here)    ";

Put all features under (native) menus so they can be found, for example using the Ubuntu "Alt" HUD for searching the app menu ...
Could use it as a commander, ex: open recent file: .... open file: (list all files in current files's folder)
http://support.system76.com/articles/ubuntu-basics/

Icons in the contect menu so things get easier to find!

Auto complete HTML tags inside JS strings.

List-box in goto-file. Where local and remote systems are listen. Where working dir's are opened in a tree.

autocomplete: Do not make variable suggestion when in HTML mode (only html tags)

Auto scroll to found functions when typing in the function list

Connection manager: Show last used connection as default

SSG: Upload/publish to two locations at once.

There should be a "waiting for disk?" message while files are opening from last session.

It should be possible to scroll using touch (hold down finger and move it)

Need a way to open file on touch (preferably a plus sign on the tabs list, like in browsers)

Temporary show total lines in file while scrolling and where in the file you are. Ex: Page 2/100, of 15231 LOC
Page up/down should move depedning on the amount of visible rows in the editor!


Select default (root) folder in connection manager!

When trying to make double quotes in vbScript "<foo bar=""baz"">" ... Maybe have to press Alt when making a " to auto insert the extra " + + " ? 

Tab and shift+tab to manage indentation in non-intepreted files

Don't add an extra " when the " match on that line. Ex: foo = "<--   jajaja "  not: "" jajaj"

SSG, auto scroll down to where you was when previewing. (when you update and "refresh").

Ctrl? click on a function name to go to it's definition.

jzcms.json settings file for the static site generator. Inlcude ftp and target folders.

Possible to stop searches that take long time

Make better file-open, directory picker, and file-saveAs dialogs with support for remote FS (FTP/SSH).

In server manager, sort connection list by last connected to.

When opening files via Ctrl + P, show a loader that says how many files have bee looked at and how many files left.

It's unclear what to do after connecting to a remote server. Like: how do I open a file, or create a new one?

editor.addMenuItem should take a third argument that is called every time the context meny is shown, that has to return true for the item to be visible.

Create dirs and new file on remote servers.

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

No color on high-light, just bold! paren + måsving

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


Refactoring so all keyboard commands / key bindings gets registered.
List of available commands.

editor.bindKey() instead of editor.keyBindings.push()

-search box in file explorer, where you type the name, and pressing enter opens that folder and scrolls.
-like writing a path in bash. cd /ta -> no -> lets -> with auto complete

support port in url's (connection manager, etc)

Implement angel-wing/block variables (let, const) in the parser for smart auto-completion

Figure out when indentation in the sourfe file goes bad and prevent it

Preserve (manual) indentation inside block comments and pre tags !?

Auto complete xml tags! (in xml/svg files)


Optimization
============

Fixing performence problems in wysiwyg (pasting a word document took a lot of time, also typing in wysiwyg afterwards was slow)

editor.eventListeners.exit.push({fun: function closeOpenConnections() {
for(var conn in editor.connections) {
if(editor.connections[conn].close) editor.connections[conn].close();
}
return true;
}});


variableName and llWord in js_parser.js can sometimes hold large textes (check editor.js) witch might slow down parsing

Double clicking on a common word in a large files (grid in File.js) takes a lot of time to highlight the words

Long lines takes super long to render because of colorization.


Typing in editor.js is really slow because of the JS parser. Only parse if special characters are entered!? Optimize the parser function.

applyJScolors slow on long lines, ex: sockjs one liner

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

Need to update deleteSelection so it only generates one change instead of using deletecharacter ... ?

Run for loops in parallel: 
#pragma omp parallel
#pragma omp for


Battery benchmark optimization. Detect if the computer is running on battery and make stuff more energy efficient (disable resource hungry features)


Feature
=======

Bugs have higher prio! Fix bugs and issues before implementing new features! The above lists should be empty before reaching this far.

When implementing a new feature
-------------------------------
Priotize the feature list to make sure you are implementing the most critical feature.
Design it in your head
If possible, make it as an independent plugin (should only depend on editor.js, File.js and global.js. It should not depend on other plugins)
Write a prototype
If you discover any bugs or issues elsewhere, sorry, bugs and issues has higher prio then new features!
Iterate on the feature
Refactor the whole program if needed to make the fature work great
Run the tests
Iterate on the feature
Write tests that confirms that the feautre works
Run the tests
Make mock tools and new testing tools if needed
Run the tests
Refactor the entire program if needed to allow testing
Run the tests
If there's a bug, see "When discovering a bug"
Run the tests
Polish the feature
Measure performance
Optimize if needed


Feature list (Not ordered/prioritized)
------------------------------------

Run node script: F3? ... see console logs in the editor ... debugging!
run isolated ... linux namespaces / containers ?

In plenty editors, doing left-alt (left option) and selecting text will take a slice of that text:
Notice that only characters are selected, empty lines are ignored. Also, after selecting with left-alt, there should be multi-cursors at the end of each selection:
https://github.com/atom/atom/issues/2306


Show invisible characters when selecting text ?

Select the code block when tripple clicking ?

Static site generator: Make it possible to shedule publishing posts in the future using the <meta name="created" content="2016-03-22"> meta tag.


Mercurial SCM integration!
Add file.hg.modified, etc to File object. Show hg status in file tabs and file explorer. Merge tool!

Vim Style Key binding

<img| auto completion, selects and image, and puts that in src, plus it's with and height attributes.

Ctrl + Click on a CSS class to go to the defenition (inside the CSS file, to the correct line)
Ctrl + Click on a function call to go to the definition ...
Ctrl + Click on a function to see everywhere it's used, ex: for chaning position of arguments

"Write any command" plugin that lets you pick any plugin/keycombo (from droplist) when you type in for example "find" shows "find in files", "etc"

Try the editor on OSX.
Compile nodehun for osx

Auto complete ---- or === for ascii underlined headings

PHP scripting with the static site generator: <?php ...php code here... ?>

A communication channel, where a "wrapper" can tell the editor to open a file ... 
In some programs you can define a editor for editing files. Git for example. Make it possible to use jzedit for that!
See jzedit file

"timelog": Puts whatever is on the same line as the cursor into a time log.
dagbok. kan användas för fakturering, time management mm.

Open a console/command-line/shell/ (remote or local) in a new tab (kinda lika a file) and send commands by entering text at EOF (Ctrl+J)

When running a program and it crashes, auto goto that line (get file/line from the stack trace)
When running a program, profile it (trace dumps) and use the logs in the editor to show relations, hot code, types, etc

Hold down key to temporary see things (terminal based editors cant do that)

Remotely run programs (ex sudo apt-get update, chmod 775 somefile.txt chown Z:adm folder/ -R, nodejs myscript.js) get output in the editor.

Pipe to the editor and stream the text.

Samba support, load files etc from samba shares: https://www.npmjs.com/package/smb2

proper touchscreen support. So I can drag my code around.

Gamification/Animations: Animate for example parenthesis/bracket highlightning so they are easier to see and looks cooler.

Web app hot code reloading ... 
problem: when you are debugging something you have to repeat stuff to get into the same state as the bug, you want to go back one step in state, then replay the next step to se if the bug got fixed
solution: retry using the same state, use setScriptSource in chromium debugger to hot swap functions

Smooth scrolling, like in the browser, animated scrolling.

Letter annimation and (happy) popping sound when you type, double kill, megakill etc bonus when you write a lot in one go

real-time collaboration 

Class auto completion in HTML documents. Get the class list from the CSS files.

Version control manager: select: git|mercurila (auto detect)
this file: commit msg: Commit, push, pull (special color), Move, Add/remove, select: branch, merge updates from branch  
title tags for explanations
* Built in colaboration tool (git/mercurial). Everytime you save, it checks if a .hg or .git folder exists, then prompts for a commit, with "commit" and "commit and push" button
* Auto pull often, check for uncommited changes.
* Make tool to handle merge conflic


HTML helper, shadowing in attributes. ex: <form ... show: action, method
<wanderman> is there any plugin for atom that ,help learning html ? like poping up usage of attributes of elements

Cancel or resume subscription from within the editor

Node-JS app one click deployment. Upload and restart from the editor. Debug app in production from the editor.

Git integration: stage for commit, commit, push 

When pasting in a if or for statement without matching curly-brackets, insert the missing bracket if the global matched brackets is ok.

Reopen/refresh file from disk.

Mercurial integration: Mark lines that have changed since last commit (green bar in the left margin!?)


Reopen last closed file (from this session)

Show red circles where the parser detects a syntax error!? Like unfinished quote or regexp

how a fat red circle around variables that are not defined anywhere!?

shift button to move without moving the cursor.

deploy, start/stop and debug nodeJS in the editor

Nightmode/eye rest. High contrast makes the eys work hard! Make a "night mode" for those long coding nights.

Feature to go to the creation/defenition a the function you are calling, then a shortcut to go back to where you was, even if it was in another file!

When copying in something like "editor.addMenuItem("Copy file path", function copyFilePath() {" the editor should also add }); if there is a global {} missmatch.


Quickly reload a single file from disk.

Mercurial plugin. Automatic remote repository creation. 
How to init an already existing repo with a emty remote repo
cd to/dir
hg init
hg add **
hg ci -m "first commit"
echo [paths] > .hg/hgrc
echo default = http://webtigerteam.com/repo/foo1 >> .hg/hgrc
hg push

File-watcher: After tabbing between the program and other program, check if the files have changed, using hash?

Parser for nginx config files.

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

File cloning/file views: Have the same file open in two tabs, but with different file positions, caret, selections and highlights

Go to defenition: Ctrl click on a function name to cline the file in another tab and scroll down to that function.


JavaScript: Warn when a new line starts with with (, [, /, +, ++, or -- 

Open file on SSH!

Profile idea: The editor will come with everyones profile: keyBindings, plugins, theme
It should be easy to quickly get your own custom settings when installing the program on a new machine.
Maybe give each user their own mercurial repository!?

---

Multiple cursors! Ctrl+Shift + up/down, or Ctrl+Shift + mouse click creates another cursors. 
Useful when you want to format stuff that look the same, ex. if you want to make many var's into one long line var
var foo=1, ... place bar and baz here
var bar = 2;
var baz = 3;

Ctrl-F <search query> SelectAll <edit with multiple cursors>

Select a multiple lines of an object/hash/dict, break into multiple cursors, rewrite line (copying and pasting as needed, it works that out as well) to change to variable declarations, or to add a comma, or to... whatever.

---

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

Code drag and drop, drag and drop selected text.

When renaming a html tag, also rename the sibmling. <pre|<--renaming> lalala </pre><-- also rename this

Support screen readers. It should be possible to use the editor with eyes closed.

Spellcheck single word. For when the spell-checker is disabled.

Peek definition. when you want to peek a few lines of a method or type

auto-completes based on other words in open windows (or other files in the open project).

Self hosted cloud editor. Work in the browser.

Built in SQL query, with GUI for editing tables

SQL auto completion: SELECT foo FROM table WHERE bar = ? (lookup mysql schema)

Need though
-----------

hmm ... Should all files be opened as streams!? ReadableStream 

Give string variables and number variables different colors ? green (like "string") for string variables and blue for numbers.

Put a weight ? on variables depending on scope? Like larger size for each level down in the scope.

Switch SCM from Mercurial to Git because hg lost file changes!?

Moving back to browser for a while, just to fix compatiblity issues. Then move back to nw.js. To make sure it works in the browser too.
http-server .
Spellchecker can be run as a service.


About trying other runtimes, like native rendering. We should stick with "browser" because getting something to render natively, like openGL is too damn complicated.

How should updating work!? Stable branch=double work!?



Common JS errors
================

Forgot to close lamda function. Ex:

functionCall(function callback() {

} <!-- forgot parenthesis here






