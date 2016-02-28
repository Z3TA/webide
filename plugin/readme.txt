
Guide for writing plug-in's
===========================

Run the editor in devMode by keyboard combo: Ctrl + D, or global.settings.devMode = true in settings_overload.js

Naming files
------------
All file names should be in small caps! (to avoid modules made in non-case-sensitive environment stops working in case-sensitive environments).
Name files using _ instead of spaces or camelCasing.

Make a new folder if your plugin uses many files.


Don't complex/intervene with other plugins
------------------------------------------
Everything that has to do with one plug-in, should be located in that plug-in. 

Keep the complexity in the core files (editor.js or File.js). 


Initiation / starting point
---------------------------
Initiate your plugin using editor.on("start", nameOfMyCallbackFunction)

The name of the callback function should be descriptive to ease debugging.
You can also make the function start after another function by passing a number (order) 
as a third argument to editor.on("start", nameOfMyCallbackFunction, order);



Debugging
---------
Consider using the built in debugger instead of console.log's for debugging!

Once finished and all bugs have bean ironed out, leave the (important) console.log's, unless they severely affect performance.
They will only show if global.settings.devMode is set to true.

Use console.error(new Error("")) instead of throwing errors. And use console.warn() for warnings 
and console.log() for debug or general info. This way, those functions can be overloaded for development or distribution.

By using console.error, you can actually choose what the editor should do when there is an error!
See plug-in: devmode.js

console.error(new Error("custom error"));





Putting stuff in the left column
--------------------------------
If you want scroll:auto, create a div with class "wrap". All "wrap" objects will be resized by editor.resize()


Note: Function bound to keys need to return true or false!


Making a parser
---------------

depricated!

After parsing the file, call file.haveParsed(data).
The data object should have this standard:
  
.functions = {name: String, lineNumber: Number, arguments: String, subFunctions: [...]}


Know issues
-----------

Crisp font rendering: Linux has grayscale antialias in the Canvas, instead of sub-pixel (LCD text) antialias.


  