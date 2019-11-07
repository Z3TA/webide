
var rpc = require("vscode-jsonrpc");

var languageServers = {};

var LSP = {

	start: function(user, json, callback) {
		// Spawn a new language server
		
		var lang = json.language;
		var binary = "node";
		
		if(language == "JavaScript") {
			//var args = ["./flow/node_modules/flow-bin/cli.js", "lsp"];
			var args = ["./javascript-typescript-langserver/lib/language-server-stdio.js"];
		}
		else {
			return callback(new Error("A language server do not exist for language=" + language))
		}
		
		var childProcess = cp.spawn(binary, args);
		
		
	}
	
}

module.exports = LSP;


