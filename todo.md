

Prioritize: bug fixing, then some polishing and maybe some optimization.
Don't implement new stuff until we have a stable release!


Currently working on: sub-pixel-rendering (it doesn't work on Linux!) See plugin/render_sub_pixel_precision.js and subpixel2.htm



BUGS
====

sub-pixel-rendering (it doesn't work on Linux!)

Opening files with inconsistent line breaks.

Opening another file shewed the div's so that preview dropped down and canvas halved. When!???

Can't insert ALT+ keyboard characters. 

Do not include {} or : when double clicking a word!

Auto-complete inside a function-name seems to auto-complete itself!
function foo..

---
Colors are off after pasting:
console.error = function(err) {

alert(err);
console.log(err.stack);
throw err;

// It's really not safe to continue from here!


}
---
---
File marked as not saved when reloading.
Sometimes file doesn't save!? (if you reload quickly after Ctrl+S)
Unsupported! combo: {"shift":false,"alt":false,"ctrl":true,"sum":2} character:

File not saving because spell-check is running and eventually returning an error!
Uncaught TypeError: Cannot read property 'decoration' of undefined spellcheck_nodehun.js:385 colorGrid spellcheck_nodehun.js:373 doSomething
---
Abort the spell-checker if something is deleted or if the whole grid changes to ^
You get weird errors while the spell-checker is running, you can for example not save files.


Doesn't remember last size and position when started

Doesn't load fonts right away


Weird indent after:
var firstLocation = {
x: global.settings.leftMargin + (col + buffer[row].indentation * global.settings.tabSpace) * global.settings.gridWidth,
y: global.settings.topMargin + row * global.settings.gridHeight
}// HAHA! I had forgot semicolon here!!

What to do about this in the future!?

console.log("firstP=" + firstP + " on row=" + row);


var secondLocation = {
x: global.settings.leftMargin + (col + buffer[row].indentation * global.settings.tabSpace) * global.settings.gridWidth,
y: global.settings.topMargin + row * global.settings.gridHeight
}

}




mouse_select.js:213 Uncaught TypeError: Cannot read property 'index' of undefined

Dont auto insert '' when typing in a comment (just like when typing ' inside an "string") ex: Can't ship's chimp's


Sometimes contine selecting stuff even if mouse up.
ex: when hitting delete.

Easier to scroll right on a long line! bug? Using the preview window


Save history when moving the cursor.


functionlist.js:163 Uncaught SyntaxError: Invalid regular expression: /'(/: Unterminated group



When copying code, also indent the first line, even if the selection started in the middle of it
and remove all indention before base. ex:
foo
bar
bar {
bar
}
bar





Page is black (no render) after opening from Ctrl+O clicking a path
Also go to the line we are searching for after opening!

Error: Tried to insert a tab character
at File.putCharacter (File.js:644)
at keyPressed (editor.js:1494)
(when Ctrl+shift+I)


Ctrl+Tab when a name of a function is selected, will insert () after the function-name.
(warn/error when a key-combo does many things!!!?)


Coloring gets weird when adding more lines above


Polishing
=========
Context menu (right click) doesn't disappear when saving As
Auto complete file names when editing href or src 
Auto complete markdown lines ---- and ==== to fit (same length) as text above.
Add words like href, src, etc to the spell-checker ignore.

Don't insert double ' inside comments


Show big fat warning if = inside if( a = b) instead of ==, always a bug!
Also warn when  you use == outside an if!?

Indent inside if's
if(word.length > 0 && 
				htmlTags.indexOf(word) == -1 && 
				jsKeywords.indexOf(word) == -1 && 
				!isNumeric(word) &&
				fileExtensions.indexOf(word) == -1) {



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



Unable to repeat bugs (happens rarely)
---------------------------------------
Black screen when opening file

Ctrl+X not working


Feature
-------

Drag and drop files into the editor.



