
Guide for writing plug-in
=========================

All file names should be in small caps! (to avoid modules made in non-case-sensitive enviroment stops workin in case-sensetive enviroments).

Leave console.log's unless they severley affect performance. They will only show if global.settings.devMode is set to true.

Don't be tempted to write spaghetti code ... Everything that has to do with one plug-in, 
should be located in that plug-in. Don't edit other plug-ins while adding functionality to another.
If you still feel the need to do so, you might want to move some of the functionality to the editor 
itself (editor.js), so that the plug-ins can be unique.


Add an event to window.addEventListener for initiating your plug-in:
  window.addEventListener("load", my_plugin, false);

or: editor.on("start", myInitFunction);

The name of the init/main function should be describtive to ease debugging.
You can also make the function start after another function!

By passing a number (order) as a third argument to editor.on("start", myInitFunction, order);



Use console.error(new Error("")) instead of throwing errors. And use console.warn() for warnings and console.log() for
debug or general info. This way, those functions can be overloaded for development or distribution.

By using console.error, you can actually choose what the editor should do when there is an error!
See plug-in: devmode.js

console.error(new Error("custom error"));





Putting stuff in the left column:

If you want scroll:auto, create a div with class "wrap". All "wrap" objects will be resized by editor.resize()



Making a parser
---------------

depricated!

After parsing the file, call file.haveParsed(data).
The data object should have this standard:
  
.functions = {name: String, lineNumber: Number, arguments: String, subFunctions: [...]}


Know issues
-----------

Crisp font rendering: Linux has grayscale antialias in the Canvas, instead of sub-pixel (LCD text) antialias.


  