Making a server plugin
======================

Edit server/user_worker.js and under "Server plugin API's" add your API. Example:
API.myPlugin = require("./plugin/myPlugin/myPluginMain.js");

