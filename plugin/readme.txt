
Guidelines for writing a plugin/extension or new feature
========================================================

If you add a new feature to the editor, you should make it into a plugin ...

Make a .js file in the plugin directory. Or a new folder if you need many files or node modules.

Encapsulate your plugin into a self calling function to avoid littering the global scope: (function() { ... })();


Run the editor in devMode: Ctrl + D. Or add "editor.settings.devMode = true" in settings_overload.js

Keep your plugin completely separated/standalone from the other plugins!
Only complex/intervene with the core files (editor.js or File.js).

Do not modify file.text directly. Instead add an abstraction layer method to File.js witch properly call file event listeners.
Also feel free to add new methods and functions in editor.js and global.js


Testing
-------
Add automatic tests using: editor.addTest(function nameOfYourTest(callback) { .... })
Your test function should trow errors, or call the callback function with argument false, or true if the test succeeded.

Place the test file(s) in the tests/ folder. (they will be loaded automatically)

Encapsulate your test code into a self calling function to avoid littering the global scope: (function() { ... })();

Tips: Write "bug traps" and sanity checks like: if(foo != bar) throw new Error("Expected foo=" + foo + " to equal bar=" + bar); 

Do manual testing and run the automatic tests:  Ctrl+Shift+T



Naming files
------------
All file names should be in small caps! (to avoid plugins made in non-case-sensitive environment stops working in case-sensitive environments).
Name files using _ (underscore, instead of white spaces or camelCasing).



Initiation / starting point
---------------------------
A plugin that is just a key binding:
editor.bindKey({desc: "Show all keyBindings", fun: function showKeyBindings() { ... }});

While more advanced plugins should call:
editor.plugin({desc: "Open up the files from last session", order: 999, load: function reopenFiles() { ... }, unload: unloadReopenFiles});

The name of the "fun" function should be descriptive to ease debugging.


CSS / stylesheet
----------------
Insert your CSS code in gfx/style.css. (It will easier to do themes if all CSS is located at the same place.)
Use /* ## My section */ to make it easier to find (tip: use the zoom plugin: Alt+Z for quick navigating).


Debugging
---------
Consider using the built in debugger instead of console.log's for debugging!

Once the plugin is finished and all bugs have bean ironed out, leave the (important) console.log's, unless they severely affect performance.





Putting stuff in the left column
--------------------------------
If you want scroll:auto, create a div with class "wrap". All "wrap" objects will be resized by editor.resize()



Key binding
-----------
editor.keyBindings.push({charCode: charCode, combo: CTRL + SHIFT + ALT, fun: functionToRun});

See editor.js: function keyIsDown

Note: Function bound to keys need to return true or false! When returning false, the default (chromium) behavior is prevented.

CTRL,SHIFT,ALT are global variables (see global.js)





NodeJS modules
--------------
Dependencies need to be installed for io.js v1.2.0
Use npm -v 2.14.12 or node-gyp rebuild --target=1.2.0

package.json contain only the core dependencies. 
Create your own separate node_modules folder with your plugin.

Node modules need to be "pure" JavaScript, without build dependencies (like python or a c++ compiler).
If they need to be compiled, you have to compile for all platforms. See the spellcheck module as an example.

All dependencies should be included in the repository, so users don't have to npm install!



Performance tips
----------------
It's important that your plugin doesn't make the editor slower. But "optimization is the root of all evil"!
Test how fast your code run:
console.time("nameOfTimer");
console.timeEnd("nameOfTimer");

Then set: editor.settings.devMode = false;

Open up the debugger (Ctrl+D, two times) to see the console messages.

Easy improvements:
* Functions: 20% overhead, inline them!
* Declaring with let or const: 50% overhead, use var instead!
* Loops: Avoid them

* Child processes: They have a huge overhead cost, but it can be worth it if all other optimizations fail. See spellchecker for examples.

* Render early and hide lag: When the user hits a button, it shouldn't take more then a millisecond before they can see a result.


Making a parser
---------------

...



Ooops "Bricked" the editor
--------------------------

1. Open up package.json in another editor
2. Change view: true and toolbar: true
3. Kill all running nw executable's and restart the editor.
Then you can open the Chromium debugger and see what's wrong.

Possible errors ...

There is a loop somewhere, ex: while(true) that never breaks:
Check the last changed code.

Trying to load files on the network:
Edit plugin/reopen_files.js and reset the localStorage:
window.localStorage.openedFiles = "";

Error in Windows/OS: Restart the operating system


index.htm, Line 1, Uncaught SyntaxError: Unexpected end of input
possible cause: Somewhere parsing an empty JSON:










  