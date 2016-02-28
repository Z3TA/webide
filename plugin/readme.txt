
Guidelines for writing a plugin/extension
=========================================

Run the editor in devMode: Ctrl + D. Or "global.settings.devMode = true" in settings_overload.js

Keep your plugin compleatly seprated/standalone from the other plugins.
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



Debugging
---------
Consider using the built in debugger instead of console.log's for debugging!

Once the plugin is finished and all bugs have bean ironed out, leave the (important) console.log's, unless they severely affect performance.

If you "brick" the editor, open up package.json in another editor. 
Change view: true and toolbar: true, kill all running nw executables and restart the editor.
Then you can open the Chromium debugger and see what's wrong.



Putting stuff in the left column
--------------------------------
If you want scroll:auto, create a div with class "wrap". All "wrap" objects will be resized by editor.resize()



Key binding
-----------
global.keyBindings.push({charCode: charCode, combo: CTRL, fun: functionToRun});

See editor.js: function keyIsDown

Note: Function bound to keys need to return true or false! When returning false, the default (chromium) behaviour is prevented.



Making a parser
---------------

depricated!

After parsing the file, call file.haveParsed(data).
The data object should have this standard:
  
.functions = {name: String, lineNumber: Number, arguments: String, subFunctions: [...]}







  