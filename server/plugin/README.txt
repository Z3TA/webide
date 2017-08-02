Making a server plugin
======================

Each server plugin needs to have it's own node_modules folder and package.json, and ship with all it's dependencies!

If it's a module without any dependencies and only have one file, place the .js file directly in server/plugin/ folder.
If it has dependencies or comanion files, make a new folder inside server/plugin/ with the name of the plugin.

Edit server/user_worker.js and under "Server plugin API's" add your API. Example:
API.myPlugin = require("./plugin/myPlugin/myPluginMain.js");




