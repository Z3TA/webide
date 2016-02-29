
Guidelines for writing a plugin/extension or new feature
========================================================

If you add a new feature to the editor, you should make it into a plugin: a .js file in the plugin directory.

Run the editor in devMode: Ctrl + D. Or "global.settings.devMode = true" in settings_overload.js

Keep your plugin completely separated/standalone from the other plugins.
Only complex/intervene with the core files (editor.js or File.js).

Make a new folder if your plugin uses many files.

Use console.error(new Error("custom error")) to display friendly error messages. (See devmode.js)



Naming files
------------
All file names should be in small caps! (to avoid modules made in non-case-sensitive environment stops working in case-sensitive environments).
Name files using _ instead of white spaces or camelCasing.



Initiation / starting point
---------------------------
Initiate your plugin using editor.on("start", nameOfTheCallbackFunction)

The name of the callback function should be descriptive to ease debugging.
You can also make the function start after another function by passing a number (order) 
as a third argument to editor.on("start", nameOfTheCallbackFunction, order);


CSS / stylesheet
----------------
Insert your CSS code in gfx/style.css. It will easier to do themes if all CSS is located at the same place.
Use /* ## My section */ to make it easier to find (using the zoom plugin, Alt+Z).


Debugging
---------
Consider using the built in debugger instead of console.log's for debugging!

Once the plugin is finished and all bugs have bean ironed out, leave the (important) console.log's, unless they severely affect performance.

If you "brick" the editor, open up package.json in another editor. 
Change view: true and toolbar: true, kill all running nw executable's and restart the editor.
Then you can open the Chromium debugger and see what's wrong.



Putting stuff in the left column
--------------------------------
If you want scroll:auto, create a div with class "wrap". All "wrap" objects will be resized by editor.resize()



Key binding
-----------
global.keyBindings.push({charCode: charCode, combo: CTRL, fun: functionToRun});

See editor.js: function keyIsDown

Note: Function bound to keys need to return true or false! When returning false, the default (chromium) behavior is prevented.


Performance tips
----------------
It's important that your plugin doesn't make the editor slower. But "optimization is the root of all evil"!
Test how fast your code run:
console.time("nameOfTimer");
console.timeEnd("nameOfTimer");

Then set: global.settings.devMode = false;

Open up the debugger (Ctrl+D, two times) to see the console messages.

Easy improvements:
* Functions: 20% overhead, inline them!
* Declaring with let or const: 50% overhead, use var instead!
* Loops: Avoid them

* Child processes: There is a huge overhead cost, but it can be worth it if all other optimizations fail. See spellchecker for examples.

* Render early & hide lag: When the user hits a button, it shouldn't take more then a millisecond before they can see a result.


Making a parser
---------------

deprecated!

After parsing the file, call file.haveParsed(data).
The data object should have this standard:
  
.functions = {name: String, lineNumber: Number, arguments: String, subFunctions: [...]}







  