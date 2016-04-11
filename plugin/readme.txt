
Guidelines for writing a plugin/extension or new feature
========================================================

If you add a new feature to the editor, you should make it into a plugin: A .js file in the plugin directory.

Run the editor in devMode: Ctrl + D. Or add "editor.settings.devMode = true" in settings_overload.js

Keep your plugin completely separated/standalone from the other plugins.
Only complex/intervene with the core files (editor.js or File.js).

Make a new folder if your plugin uses many files.

Add automatic tests using editor.tests.push({text:"description": fun: function yourTestFunction() {}});
And write "bug traps" like: if(foo != bar) console.error(new Error("Expected foo=" + foo + " to equal bar=" + bar)); 

Do manual testing and run the automatic tests:  Ctrl+Shift+T

Give name to your functions, even the anonymous ones! Some times the function name will be the only clue when tracking bugs and performance issues.


Naming files
------------
All file names should be in small caps! (to avoid plugins made in non-case-sensitive environment stops working in case-sensitive environments).
Name Files using _ instead of white spaces or camelCasing.



Initiation / starting point
---------------------------
Initiate your plugin using editor.on("start", nameOfTheCallbackFunction)

The name of the callback function should be descriptive to ease debugging.
You can also make the function start after another function by passing a number (order) 
as a third argument to editor.on("start", nameOfTheCallbackFunction, order);


CSS / stylesheet
----------------
Insert your CSS code in gfx/style.css. It will easier to do themes if all CSS is located at the same place.
Use /* ## My section */ to make it easier to find (using the zoom plugin: Alt+Z).


Debugging
---------
Consider using the built in debugger instead of console.log's for debugging!

Once the plugin is finished and all bugs have bean ironed out, leave the (important) console.log's, unless they severely affect performance.

If the editor doesn't start:
1. Open up package.json in another editor
2. Change view: true and toolbar: true
3. Kill all running nw executable's and restart the editor.
Then you can open the Chromium debugger and see what's wrong.



Putting stuff in the left column
--------------------------------
If you want scroll:auto, create a div with class "wrap". All "wrap" objects will be resized by editor.resize()



Key binding
-----------
editor.keyBindings.push({charCode: charCode, combo: CTRL + SHIFT + ALT, fun: functionToRun});

See editor.js: function keyIsDown

Note: Function bound to keys need to return true or false! When returning false, the default (chromium) behavior is prevented.

CTRL,SHIFT,ALT is global flags (see global.js)


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

* Child processes: There is a huge overhead cost, but it can be worth it if all other optimizations fail. See spellchecker for examples.

* Render early & hide lag: When the user hits a button, it shouldn't take more then a millisecond before they can see a result.


Making a parser
---------------

...



Common problems
---------------

Problem: The program seems totally "bricked". Not even the HTML loads.
Solution: This happens if there's a loop somewhere, check the code you last entered.



  